import { getCertificateById, deleteCertificate } from '@/lib/storage';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cert = getCertificateById(id);
    if (!cert || cert.userId !== session.id) {
      return Response.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // Remove sensitive data
    const { accountKeyPem, ...rest } = cert;
    return Response.json(rest);
  } catch (err: unknown) {
    console.error('Error fetching certificate:', err);
    return Response.json(
      { error: 'Failed to fetch certificate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cert = getCertificateById(id);
    if (!cert || cert.userId !== session.id) {
      return Response.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const deleted = deleteCertificate(id);
    if (!deleted) {
      return Response.json({ error: 'Certificate not found' }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting certificate:', err);
    return Response.json(
      { error: 'Failed to delete certificate' },
      { status: 500 }
    );
  }
}
