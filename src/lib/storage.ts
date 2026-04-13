import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { CertificateRecord, User } from './types';

const DATA_DIR = process.env.SSLRENEW_DATA_DIR
  ? path.resolve(process.env.SSLRENEW_DATA_DIR)
  : path.join(process.cwd(), 'data');
const CERTS_FILE = path.join(DATA_DIR, 'certificates.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const KEYS_DIR = path.join(DATA_DIR, 'keys');
const DATABASE_URL = process.env.DATABASE_URL;
const usingNeon = Boolean(DATABASE_URL);

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
let schemaReady = false;

async function ensureNeonSchema() {
  if (!usingNeon || !sql || schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      domains JSONB NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL,
      challenge_type TEXT NOT NULL,
      environment TEXT NOT NULL,
      server_type TEXT NOT NULL,
      custom_csr BOOLEAN DEFAULT FALSE,
      created_at TEXT NOT NULL,
      issued_at TEXT,
      expires_at TEXT,
      certificate TEXT,
      private_key TEXT,
      chain TEXT,
      challenge_instructions JSONB,
      error TEXT,
      account_key_pem TEXT,
      order_data TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS certificate_keys (
      certificate_id TEXT PRIMARY KEY,
      key_pem TEXT NOT NULL
    )
  `;
  schemaReady = true;
}

function mapCertificateRow(row: Record<string, unknown>): CertificateRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    domains: (row.domains as string[]) || [],
    email: String(row.email),
    status: row.status as CertificateRecord['status'],
    challengeType: row.challenge_type as CertificateRecord['challengeType'],
    environment: row.environment as CertificateRecord['environment'],
    serverType: row.server_type as CertificateRecord['serverType'],
    customCsr: Boolean(row.custom_csr),
    createdAt: String(row.created_at),
    issuedAt: row.issued_at ? String(row.issued_at) : undefined,
    expiresAt: row.expires_at ? String(row.expires_at) : undefined,
    certificate: row.certificate ? String(row.certificate) : undefined,
    privateKey: row.private_key ? String(row.private_key) : undefined,
    chain: row.chain ? String(row.chain) : undefined,
    challengeInstructions: (row.challenge_instructions as CertificateRecord['challengeInstructions']) || undefined,
    error: row.error ? String(row.error) : undefined,
    accountKeyPem: row.account_key_pem ? String(row.account_key_pem) : undefined,
    orderData: row.order_data ? String(row.order_data) : undefined,
  };
}

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }
  if (!fs.existsSync(CERTS_FILE)) {
    fs.writeFileSync(CERTS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
}

// User Helpers
export async function getAllUsers(): Promise<User[]> {
  if (usingNeon && sql) {
    await ensureNeonSchema();
    const rows = await sql`SELECT id, name, email, password, created_at FROM users ORDER BY created_at DESC`;
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      password: row.password ? String(row.password) : undefined,
      createdAt: String(row.created_at),
    }));
  }

  ensureDirectories();
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data) as User[];
  } catch {
    return [];
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (usingNeon && sql) {
    await ensureNeonSchema();
    const rows = await sql`
      SELECT id, name, email, password, created_at
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;
    if (!rows[0]) return null;
    return {
      id: String(rows[0].id),
      name: String(rows[0].name),
      email: String(rows[0].email),
      password: rows[0].password ? String(rows[0].password) : undefined,
      createdAt: String(rows[0].created_at),
    };
  }

  const users = await getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function saveUser(user: User): Promise<void> {
  if (usingNeon && sql) {
    await ensureNeonSchema();
    await sql`
      INSERT INTO users (id, name, email, password, created_at)
      VALUES (${user.id}, ${user.name}, ${user.email}, ${user.password || null}, ${user.createdAt})
    `;
    return;
  }

  ensureDirectories();
  const users = await getAllUsers();
  users.push(user);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function getAllCertificates(userId?: string): Promise<CertificateRecord[]> {
  if (usingNeon && sql) {
    await ensureNeonSchema();
    const rows = userId
      ? await sql`
          SELECT * FROM certificates
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `
      : await sql`SELECT * FROM certificates ORDER BY created_at DESC`;
    return rows.map(mapCertificateRow);
  }

  ensureDirectories();
  try {
    const data = fs.readFileSync(CERTS_FILE, 'utf-8');
    const all = JSON.parse(data) as CertificateRecord[];
    if (userId) {
      return all.filter(c => c.userId === userId);
    }
    return all;
  } catch {
    return [];
  }
}

export async function getCertificateById(id: string): Promise<CertificateRecord | null> {
  if (usingNeon && sql) {
    await ensureNeonSchema();
    const rows = await sql`SELECT * FROM certificates WHERE id = ${id} LIMIT 1`;
    return rows[0] ? mapCertificateRow(rows[0]) : null;
  }

  const certs = await getAllCertificates();
  return certs.find((c) => c.id === id) || null;
}

export async function saveCertificate(cert: CertificateRecord): Promise<void> {
  if (usingNeon && sql) {
    await ensureNeonSchema();
    await sql`
      INSERT INTO certificates (
        id, user_id, domains, email, status, challenge_type, environment, server_type,
        custom_csr, created_at, issued_at, expires_at, certificate, private_key, chain,
        challenge_instructions, error, account_key_pem, order_data
      )
      VALUES (
        ${cert.id}, ${cert.userId}, ${JSON.stringify(cert.domains)}::jsonb, ${cert.email}, ${cert.status},
        ${cert.challengeType}, ${cert.environment}, ${cert.serverType}, ${cert.customCsr || false},
        ${cert.createdAt}, ${cert.issuedAt || null}, ${cert.expiresAt || null}, ${cert.certificate || null},
        ${cert.privateKey || null}, ${cert.chain || null},
        ${cert.challengeInstructions ? JSON.stringify(cert.challengeInstructions) : null}::jsonb,
        ${cert.error || null}, ${cert.accountKeyPem || null}, ${cert.orderData || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        domains = EXCLUDED.domains,
        email = EXCLUDED.email,
        status = EXCLUDED.status,
        challenge_type = EXCLUDED.challenge_type,
        environment = EXCLUDED.environment,
        server_type = EXCLUDED.server_type,
        custom_csr = EXCLUDED.custom_csr,
        created_at = EXCLUDED.created_at,
        issued_at = EXCLUDED.issued_at,
        expires_at = EXCLUDED.expires_at,
        certificate = EXCLUDED.certificate,
        private_key = EXCLUDED.private_key,
        chain = EXCLUDED.chain,
        challenge_instructions = EXCLUDED.challenge_instructions,
        error = EXCLUDED.error,
        account_key_pem = EXCLUDED.account_key_pem,
        order_data = EXCLUDED.order_data
    `;
    return;
  }

  ensureDirectories();
  const certs = await getAllCertificates();
  const existingIndex = certs.findIndex((c) => c.id === cert.id);

  if (existingIndex >= 0) {
    certs[existingIndex] = cert;
  } else {
    certs.push(cert);
  }

  fs.writeFileSync(CERTS_FILE, JSON.stringify(certs, null, 2));
}

export async function deleteCertificate(id: string): Promise<boolean> {
  if (usingNeon && sql) {
    await ensureNeonSchema();
    const result = await sql`DELETE FROM certificates WHERE id = ${id}`;
    await sql`DELETE FROM certificate_keys WHERE certificate_id = ${id}`;
    return result.length > 0;
  }

  const certs = await getAllCertificates();
  const filtered = certs.filter((c) => c.id !== id);

  if (filtered.length === certs.length) return false;

  fs.writeFileSync(CERTS_FILE, JSON.stringify(filtered, null, 2));

  // Clean up key files
  const keyFile = path.join(KEYS_DIR, `${id}.key`);
  if (fs.existsSync(keyFile)) {
    fs.unlinkSync(keyFile);
  }

  return true;
}

export async function saveKeyFile(id: string, keyPem: string): Promise<void> {
  if (usingNeon && sql) {
    await ensureNeonSchema();
    await sql`
      INSERT INTO certificate_keys (certificate_id, key_pem)
      VALUES (${id}, ${keyPem})
      ON CONFLICT (certificate_id) DO UPDATE SET key_pem = EXCLUDED.key_pem
    `;
    return;
  }

  ensureDirectories();
  const keyFile = path.join(KEYS_DIR, `${id}.key`);
  fs.writeFileSync(keyFile, keyPem);
}

export async function getKeyFile(id: string): Promise<string | null> {
  if (usingNeon && sql) {
    await ensureNeonSchema();
    const rows = await sql`
      SELECT key_pem FROM certificate_keys WHERE certificate_id = ${id} LIMIT 1
    `;
    return rows[0]?.key_pem ? String(rows[0].key_pem) : null;
  }

  const keyFile = path.join(KEYS_DIR, `${id}.key`);
  if (!fs.existsSync(keyFile)) return null;
  return fs.readFileSync(keyFile, 'utf-8');
}

export async function getStats(userId?: string) {
  const certs = await getAllCertificates(userId);
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    total: certs.length,
    active: certs.filter((c) => c.status === 'active').length,
    pending: certs.filter((c) => c.status === 'pending' || c.status === 'processing').length,
    expiringSoon: certs.filter((c) => {
      if (!c.expiresAt || c.status !== 'active') return false;
      return new Date(c.expiresAt) <= thirtyDaysFromNow;
    }).length,
    failed: certs.filter((c) => c.status === 'failed').length,
  };
}
