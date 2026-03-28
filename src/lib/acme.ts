import acme from 'acme-client';
import { v4 as uuidv4 } from 'uuid';
import {
  CertificateRecord,
  ChallengeInstruction,
  ChallengeType,
  AcmeEnvironment,
  ServerType,
} from './types';
import { saveCertificate, saveKeyFile, getKeyFile } from './storage';

function getDirectoryUrl(env: AcmeEnvironment): string {
  return env === 'production'
    ? acme.directory.letsencrypt.production
    : acme.directory.letsencrypt.staging;
}

/**
 * Split a PEM certificate chain into individual certificates
 */
export function splitCertChain(fullChain: string): { cert: string; bundle: string } {
  const certs = fullChain
    .split(/(?=-----BEGIN CERTIFICATE-----)/)
    .filter((c) => c.trim().length > 0);

  const cert = certs[0]?.trim() || '';
  const bundle = certs.slice(1).join('\n').trim();

  return { cert, bundle };
}

export async function initiateOrder(
  userId: string,
  domains: string[],
  email: string,
  challengeType: ChallengeType,
  environment: AcmeEnvironment,
  serverType: ServerType,
  customCsrPem?: string
): Promise<CertificateRecord> {
  const id = uuidv4();
  const isCustomCsr = !!customCsrPem;

  // Generate account key
  const accountKey = await acme.crypto.createPrivateRsaKey();
  const accountKeyPem = accountKey.toString();

  // Create ACME client
  const client = new acme.Client({
    directoryUrl: getDirectoryUrl(environment),
    accountKey: accountKeyPem,
  });

  // Create account
  await client.createAccount({
    termsOfServiceAgreed: true,
    contact: [`mailto:${email}`],
  });

  // Handle CSR — either use custom or auto-generate
  let csrBuffer: Buffer;

  if (isCustomCsr) {
    // Use the user-provided CSR
    csrBuffer = Buffer.from(customCsrPem);
  } else {
    // Auto-generate CSR and private key
    const [certKey, csr] = await acme.crypto.createCsr({
      altNames: domains,
    });

    const certKeyPem = certKey.toString();
    // Save the auto-generated private key
    saveKeyFile(id, certKeyPem);

    csrBuffer = csr;
  }

  // Create order
  const order = await client.createOrder({
    identifiers: domains.map((d) => ({ type: 'dns' as const, value: d })),
  });

  // Get authorizations
  const authorizations = await client.getAuthorizations(order);

  const challengeInstructions: ChallengeInstruction[] = [];

  for (const authz of authorizations) {
    const domain = authz.identifier.value;

    // Find the requested challenge type
    const challenge = authz.challenges.find(
      (ch: { type: string }) => ch.type === challengeType
    );

    if (!challenge) {
      throw new Error(
        `Challenge type ${challengeType} not available for domain ${domain}`
      );
    }

    const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

    const instruction: ChallengeInstruction = {
      domain,
      type: challengeType,
      token: challenge.token,
      keyAuthorization,
    };

    if (challengeType === 'http-01') {
      instruction.httpChallenge = {
        url: `http://${domain}/.well-known/acme-challenge/${challenge.token}`,
        path: `/.well-known/acme-challenge/${challenge.token}`,
        content: keyAuthorization,
      };
    } else if (challengeType === 'dns-01') {
      instruction.dnsRecord = {
        name: `_acme-challenge.${domain}`,
        type: 'TXT',
        value: keyAuthorization,
      };
    }

    challengeInstructions.push(instruction);
  }

  // Store the full order object + CSR for later verification
  const orderData = JSON.stringify({
    ...order,
    _csrPem: csrBuffer.toString(),
  });

  const record: CertificateRecord = {
    id,
    userId,
    domains,
    email,
    status: 'pending',
    challengeType,
    environment,
    serverType,
    customCsr: isCustomCsr,
    createdAt: new Date().toISOString(),
    challengeInstructions,
    accountKeyPem,
    orderData,
  };

  saveCertificate(record);

  // Remove sensitive data from response
  const response = { ...record };
  delete response.accountKeyPem;

  return response;
}

export async function verifyChallengeAndFinalize(
  record: CertificateRecord
): Promise<CertificateRecord> {
  if (!record.accountKeyPem || !record.orderData) {
    throw new Error('Missing account key or order data');
  }

  // Recreate client
  const client = new acme.Client({
    directoryUrl: getDirectoryUrl(record.environment),
    accountKey: record.accountKeyPem,
  });

  // Recreate account (finds existing)
  await client.createAccount({
    termsOfServiceAgreed: true,
    contact: [`mailto:${record.email}`],
  });

  // Restore the order and CSR from stored data
  const storedData = JSON.parse(record.orderData);
  const csrPem = storedData._csrPem;
  delete storedData._csrPem;

  const order = await client.getOrder(storedData);

  // Get authorizations
  const authorizations = await client.getAuthorizations(order);

  // Check if the order itself is still valid
  if (order.status === 'invalid') {
    record.status = 'failed';
    record.error = 'The ACME order has become invalid (it may have expired or a previous verification attempt failed). Please generate a new certificate.';
    saveCertificate(record);
    throw new Error(record.error);
  }

  // Complete each challenge
  for (const authz of authorizations) {
    // Already validated — skip
    if (authz.status === 'valid') continue;

    // Authorization is no longer pending — can't complete it
    if (authz.status === 'invalid' || authz.status === 'deactivated' || authz.status === 'expired' || authz.status === 'revoked') {
      record.status = 'failed';
      record.error = `Domain validation for "${authz.identifier.value}" is no longer pending (status: ${authz.status}). This usually happens when a previous verification attempt failed or the order expired. Please delete this certificate and generate a new one.`;
      saveCertificate(record);
      throw new Error(record.error);
    }

    const challenge = authz.challenges.find(
      (ch: { type: string }) => ch.type === record.challengeType
    );

    if (!challenge) {
      throw new Error(
        `Challenge type ${record.challengeType} not found for ${authz.identifier.value}`
      );
    }

    // Check challenge status before attempting completion
    if (challenge.status === 'valid') continue;

    if (challenge.status !== 'pending') {
      record.status = 'failed';
      record.error = `Challenge for "${authz.identifier.value}" is no longer pending (status: ${challenge.status}). A previous verification attempt may have failed. Please delete this certificate and generate a new one.`;
      saveCertificate(record);
      throw new Error(record.error);
    }

    try {
      await client.completeChallenge(challenge);
      await client.waitForValidStatus(challenge);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      record.status = 'failed';
      record.error = `Challenge verification failed for "${authz.identifier.value}": ${msg}. Make sure your domain challenge is correctly set up, then delete this certificate and generate a new one.`;
      saveCertificate(record);
      throw new Error(record.error);
    }
  }

  // Use the stored CSR for finalization
  const csrBuffer = Buffer.from(csrPem);

  // Finalize the order
  await client.finalizeOrder(order, csrBuffer);

  // Get the certificate
  const certificate = await client.getCertificate(order);

  // Parse certificate to get expiry date
  let expiresAt: string | undefined;
  try {
    const issuedDate = new Date();
    const expireDate = new Date(issuedDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    expiresAt = expireDate.toISOString();
  } catch {
    // Fallback
  }

  // Update record
  record.status = 'active';
  record.certificate = certificate;
  record.issuedAt = new Date().toISOString();
  record.expiresAt = expiresAt;
  record.challengeInstructions = undefined;

  saveCertificate(record);

  // Return without sensitive data
  const response = { ...record };
  delete response.accountKeyPem;

  return response;
}
