'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { CertificateRecord, ServerType } from '@/lib/types';
import { SERVER_DOWNLOAD_FILES } from '@/lib/types';
import {
  HiOutlineGlobeAlt,
  HiOutlineCalendar,
  HiOutlineEnvelope,
  HiOutlineShieldCheck,
  HiOutlineArrowLeft,
  HiOutlineDocumentArrowDown,
  HiOutlineClipboardDocument,
  HiOutlineArrowPath,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineKey,
  HiOutlineDocumentText,
  HiOutlineLink,
  HiOutlineServerStack,
  HiOutlineArchiveBox,
} from 'react-icons/hi2';

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [cert, setCert] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchCert = useCallback(async () => {
    try {
      const res = await fetch(`/api/certificates/${params.id}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Certificate not found');
      const data = await res.json();
      setCert(data);
    } catch {
      setError('Certificate not found');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchCert();
  }, [fetchCert]);

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/certificates/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cert?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setCert(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
      // Refetch cert to get updated status (backend may have marked it as failed)
      await fetchCert();
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await fetch(`/api/certificates/${cert?.id}`, { method: 'DELETE' });
      router.push('/certificates');
    } catch {
      setDeleting(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-overlay">
          <div className="spinner spinner-lg" />
          <p className="loading-text">Loading certificate details...</p>
        </div>
      </div>
    );
  }

  if (error && !cert) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h2 className="empty-state-title">Certificate Not Found</h2>
          <p className="empty-state-desc">{error}</p>
          <Link href="/certificates" className="btn btn-primary">
            <HiOutlineArrowLeft />
            Back to Certificates
          </Link>
        </div>
      </div>
    );
  }

  if (!cert) return null;

  return (
    <div className="container animate-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <Link href="/certificates" className="btn btn-icon btn-secondary" id="back-btn">
          <HiOutlineArrowLeft />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              {cert.domains[0]}
            </h1>
            <StatusBadge status={cert.status} />
          </div>
          {cert.domains.length > 1 && (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              +{cert.domains.length - 1} more domain{cert.domains.length > 2 ? 's' : ''}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {cert.status === 'active' && (
            <Link
              href={`/api/certificates/download/${cert.id}`}
              className="btn btn-primary btn-sm"
              id="download-btn"
            >
              <HiOutlineDocumentArrowDown />
              Download
            </Link>
          )}
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            id="delete-btn"
          >
            <HiOutlineTrash />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 'var(--space-6)' }}>
          <span className="alert-icon"><HiOutlineExclamationTriangle /></span>
          <span>{error}</span>
        </div>
      )}

      {/* Certificate Details Grid */}
      <div className="glass-card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
          Certificate Details
        </h2>
        <div className="cert-detail-grid">
          <div className="cert-detail-item">
            <div className="cert-detail-label">
              <HiOutlineGlobeAlt style={{ display: 'inline', marginRight: '4px' }} />
              Domains
            </div>
            <div className="cert-detail-value">
              {cert.domains.map((d, i) => (
                <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {d}
                </div>
              ))}
            </div>
          </div>
          <div className="cert-detail-item">
            <div className="cert-detail-label">
              <HiOutlineShieldCheck style={{ display: 'inline', marginRight: '4px' }} />
              Challenge Type
            </div>
            <div className="cert-detail-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {cert.challengeType}
            </div>
          </div>
          <div className="cert-detail-item">
            <div className="cert-detail-label">
              <HiOutlineEnvelope style={{ display: 'inline', marginRight: '4px' }} />
              Contact Email
            </div>
            <div className="cert-detail-value">{cert.email}</div>
          </div>
          <div className="cert-detail-item">
            <div className="cert-detail-label">Environment</div>
            <div className="cert-detail-value" style={{ textTransform: 'capitalize' }}>
              {cert.environment}
            </div>
          </div>
          <div className="cert-detail-item">
            <div className="cert-detail-label">
              <HiOutlineServerStack style={{ display: 'inline', marginRight: '4px' }} />
              Server Type
            </div>
            <div className="cert-detail-value" style={{ textTransform: 'capitalize' }}>
              {cert.serverType === 'apache' ? 'Apache / cPanel' : cert.serverType === 'nginx' ? 'Nginx' : 'Other / Generic'}
            </div>
          </div>
          <div className="cert-detail-item">
            <div className="cert-detail-label">CSR</div>
            <div className="cert-detail-value">
              {cert.customCsr ? 'Custom (user-provided)' : 'Auto-generated'}
            </div>
          </div>
          <div className="cert-detail-item">
            <div className="cert-detail-label">
              <HiOutlineCalendar style={{ display: 'inline', marginRight: '4px' }} />
              Created
            </div>
            <div className="cert-detail-value">{formatDate(cert.createdAt)}</div>
          </div>
          {cert.issuedAt && (
            <div className="cert-detail-item">
              <div className="cert-detail-label">
                <HiOutlineCheckCircle style={{ display: 'inline', marginRight: '4px' }} />
                Issued
              </div>
              <div className="cert-detail-value">{formatDate(cert.issuedAt)}</div>
            </div>
          )}
          {cert.expiresAt && (
            <div className="cert-detail-item">
              <div className="cert-detail-label">Expires</div>
              <div className="cert-detail-value">{formatDate(cert.expiresAt)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Challenge Instructions (for pending certificates) */}
      {cert.status === 'pending' && cert.challengeInstructions && (
        <div className="glass-card" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            Complete Domain Validation
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
            Follow these instructions to prove domain ownership, then click &quot;Verify & Issue&quot;.
          </p>

          {cert.challengeInstructions.map((instr, i) => (
            <div key={i} className="challenge-card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--text-accent)' }}>
                {instr.domain}
              </h3>

              {instr.type === 'http-01' && instr.httpChallenge && (
                <div>
                  <div className="challenge-step">
                    <div className="challenge-step-number">1</div>
                    <div className="challenge-step-content">
                      <h4>Create the challenge file</h4>
                      <p>Create a file at this path on your web server:</p>
                      <div className="code-block" style={{ marginTop: 'var(--space-2)' }}>
                        {instr.httpChallenge.path}
                      </div>
                    </div>
                  </div>
                  <div className="challenge-step">
                    <div className="challenge-step-number">2</div>
                    <div className="challenge-step-content">
                      <h4>File content</h4>
                      <p>Place this exact content in the file:</p>
                      <div style={{ position: 'relative' }}>
                        <div className="code-block" style={{ marginTop: 'var(--space-2)' }}>
                          {instr.httpChallenge.content}
                        </div>
                        <button
                          className="copy-btn"
                          style={{ position: 'absolute', top: '8px', right: '8px' }}
                          onClick={() => copyToClipboard(instr.httpChallenge!.content, `http-${i}`)}
                        >
                          {copiedField === `http-${i}` ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="challenge-step">
                    <div className="challenge-step-number">3</div>
                    <div className="challenge-step-content">
                      <h4>Verify accessibility</h4>
                      <p>Make sure this URL is publicly accessible:</p>
                      <div className="code-block" style={{ marginTop: 'var(--space-2)' }}>
                        {instr.httpChallenge.url}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {instr.type === 'dns-01' && instr.dnsRecord && (
                <div>
                  <div className="challenge-step">
                    <div className="challenge-step-number">1</div>
                    <div className="challenge-step-content">
                      <h4>Add a DNS TXT record</h4>
                      <p>Add the following TXT record to your DNS settings:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                        <div className="cert-detail-item">
                          <div className="cert-detail-label">Record Name</div>
                          <div className="cert-detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                            {instr.dnsRecord.name}
                          </div>
                        </div>
                        <div className="cert-detail-item">
                          <div className="cert-detail-label">Record Type</div>
                          <div className="cert-detail-value">{instr.dnsRecord.type}</div>
                        </div>
                        <div className="cert-detail-item" style={{ position: 'relative' }}>
                          <div className="cert-detail-label">Record Value</div>
                          <div className="cert-detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {instr.dnsRecord.value}
                          </div>
                          <button
                            className="copy-btn"
                            style={{ position: 'absolute', top: '8px', right: '8px' }}
                            onClick={() => copyToClipboard(instr.dnsRecord!.value, `dns-${i}`)}
                          >
                            {copiedField === `dns-${i}` ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="challenge-step" style={{ marginBottom: 0 }}>
                    <div className="challenge-step-number">2</div>
                    <div className="challenge-step-content">
                      <h4>Wait for DNS propagation</h4>
                      <p>DNS changes can take a few minutes to propagate. Wait before clicking verify.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleVerify}
              disabled={verifying}
              id="verify-btn"
            >
              {verifying ? (
                <>
                  <div className="spinner" />
                  Verifying...
                </>
              ) : (
                <>
                  <HiOutlineCheckCircle />
                  Verify & Issue Certificate
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Certificate Files (for issued certificates) */}
      {cert.status === 'active' && cert.certificate && (() => {
        const st: ServerType = cert.serverType || 'other';
        const files = SERVER_DOWNLOAD_FILES[st];
        const downloadIcon = (qp: string) => {
          if (qp === 'key') return <HiOutlineKey />;
          if (qp === 'bundle') return <HiOutlineLink />;
          if (qp === 'fullchain') return <HiOutlineLink />;
          return <HiOutlineDocumentText />;
        };

        return (
          <div className="glass-card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              Certificate Files
            </h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: 'var(--space-5)' }}>
              Formatted for <strong style={{ color: 'var(--text-secondary)' }}>
                {st === 'apache' ? 'Apache / cPanel' : st === 'nginx' ? 'Nginx' : 'Generic'}
              </strong>
            </p>

            <div className="download-grid" style={{ marginBottom: 'var(--space-6)' }}>
              {files
                .filter((f) => !(f.queryParam === 'key' && cert.customCsr))
                .map((f) => (
                  <Link
                    key={f.queryParam}
                    href={`/api/certificates/download/${cert.id}?type=${f.queryParam}`}
                    className="download-card"
                  >
                    <div className="download-card-icon">{downloadIcon(f.queryParam)}</div>
                    <div className="download-card-title">{f.label}</div>
                    <div className="download-card-desc">{f.description}</div>
                  </Link>
                ))}
              <Link
                href={`/api/certificates/download/${cert.id}?type=zip`}
                className="download-card"
                style={{ border: '1px solid var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)' }}
              >
                <div className="download-card-icon" style={{ color: 'var(--accent-primary)' }}>
                  <HiOutlineArchiveBox />
                </div>
                <div className="download-card-title">Download All</div>
                <div className="download-card-desc">zip — All files in one bundle</div>
              </Link>
            </div>

            {cert.customCsr && (
              <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
                <span className="alert-icon"><HiOutlineKey /></span>
                <span>
                  <strong>Private key not included</strong> — you used a custom CSR,
                  so the private key is on your system.
                </span>
              </div>
            )}

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Full Certificate PEM
                </h3>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(cert.certificate!, 'cert-pem')}
                >
                  <HiOutlineClipboardDocument style={{ display: 'inline', marginRight: '4px' }} />
                  {copiedField === 'cert-pem' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <div className="code-block" style={{ maxHeight: '200px', overflow: 'auto' }}>
                {cert.certificate}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Failed state */}
      {cert.status === 'failed' && (
        <div className="glass-card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="alert alert-danger">
            <span className="alert-icon"><HiOutlineExclamationTriangle /></span>
            <div>
              <strong>Certificate generation failed</strong>
              <p style={{ marginTop: 'var(--space-1)', lineHeight: 1.6 }}>
                {cert.error || 'An error occurred during certificate generation.'}
              </p>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginTop: 'var(--space-4)' }}>
            <span className="alert-icon"><HiOutlineArrowPath /></span>
            <div>
              <strong>What to do next</strong>
              <p style={{ marginTop: 'var(--space-1)', lineHeight: 1.6 }}>
                Once an ACME challenge fails, the order becomes invalid and cannot be retried.
                You need to delete this certificate and generate a new one. Make sure your
                domain challenge (DNS record or HTTP file) is correctly set up <strong>before</strong> clicking
                &quot;Verify &amp; Issue&quot; next time.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <button
              className="btn btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              id="delete-failed-btn"
            >
              <HiOutlineTrash />
              {deleting ? 'Deleting...' : 'Delete This Certificate'}
            </button>
            <Link href="/generate" className="btn btn-primary">
              <HiOutlineArrowPath />
              Generate New Certificate
            </Link>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--space-4)', fontSize: '1.5rem', color: 'var(--danger)'
              }}>
                <HiOutlineTrash />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Delete Certificate?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                This will permanently delete the certificate for{' '}
                <strong>{cert?.domains[0]}</strong>.
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                id="cancel-delete-btn"
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                id="confirm-delete-btn"
              >
                <HiOutlineTrash />
                Delete Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
