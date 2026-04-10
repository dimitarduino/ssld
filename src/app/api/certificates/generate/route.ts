import { NextRequest } from 'next/server';
import { initiateOrder } from '@/lib/acme';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domains, email, challengeType, environment, serverType, customCsr } = body;

    // Validation
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return Response.json(
        { error: 'At least one domain is required' },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    if (!['http-01', 'dns-01'].includes(challengeType)) {
      return Response.json(
        { error: 'Challenge type must be http-01 or dns-01' },
        { status: 400 }
      );
    }

    if (!['staging', 'production'].includes(environment)) {
      return Response.json(
        { error: 'Environment must be staging or production' },
        { status: 400 }
      );
    }

    const finalServerType = serverType || 'apache';

    // Validate custom CSR format if provided
    if (customCsr && typeof customCsr === 'string') {
      const trimmed = customCsr.trim();
      if (!trimmed.includes('-----BEGIN CERTIFICATE REQUEST-----') &&
          !trimmed.includes('-----BEGIN NEW CERTIFICATE REQUEST-----')) {
        return Response.json(
          { error: 'Invalid CSR format. The CSR must be in PEM format starting with -----BEGIN CERTIFICATE REQUEST-----' },
          { status: 400 }
        );
      }
    }

    // Check for wildcard + http-01 combo
    const hasWildcard = domains.some((d: string) => d.startsWith('*.'));
    const finalChallengeType = hasWildcard ? 'dns-01' : challengeType;

    const record = await initiateOrder(
      'default',
      domains,
      email,
      finalChallengeType,
      environment,
      finalServerType,
      customCsr && typeof customCsr === 'string' ? customCsr.trim() : undefined
    );

    return Response.json(record, { status: 201 });
  } catch (err: unknown) {
    console.error('Certificate generation error:', err);
    const message =
      err instanceof Error ? err.message : 'Failed to generate certificate';
    return Response.json({ error: message }, { status: 500 });
  }
}
