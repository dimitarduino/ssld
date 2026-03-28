'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HiOutlineShieldCheck, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi2';
import { useTheme } from 'next-themes';
import styles from './Navbar.module.css';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/generate', label: 'Generate' },
  { href: '/certificates', label: 'Certificates' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    function fetchUser() {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.user) setUser(data.user);
          else setUser(null);
        })
        .catch(() => setUser(null));
    }

    fetchUser();

    window.addEventListener('auth-change', fetchUser);
    return () => window.removeEventListener('auth-change', fetchUser);
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <HiOutlineShieldCheck />
          </div>
          <span className={styles.logoText}>SSLD</span>
        </Link>

        {user && (
          <div className={styles.navLinks}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${
                  pathname === link.href ? styles.navLinkActive : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn btn-icon"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-secondary)',
                color: 'var(--text-secondary)',
              }}
              title="Toggle theme"
            >
              {theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}
            </button>
          )}
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {user.name}
              </span>
              <button 
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
              >
                Logout
              </button>
              <Link href="/generate" className="btn btn-primary btn-sm">
                + New
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
