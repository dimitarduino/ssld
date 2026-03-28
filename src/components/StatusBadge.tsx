import { CertificateStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: CertificateStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
