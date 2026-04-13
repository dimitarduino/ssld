import { getCertificateById, deleteCertificate } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const cert = await getCertificateById(id);
    if (!cert) {
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
    const cert = await getCertificateById(id);
    if (!cert) {
      return Response.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const deleted = await deleteCertificate(id);
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
