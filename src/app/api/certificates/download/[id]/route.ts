import { type NextRequest } from 'next/server';
import { getCertificateById, getKeyFile } from '@/lib/storage';
import { splitCertChain } from '@/lib/acme';
import { getSession } from '@/lib/auth';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'cert';

  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cert = getCertificateById(id);
    if (!cert || cert.userId !== session.id) {
      return Response.json({ error: 'Certificate not found' }, { status: 404 });
    }

    if (cert.status !== 'active' || !cert.certificate) {
      return Response.json(
        { error: 'Certificate is not yet issued' },
        { status: 400 }
      );
    }

    const domainSlug = cert.domains[0].replace(/\*/g, 'wildcard');
    const { cert: serverCert, bundle } = splitCertChain(cert.certificate);
    const serverType = cert.serverType || 'other';

    let content: string;
    let filename: string;
    let contentType = 'application/x-pem-file';

    switch (type) {
      // Private key — .key for all server types
      case 'key': {
        if (cert.customCsr) {
          return Response.json(
            { error: 'Private key not available — you used a custom CSR, so the key is on your system.' },
            { status: 400 }
          );
        }
        const key = getKeyFile(id);
        if (!key) {
          return Response.json(
            { error: 'Private key not found' },
            { status: 404 }
          );
        }
        content = key;
        filename = `${domainSlug}.key`;
        break;
      }

      // Server certificate only
      case 'cert': {
        content = serverCert;
        if (serverType === 'apache') {
          filename = `${domainSlug}.cert`;
        } else {
          filename = `${domainSlug}-certificate.pem`;
        }
        break;
      }

      // CA bundle / intermediate chain only
      case 'bundle': {
        if (!bundle) {
          return Response.json(
            { error: 'No intermediate certificates found in chain' },
            { status: 404 }
          );
        }
        content = bundle;
        if (serverType === 'apache') {
          filename = `${domainSlug}.bundle`;
        } else {
          filename = `${domainSlug}-ca-bundle.pem`;
        }
        break;
      }

      // ZIP ALL FILES
      case 'zip': {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const stream = new PassThrough();

        // Pipe archive to stream
        archive.pipe(stream);

        // Add files based on serverType
        if (serverType === 'apache') {
          archive.append(serverCert, { name: `${domainSlug}.cert` });
          if (bundle) archive.append(bundle, { name: `${domainSlug}.bundle` });
        } else if (serverType === 'nginx') {
          archive.append(cert.certificate, { name: `${domainSlug}.crt` });
        } else {
          archive.append(serverCert, { name: `certificate.pem` });
          if (bundle) archive.append(bundle, { name: `ca-bundle.pem` });
          archive.append(cert.certificate, { name: `fullchain.pem` });
        }

        // Add private key if auto-generated
        if (!cert.customCsr) {
          const key = getKeyFile(id);
          if (key) {
            archive.append(key, { name: `${domainSlug}.key` });
          }
        }

        // Finalize the archive
        archive.finalize();

        return new Response(stream as any, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${domainSlug}-ssl.zip"`,
            'Cache-Control': 'no-cache',
          },
        });
      }

      // Full chain (cert + intermediates combined)
      case 'fullchain':
      default: {
        content = cert.certificate;
        if (serverType === 'nginx') {
          filename = `${domainSlug}.crt`;
        } else {
          filename = `${domainSlug}-fullchain.pem`;
        }
        break;
      }
    }

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error('Download error:', err);
    return Response.json(
      { error: 'Failed to download certificate' },
      { status: 500 }
    );
  }
}
