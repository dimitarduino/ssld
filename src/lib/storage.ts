import fs from 'fs';
import path from 'path';
import { CertificateRecord } from './types';

const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
const DATA_DIR = isVercel 
  ? path.join('/tmp', 'ssld-data') 
  : path.join(process.cwd(), 'data');
const CERTS_FILE = path.join(DATA_DIR, 'certificates.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const KEYS_DIR = path.join(DATA_DIR, 'keys');

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
export function getAllUsers(): any[] {
  ensureDirectories();
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getUserByEmail(email: string): any | null {
  const users = getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function saveUser(user: any): void {
  ensureDirectories();
  const users = getAllUsers();
  users.push(user);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function getAllCertificates(userId?: string): CertificateRecord[] {
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

export function getCertificateById(id: string): CertificateRecord | null {
  const certs = getAllCertificates();
  return certs.find((c) => c.id === id) || null;
}

export function saveCertificate(cert: CertificateRecord): void {
  ensureDirectories();
  const certs = getAllCertificates();
  const existingIndex = certs.findIndex((c) => c.id === cert.id);

  if (existingIndex >= 0) {
    certs[existingIndex] = cert;
  } else {
    certs.push(cert);
  }

  fs.writeFileSync(CERTS_FILE, JSON.stringify(certs, null, 2));
}

export function deleteCertificate(id: string): boolean {
  const certs = getAllCertificates();
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

export function saveKeyFile(id: string, keyPem: string): void {
  ensureDirectories();
  const keyFile = path.join(KEYS_DIR, `${id}.key`);
  fs.writeFileSync(keyFile, keyPem);
}

export function getKeyFile(id: string): string | null {
  const keyFile = path.join(KEYS_DIR, `${id}.key`);
  if (!fs.existsSync(keyFile)) return null;
  return fs.readFileSync(keyFile, 'utf-8');
}

export function getStats(userId?: string) {
  const certs = getAllCertificates(userId);
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
