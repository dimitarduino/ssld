import { getAllCertificates } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const certificates = getAllCertificates();

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
