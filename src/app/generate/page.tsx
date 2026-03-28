'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  HiOutlineGlobeAlt,
  HiOutlineShieldCheck,
  HiOutlineEnvelope,
  HiOutlineCog6Tooth,
  HiOutlineCheckCircle,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineBolt,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlinePlusCircle,
  HiOutlineXMark,
  HiOutlineDocumentText,
  HiOutlineServerStack,
} from 'react-icons/hi2';
import type { ChallengeType, AcmeEnvironment, ServerType } from '@/lib/types';

const steps = [
  { label: 'Domains', icon: HiOutlineGlobeAlt },
  { label: 'Challenge', icon: HiOutlineShieldCheck },
  { label: 'Contact', icon: HiOutlineEnvelope },
  { label: 'Options', icon: HiOutlineCog6Tooth },
  { label: 'Review', icon: HiOutlineCheckCircle },
];

export default function GeneratePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [domains, setDomains] = useState<string[]>(['']);
  const [challengeType, setChallengeType] = useState<ChallengeType>('http-01');
  const [email, setEmail] = useState('');
  const [environment, setEnvironment] = useState<AcmeEnvironment>('staging');
  const [serverType, setServerType] = useState<ServerType>('apache');
  const [useCustomCsr, setUseCustomCsr] = useState(false);
  const [customCsr, setCustomCsr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check auth on mount and prefill email
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          router.push('/login');
        } else {
          setEmail(data.user.email);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const addDomain = () => setDomains([...domains, '']);
  const removeDomain = (index: number) => {
    if (domains.length === 1) return;
    setDomains(domains.filter((_, i) => i !== index));
  };
  const updateDomain = (index: number, value: string) => {
    const updated = [...domains];
    updated[index] = value;
    setDomains(updated);
  };

  const validDomains = domains.filter((d) => d.trim().length > 0);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isCsrValid = !useCustomCsr || customCsr.trim().includes('-----BEGIN CERTIFICATE REQUEST-----') || customCsr.trim().includes('-----BEGIN NEW CERTIFICATE REQUEST-----');

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return validDomains.length > 0;
      case 1:
        return true;
      case 2:
        return isEmailValid;
      case 3:
        return isCsrValid;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domains: validDomains,
          email,
          challengeType: hasWildcard ? 'dns-01' : challengeType,
          environment,
          serverType,
          customCsr: useCustomCsr ? customCsr.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate certificate');
      }

      // Save email for next time
      localStorage.setItem('cert_email', email);

      router.push(`/certificate/${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const hasWildcard = validDomains.some((d) => d.startsWith('*.'));

  const serverTypeOptions: { value: ServerType; label: string; emoji: string; desc: string; files: string }[] = [
    {
      value: 'apache',
      label: 'Apache / cPanel',
      emoji: '🔶',
      desc: 'Most shared hosting, cPanel, WHM',
      files: '.cert + .bundle + .key',
    },
    {
      value: 'nginx',
      label: 'Nginx',
      emoji: '🟢',
      desc: 'Nginx, reverse proxies, load balancers',
      files: '.crt (full chain) + .key',
    },
    {
      value: 'other',
      label: 'Other / Generic',
      emoji: '📄',
      desc: 'Tomcat, Node.js, Caddy, HAProxy, etc.',
      files: '.pem files (cert, chain, key)',
    },
  ];

  return (
    <div className="container">
      <div className="wizard-container animate-slide-up">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title">Generate Certificate</h1>
          <p className="page-subtitle">
            Follow the steps to create your free SSL certificate
          </p>
        </div>

        {/* Step Progress */}
        <div className="wizard-steps">
          {steps.map((step, i) => (
            <div key={i} className="wizard-step" style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <div
                  className={`wizard-connector ${i <= currentStep ? 'completed' : ''}`}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  className={`wizard-step-number ${
                    i < currentStep
                      ? 'completed'
                      : i === currentStep
                      ? 'active'
                      : 'inactive'
                  }`}
                >
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <span
                  className={`wizard-step-label ${
                    i === currentStep ? 'active' : ''
                  }`}
                  style={{
                    color:
                      i === currentStep
                        ? 'var(--text-primary)'
                        : 'var(--text-tertiary)',
                  }}
                >
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="glass-card">
          <div className="wizard-content" key={currentStep}>
            {/* Step 0: Domains */}
            {currentStep === 0 && (
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                  Enter Your Domains
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
                  Add one or more domains for your certificate. Use{' '}
                  <code style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>
                    *.example.com
                  </code>{' '}
                  for wildcard certificates.
                </p>

                {domains.map((domain, i) => (
                  <div
                    key={i}
                    className="form-group"
                    style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}
                  >
                    <input
                      type="text"
                      className="form-input"
                      placeholder="example.com or *.example.com"
                      value={domain}
                      onChange={(e) => updateDomain(i, e.target.value)}
                      id={`domain-input-${i}`}
                    />
                    {domains.length > 1 && (
                      <button
                        className="btn btn-icon btn-secondary"
                        onClick={() => removeDomain(i)}
                        title="Remove domain"
                        id={`remove-domain-${i}`}
                      >
                        <HiOutlineXMark />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={addDomain}
                  id="add-domain-btn"
                >
                  <HiOutlinePlusCircle />
                  Add Another Domain
                </button>

                {hasWildcard && (
                  <div className="alert alert-info" style={{ marginTop: 'var(--space-4)' }}>
                    <span className="alert-icon"><HiOutlineInformationCircle /></span>
                    <span>
                      Wildcard certificates require DNS-01 challenge validation.
                      The challenge type will be automatically set to DNS-01.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Challenge Type */}
            {currentStep === 1 && (
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                  Choose Validation Method
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
                  Select how you want to prove domain ownership.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <button
                    className="glass-card"
                    onClick={() => !hasWildcard && setChallengeType('http-01')}
                    style={{
                      cursor: hasWildcard ? 'not-allowed' : 'pointer',
                      opacity: hasWildcard ? 0.5 : 1,
                      textAlign: 'left',
                      border:
                        challengeType === 'http-01' && !hasWildcard
                          ? '1px solid var(--accent-primary)'
                          : undefined,
                      boxShadow:
                        challengeType === 'http-01' && !hasWildcard
                          ? 'var(--shadow-glow)'
                          : undefined,
                    }}
                    id="challenge-http-01"
                    disabled={hasWildcard}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                      <HiOutlineGlobeAlt style={{ fontSize: '1.3rem', color: 'var(--accent-primary)' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>HTTP-01 Challenge</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      Place a specific file on your web server at{' '}
                      <code style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        /.well-known/acme-challenge/
                      </code>
                      . Requires port 80 to be accessible.
                    </p>
                    {hasWildcard && (
                      <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 'var(--space-2)' }}>
                        Not available for wildcard certificates
                      </p>
                    )}
                  </button>

                  <button
                    className="glass-card"
                    onClick={() => setChallengeType('dns-01')}
                    style={{
                      cursor: 'pointer',
                      textAlign: 'left',
                      border:
                        challengeType === 'dns-01' || hasWildcard
                          ? '1px solid var(--accent-primary)'
                          : undefined,
                      boxShadow:
                        challengeType === 'dns-01' || hasWildcard
                          ? 'var(--shadow-glow)'
                          : undefined,
                    }}
                    id="challenge-dns-01"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                      <HiOutlineShieldCheck style={{ fontSize: '1.3rem', color: 'var(--success)' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>DNS-01 Challenge</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      Add a TXT record to your domain&apos;s DNS settings. Supports wildcard
                      certificates and works even when port 80 is blocked.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Email */}
            {currentStep === 2 && (
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                  Contact Email
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
                  Let&apos;s Encrypt requires a contact email for important notifications
                  about your certificates.
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="email-input">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    id="email-input"
                  />
                  <p className="form-hint">
                    Used for certificate expiry notifications and account recovery.
                  </p>
                </div>

                <div className="alert alert-info">
                  <span className="alert-icon"><HiOutlineInformationCircle /></span>
                  <span>
                    By proceeding, you agree to the Let&apos;s Encrypt{' '}
                    <a
                      href="https://letsencrypt.org/documents/LE-SA-v1.4-April-3-2024.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Terms of Service
                    </a>
                    .
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Options — Server Type, Environment, Custom CSR */}
            {currentStep === 3 && (
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                  Options
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
                  Configure your server type, environment, and CSR settings.
                </p>

                {/* Server Type */}
                <div style={{ marginBottom: 'var(--space-8)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <HiOutlineServerStack style={{ color: 'var(--accent-primary)' }} />
                    Server Type
                  </h3>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: 'var(--space-4)' }}>
                    Determines the download file format for your certificate.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {serverTypeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        className="glass-card"
                        onClick={() => setServerType(opt.value)}
                        style={{
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: 'var(--text-primary)',
                          padding: 'var(--space-4)',
                          border: serverType === opt.value
                            ? '1px solid var(--accent-primary)'
                            : undefined,
                          boxShadow: serverType === opt.value
                            ? 'var(--shadow-glow)'
                            : undefined,
                        }}
                        id={`server-type-${opt.value}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <span style={{ fontSize: '1.3rem' }}>{opt.emoji}</span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{opt.label}</div>
                              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '2px' }}>
                                {opt.desc}
                              </div>
                            </div>
                          </div>
                          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-accent)', whiteSpace: 'nowrap' }}>
                            {opt.files}
                          </code>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Environment */}
                <div style={{ marginBottom: 'var(--space-8)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                    Environment
                  </h3>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: 'var(--space-4)' }}>
                    Choose between staging (for testing) and production.
                  </p>

                  <div className="toggle-group" style={{ maxWidth: '400px' }}>
                    <button
                      className={`toggle-option ${environment === 'staging' ? 'active' : ''}`}
                      onClick={() => setEnvironment('staging')}
                      id="env-staging"
                    >
                      🧪 Staging
                    </button>
                    <button
                      className={`toggle-option ${environment === 'production' ? 'active' : ''}`}
                      onClick={() => setEnvironment('production')}
                      id="env-production"
                    >
                      🚀 Production
                    </button>
                  </div>

                  {environment === 'staging' && (
                    <div className="alert alert-info" style={{ marginTop: 'var(--space-3)' }}>
                      <span className="alert-icon"><HiOutlineInformationCircle /></span>
                      <span>
                        Staging certificates are <strong>not trusted by browsers</strong>,
                        but are perfect for testing without hitting rate limits.
                      </span>
                    </div>
                  )}

                  {environment === 'production' && (
                    <div className="alert alert-warning" style={{ marginTop: 'var(--space-3)' }}>
                      <span className="alert-icon"><HiOutlineExclamationTriangle /></span>
                      <span>
                        Production certificates are browser-trusted but have{' '}
                        <strong>rate limits</strong> (50 per domain per week).
                      </span>
                    </div>
                  )}
                </div>

                {/* Custom CSR */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <HiOutlineDocumentText style={{ color: 'var(--accent-primary)' }} />
                    CSR (Certificate Signing Request)
                  </h3>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: 'var(--space-4)' }}>
                    Use your own CSR or let us generate one automatically.
                  </p>

                  <div className="toggle-group" style={{ maxWidth: '400px', marginBottom: 'var(--space-4)' }}>
                    <button
                      className={`toggle-option ${!useCustomCsr ? 'active' : ''}`}
                      onClick={() => { setUseCustomCsr(false); setCustomCsr(''); }}
                      id="csr-auto"
                    >
                      🔑 Auto-generate
                    </button>
                    <button
                      className={`toggle-option ${useCustomCsr ? 'active' : ''}`}
                      onClick={() => setUseCustomCsr(true)}
                      id="csr-custom"
                    >
                      📋 Custom CSR
                    </button>
                  </div>

                  {!useCustomCsr && (
                    <div className="alert alert-info">
                      <span className="alert-icon"><HiOutlineInformationCircle /></span>
                      <span>
                        A private key and CSR will be generated automatically.
                        You&apos;ll be able to download the private key after the certificate is issued.
                      </span>
                    </div>
                  )}

                  {useCustomCsr && (
                    <div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="custom-csr-input">
                          Paste your CSR (PEM format)
                        </label>
                        <textarea
                          className="form-input"
                          id="custom-csr-input"
                          rows={8}
                          placeholder={`-----BEGIN CERTIFICATE REQUEST-----\nMIIC...\n-----END CERTIFICATE REQUEST-----`}
                          value={customCsr}
                          onChange={(e) => setCustomCsr(e.target.value)}
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', resize: 'vertical' }}
                        />
                        <p className="form-hint">
                          Paste the contents of your .csr file. The private key stays on your server.
                        </p>
                      </div>

                      {customCsr.trim() && !isCsrValid && (
                        <div className="alert alert-danger" style={{ marginTop: 'var(--space-2)' }}>
                          <span className="alert-icon"><HiOutlineExclamationTriangle /></span>
                          <span>
                            Invalid CSR format. Must start with <code style={{ fontFamily: 'var(--font-mono)' }}>-----BEGIN CERTIFICATE REQUEST-----</code>
                          </span>
                        </div>
                      )}

                      <div className="alert alert-warning" style={{ marginTop: 'var(--space-3)' }}>
                        <span className="alert-icon"><HiOutlineExclamationTriangle /></span>
                        <span>
                          When using a custom CSR, the <strong>private key will NOT</strong> be available for download. 
                          Make sure you keep a copy of the private key that was used to generate this CSR.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                  Review & Generate
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
                  Double-check your settings before generating the certificate.
                </p>

                <div className="cert-detail-grid" style={{ marginBottom: 'var(--space-6)' }}>
                  <div className="cert-detail-item">
                    <div className="cert-detail-label">Domains</div>
                    <div className="cert-detail-value">
                      {validDomains.map((d, i) => (
                        <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="cert-detail-item">
                    <div className="cert-detail-label">Challenge Type</div>
                    <div className="cert-detail-value" style={{ fontFamily: 'var(--font-mono)' }}>
                      {hasWildcard ? 'dns-01' : challengeType}
                    </div>
                  </div>
                  <div className="cert-detail-item">
                    <div className="cert-detail-label">Contact Email</div>
                    <div className="cert-detail-value">{email}</div>
                  </div>
                  <div className="cert-detail-item">
                    <div className="cert-detail-label">Server Type</div>
                    <div className="cert-detail-value" style={{ textTransform: 'capitalize' }}>
                      {serverTypeOptions.find(o => o.value === serverType)?.label || serverType}
                    </div>
                  </div>
                  <div className="cert-detail-item">
                    <div className="cert-detail-label">Download Format</div>
                    <div className="cert-detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {serverTypeOptions.find(o => o.value === serverType)?.files}
                    </div>
                  </div>
                  <div className="cert-detail-item">
                    <div className="cert-detail-label">Environment</div>
                    <div className="cert-detail-value" style={{ textTransform: 'capitalize' }}>
                      {environment === 'staging' ? '🧪 Staging' : '🚀 Production'}
                    </div>
                  </div>
                  <div className="cert-detail-item">
                    <div className="cert-detail-label">CSR</div>
                    <div className="cert-detail-value">
                      {useCustomCsr ? '📋 Custom CSR (your private key)' : '🔑 Auto-generated'}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger" style={{ marginBottom: 'var(--space-4)' }}>
                    <span className="alert-icon"><HiOutlineExclamationTriangle /></span>
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="wizard-actions">
            <button
              className="btn btn-secondary"
              onClick={prevStep}
              disabled={currentStep === 0}
              style={{ opacity: currentStep === 0 ? 0.5 : 1 }}
              id="wizard-prev"
            >
              <HiOutlineArrowLeft />
              Back
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={nextStep}
                disabled={!canProceed()}
                style={{ opacity: canProceed() ? 1 : 0.5 }}
                id="wizard-next"
              >
                Next
                <HiOutlineArrowRight />
              </button>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                id="wizard-submit"
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner" />
                    Generating...
                  </>
                ) : (
                  <>
                    <HiOutlineBolt />
                    Generate Certificate
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
