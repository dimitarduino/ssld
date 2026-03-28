export type ChallengeType = 'http-01' | 'dns-01';
export type CertificateStatus = 'pending' | 'processing' | 'active' | 'expired' | 'failed';
export type AcmeEnvironment = 'staging' | 'production';
export type ServerType = 'apache' | 'nginx' | 'other';

export interface CertificateRecord {
  id: string;
  userId: string;
  domains: string[];
  email: string;
  status: CertificateStatus;
  challengeType: ChallengeType;
  environment: AcmeEnvironment;
  serverType: ServerType;
  customCsr?: boolean;
  createdAt: string;
  issuedAt?: string;
  expiresAt?: string;
  certificate?: string;
  privateKey?: string;
  chain?: string;
  challengeInstructions?: ChallengeInstruction[];
  error?: string;
  accountKeyPem?: string;
  orderData?: string;
}

export interface ChallengeInstruction {
  domain: string;
  type: ChallengeType;
  token?: string;
  keyAuthorization?: string;
  dnsRecord?: {
    name: string;
    type: string;
    value: string;
  };
  httpChallenge?: {
    url: string;
    path: string;
    content: string;
  };
}

export interface GenerateCertificateRequest {
  domains: string[];
  email: string;
  challengeType: ChallengeType;
  environment: AcmeEnvironment;
  serverType: ServerType;
  customCsr?: string;
}

export interface CertificateListResponse {
  certificates: CertificateRecord[];
  total: number;
}

/**
 * Server-specific download file info
 */
export interface DownloadFileInfo {
  label: string;
  filename: string;
  description: string;
  queryParam: string;
}

export const SERVER_DOWNLOAD_FILES: Record<ServerType, DownloadFileInfo[]> = {
  apache: [
    { label: 'Certificate', filename: 'certificate.cert', description: '.cert — Server certificate', queryParam: 'cert' },
    { label: 'CA Bundle', filename: 'ca-bundle.bundle', description: '.bundle — Intermediate chain', queryParam: 'bundle' },
    { label: 'Private Key', filename: 'private.key', description: '.key — Private key', queryParam: 'key' },
  ],
  nginx: [
    { label: 'Full Chain', filename: 'fullchain.crt', description: '.crt — Cert + chain combined', queryParam: 'fullchain' },
    { label: 'Private Key', filename: 'private.key', description: '.key — Private key', queryParam: 'key' },
  ],
  other: [
    { label: 'Certificate', filename: 'certificate.pem', description: '.pem — Server certificate', queryParam: 'cert' },
    { label: 'Full Chain', filename: 'fullchain.pem', description: '.pem — Cert + intermediates', queryParam: 'fullchain' },
    { label: 'CA Bundle', filename: 'ca-bundle.pem', description: '.pem — Intermediate chain only', queryParam: 'bundle' },
    { label: 'Private Key', filename: 'private.key', description: '.key — Private key', queryParam: 'key' },
  ],
};

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token?: string;
}

