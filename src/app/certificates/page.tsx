import Link from 'next/link';
import { getAllCertificates } from '@/lib/storage';
import CertificateCard from '@/components/CertificateCard';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  HiOutlineBolt,
  HiOutlineShieldExclamation,
} from 'react-icons/hi2';

export const dynamic = 'force-dynamic';

export default async function CertificatesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const certificates = getAllCertificates(session.id).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="container animate-slide-up">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Certificates</h1>
          <p className="page-subtitle">
            Manage your SSL/TLS certificates
          </p>
        </div>
        <Link href="/generate" className="btn btn-primary">
          <HiOutlineBolt />
          Generate New
        </Link>
      </div>

      {certificates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <HiOutlineShieldExclamation />
          </div>
          <h2 className="empty-state-title">No Certificates Yet</h2>
          <p className="empty-state-desc">
            Generate your first SSL certificate to get started.
          </p>
          <Link href="/generate" className="btn btn-primary">
            <HiOutlineBolt />
            Generate Certificate
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {certificates.map((cert) => (
            <CertificateCard key={cert.id} cert={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
