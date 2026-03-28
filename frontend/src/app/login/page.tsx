'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, getApiUrl } from '@/components/providers/AuthProvider';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Handle OAuth callback — token comes back in query params
  useEffect(() => {
    const token = searchParams.get('token');
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const id = searchParams.get('id');

    if (token && email) {
      login(token, { id: id || undefined, email, name: name || null });
      setStatus('success');
      setTimeout(() => router.push('/'), 800);
    }
  }, [searchParams, login, router]);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && status === 'idle') {
      router.push('/');
    }
  }, [isAuthenticated, status, router]);

  const apiUrl = getApiUrl();

  return (
    <div className='mesh-bg relative flex min-h-screen items-center justify-center px-5'>
      <div className='relative z-10 w-full max-w-sm'>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='mb-10 text-center'
        >
          <Link href='/landing' className='inline-block'>
            <h1 className='font-heading text-3xl font-extrabold tracking-tight text-text-primary'>
              Buddy<span className='text-amber'>Bills</span>
            </h1>
          </Link>
          <div className='mx-auto mt-2 h-0.5 w-8 rounded-full bg-amber/50' />
          <p className='mt-4 text-sm text-text-secondary'>
            Sign in to manage your shared expenses
          </p>
        </motion.div>

        {/* Success state */}
        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className='glass-card-elevated p-8 text-center'
          >
            <div className='mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15'>
              <svg
                width='28'
                height='28'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2.5}
                className='text-success'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <polyline points='20 6 9 17 4 12' />
              </svg>
            </div>
            <p className='font-heading text-lg font-bold text-text-primary'>
              Welcome back!
            </p>
            <p className='mt-1 text-sm text-text-secondary'>Redirecting...</p>
          </motion.div>
        ) : (
          /* Card */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className='glass-card-elevated relative overflow-hidden p-6'
          >
            {/* Background glow */}
            <div className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber/6 blur-3xl' />
            <div className='pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[#7C6ADB]/4 blur-3xl' />

            <div className='relative space-y-4'>
              {/* Social Login Buttons */}
              <div className='space-y-3'>
                <motion.a
                  href={`${apiUrl}/auth/google`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className='flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-white py-3.5 text-sm font-semibold text-[#1f1f1f] shadow-sm transition-colors hover:bg-gray-100'
                >
                  <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
                    <path
                      d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z'
                      fill='#4285F4'
                    />
                    <path
                      d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                      fill='#34A853'
                    />
                    <path
                      d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                      fill='#FBBC05'
                    />
                    <path
                      d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                      fill='#EA4335'
                    />
                  </svg>
                  Continue with Google
                </motion.a>

                <motion.a
                  href={`${apiUrl}/auth/github`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className='flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#24292f] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1b1f23]'
                >
                  <svg
                    width='18'
                    height='18'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                  >
                    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                  </svg>
                  Continue with GitHub
                </motion.a>
              </div>

              {/* Divider */}
              <div className='flex items-center gap-3 pt-1'>
                <div className='h-px flex-1 bg-subtle' />
                <span className='text-[10px] font-medium tracking-wider text-text-tertiary uppercase'>
                  or
                </span>
                <div className='h-px flex-1 bg-subtle' />
              </div>

              {/* Email/Mobile — Coming Soon */}
              <div className='relative'>
                <div className='pointer-events-none opacity-40 select-none'>
                  <div className='space-y-3'>
                    <div>
                      <label className='mb-1.5 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                        Mobile / Email
                      </label>
                      <div className='relative'>
                        <div className='absolute top-1/2 left-3.5 -translate-y-1/2 text-text-tertiary'>
                          <svg
                            width='16'
                            height='16'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth={2}
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          >
                            <rect width='20' height='16' x='2' y='4' rx='2' />
                            <path d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' />
                          </svg>
                        </div>
                        <input
                          type='text'
                          disabled
                          placeholder='you@email.com or +91 98765...'
                          className='w-full cursor-not-allowed rounded-xl border border-subtle bg-deep/60 py-3 pr-4 pl-10 text-sm font-medium text-text-primary outline-none placeholder:text-text-tertiary'
                        />
                      </div>
                    </div>
                    <button
                      disabled
                      className='w-full cursor-not-allowed rounded-xl bg-amber/80 py-3 font-heading text-sm font-bold text-deep'
                    >
                      Send OTP
                    </button>
                  </div>
                </div>

                {/* Coming Soon badge */}
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='rounded-full border border-subtle bg-elevated px-4 py-1.5 backdrop-blur-sm'>
                    <span className='text-xs font-semibold text-text-secondary'>
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className='mt-6 text-center text-[11px] text-text-tertiary'
        >
          By continuing, you agree to BuddyBills&apos; Terms &amp; Privacy
          Policy.
        </motion.p>
      </div>
    </div>
  );
}
