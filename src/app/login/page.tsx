'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineArrowRight } from 'react-icons/hi2';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      window.dispatchEvent(new Event('auth-change'));
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Login to manage your SSL certificates</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 'var(--space-6)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <HiOutlineEnvelope className="input-icon" />
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-8)' }}>
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <HiOutlineLockClosed className="input-icon" />
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : 'Login to Dashboard'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Don&apos;t have an account? </span>
          <Link href="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  );
}
