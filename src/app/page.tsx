import Link from 'next/link';
import { getAllCertificates, getStats } from '@/lib/storage';
import StatusBadge from '@/components/StatusBadge';
import { getSession } from '@/lib/auth';
import {
  HiOutlineShieldCheck,
  HiOutlineCheckBadge,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineArrowRight,
  HiOutlineLockClosed,
  HiOutlineGlobeAlt,
  HiOutlineBolt,
} from 'react-icons/hi2';

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();
  const stats = session ? getStats(session.id) : { total: 0, active: 0, pending: 0, expiringSoon: 0, failed: 0 };
  const certificates = session ? getAllCertificates(session.id).slice(0, 5) : [];
  const hasCertificates = session && certificates.length > 0;
  const isLoggedOut = !session;

  return (
    <div className="container">
      {/* Hero Section */}
      {!hasCertificates && (
        <section className="hero animate-fade-in">
          <div className="hero-badge">
            <HiOutlineLockClosed />
            Free SSL/TLS Certificates
          </div>
          <h1 className="hero-title">
            Secure Your Domains<br />in Seconds
          </h1>
          <p className="hero-subtitle">
            Generate free SSL/TLS certificates powered by Let&apos;s Encrypt.
            Support for HTTP-01 and DNS-01 challenges, wildcard domains, and
            instant downloads.
          </p>
          <div className="hero-actions">
            {isLoggedOut ? (
              <>
                <Link href="/register" className="btn btn-primary btn-lg">
                  <HiOutlineBolt />
                  Create Free Account
                </Link>
                <Link href="/login" className="btn btn-secondary btn-lg">
                  Login to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/generate" className="btn btn-primary btn-lg">
                  <HiOutlineBolt />
                  Generate Certificate
                </Link>
                <Link href="/certificates" className="btn btn-secondary btn-lg">
                  View Certificates
                </Link>
              </>
            )}
          </div>
        </section>
      )}

      {/* Dashboard with stats */}
      {hasCertificates && (
        <>
          <div className="page-header animate-slide-up">
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Overview of your SSL certificates
            </p>
          </div>

          {/* Stats */}
          <div className="stats-grid animate-slide-up">
            <div className="stat-card">
              <div className="stat-icon stat-icon-purple">
                <HiOutlineShieldCheck />
              </div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Certificates</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <HiOutlineCheckBadge />
              </div>
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">Active</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-yellow">
                <HiOutlineClock />
              </div>
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-red">
                <HiOutlineExclamationTriangle />
              </div>
              <div className="stat-value">{stats.expiringSoon}</div>
              <div className="stat-label">Expiring Soon</div>
            </div>
          </div>

          {/* Recent Certificates Table */}
          <div className="table-container animate-slide-up">
            <div className="table-header">
              <h2 className="table-title">Recent Certificates</h2>
              <Link href="/certificates" className="btn btn-secondary btn-sm">
                View All
                <HiOutlineArrowRight />
              </Link>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Status</th>
                  <th>Environment</th>
                  <th>Created</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id}>
                    <td>
                      <Link
                        href={`/certificate/${cert.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <HiOutlineGlobeAlt style={{ color: 'var(--accent-primary)' }} />
                        <span className="td-domain">{cert.domains[0]}</span>
                        {cert.domains.length > 1 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            +{cert.domains.length - 1}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={cert.status} />
                    </td>
                    <td>
                      <span className={`badge badge-${cert.environment === 'production' ? 'active' : 'pending'}`}>
                        {cert.environment}
                      </span>
                    </td>
                    <td className="td-mono">{formatDate(cert.createdAt)}</td>
                    <td className="td-mono">{formatDate(cert.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Feature cards for empty state */}
      {!hasCertificates && (
        <section style={{ paddingBottom: 'var(--space-16)' }}>
          <div className="stats-grid animate-slide-up" style={{ marginTop: 'var(--space-8)' }}>
            <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
              <div className="stat-icon stat-icon-green" style={{ margin: '0 auto var(--space-4)' }}>
                <HiOutlineLockClosed />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Free Forever
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Powered by Let&apos;s Encrypt — industry standard, trusted by millions of websites worldwide.
              </p>
            </div>

            <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
              <div className="stat-icon stat-icon-purple" style={{ margin: '0 auto var(--space-4)' }}>
                <HiOutlineBolt />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Quick & Easy
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Step-by-step wizard guides you through domain validation and certificate generation.
              </p>
            </div>

            <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
              <div className="stat-icon stat-icon-yellow" style={{ margin: '0 auto var(--space-4)' }}>
                <HiOutlineGlobeAlt />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Wildcard Support
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Generate wildcard certificates via DNS-01 challenge to cover all subdomains.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
