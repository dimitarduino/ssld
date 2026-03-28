import { getAllCertificates } from '@/lib/storage';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const certificates = getAllCertificates(session.id);

    // Remove sensitive data from all records
    const sanitized = certificates.map((cert) => {
      const { accountKeyPem, ...rest } = cert;
      return rest;
    });

    return Response.json({
      certificates: sanitized,
      total: sanitized.length,
    });
  } catch (err: unknown) {
    console.error('Error fetching certificates:', err);
    return Response.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}
