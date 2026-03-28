import Link from 'next/link';
import { CertificateRecord } from '@/lib/types';
import StatusBadge from './StatusBadge';
import { HiOutlineGlobeAlt, HiOutlineClock } from 'react-icons/hi2';
import styles from './CertificateCard.module.css';

interface CertificateCardProps {
  cert: CertificateRecord;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CertificateCard({ cert }: CertificateCardProps) {
  return (
    <Link href={`/certificate/${cert.id}`} className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.domainInfo}>
          <HiOutlineGlobeAlt className={styles.domainIcon} />
          <div>
            <div className={styles.domain}>{cert.domains[0]}</div>
            {cert.domains.length > 1 && (
              <div className={styles.extraDomains}>
                +{cert.domains.length - 1} more domain{cert.domains.length > 2 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
        <StatusBadge status={cert.status} />
      </div>

      <div className={styles.cardMeta}>
        <div className={styles.metaItem}>
          <HiOutlineClock />
          <span>Created {formatDate(cert.createdAt)}</span>
        </div>
        {cert.expiresAt && (
          <div className={styles.metaItem}>
            <span>Expires {formatDate(cert.expiresAt)}</span>
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <span className={`badge badge-${cert.environment === 'production' ? 'active' : 'pending'}`}>
          {cert.environment}
        </span>
        <span className={styles.challengeType}>{cert.challengeType}</span>
      </div>
    </Link>
  );
}
