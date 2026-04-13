import { NextRequest } from 'next/server';
import { getCertificateById } from '@/lib/storage';
import { verifyChallengeAndFinalize } from '@/lib/acme';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json(
        { error: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    const cert = await getCertificateById(id);

    if (!cert) {
      return Response.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    if (cert.status !== 'pending') {
      return Response.json(
        { error: `Certificate is not in pending state (current: ${cert.status})` },
        { status: 400 }
      );
    }

    const updated = await verifyChallengeAndFinalize(cert);

    // Remove sensitive data
    const response = { ...updated };
    delete response.accountKeyPem;

    return Response.json(response);
  } catch (err: unknown) {
    console.error('Verification error:', err);
    const message =
      err instanceof Error ? err.message : 'Challenge verification failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
