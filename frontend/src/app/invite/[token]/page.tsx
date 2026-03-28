'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, getApiUrl } from '@/components/providers/AuthProvider';
import Link from 'next/link';

interface InviteInfo {
  groupName: string;
  description: string | null;
  status: 'valid' | 'expired' | 'used';
  expired: boolean;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const { isAuthenticated, token: authToken, loading: authLoading } = useAuth();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(true);

  const apiUrl = getApiUrl();

  // Fetch invite info (public endpoint)
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${apiUrl}/invites/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.message || 'Invite not found');
          return;
        }
        const data = await res.json();
        setInviteInfo(data);
      } catch {
        setError('Failed to load invite');
      } finally {
        setFetchingInfo(false);
      }
    };
    fetchInfo();
  }, [token, apiUrl]);

  const handleAccept = async () => {
    if (!isAuthenticated || !authToken) {
      // Redirect to login with return URL
      router.push(`/login?returnTo=/invite/${token}`);
      return;
    }

    setAccepting(true);
    try {
      const res = await fetch(`${apiUrl}/invites/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Failed to accept invite');
        return;
      }

      const data = await res.json();
      setAccepted(true);

      // Redirect to the group after a moment
      setTimeout(() => {
        router.push(`/group/${data.groupId}`);
      }, 1200);
    } catch {
      setError('Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

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
          <Link href='/' className='inline-block'>
            <h1 className='font-heading text-3xl font-extrabold tracking-tight text-text-primary'>
              Buddy<span className='text-amber'>Bills</span>
            </h1>
          </Link>
          <div className='mx-auto mt-2 h-0.5 w-8 rounded-full bg-amber/50' />
        </motion.div>

        {/* Loading */}
        {fetchingInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='glass-card-elevated p-8 text-center'
          >
            <div className='mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-amber/30 border-t-amber' />
            <p className='text-sm text-text-secondary'>Loading invite...</p>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='glass-card-elevated p-8 text-center'
          >
            <div className='mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/15'>
              <svg
                width='28'
                height='28'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                className='text-danger'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <line x1='18' y1='6' x2='6' y2='18' />
                <line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </div>
            <p className='mb-1 font-heading font-semibold text-text-primary'>
              {error}
            </p>
            <p className='text-xs text-text-secondary'>
              This invite may be invalid or expired.
            </p>
            <Link
              href='/'
              className='mt-4 inline-block text-sm font-medium text-amber underline'
            >
              Go to Dashboard
            </Link>
          </motion.div>
        )}

        {/* Accepted */}
        {accepted && (
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
              You&apos;re in!
            </p>
            <p className='mt-1 text-sm text-text-secondary'>
              Redirecting to the group...
            </p>
          </motion.div>
        )}

        {/* Invite Info */}
        {inviteInfo && !error && !accepted && !fetchingInfo && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className='glass-card-elevated relative overflow-hidden p-6'
          >
            {/* Background glow */}
            <div className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber/6 blur-3xl' />

            <div className='relative text-center'>
              <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber/10'>
                <svg
                  width='32'
                  height='32'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={1.5}
                  className='text-amber'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                  <circle cx='9' cy='7' r='4' />
                  <line x1='19' y1='8' x2='19' y2='14' />
                  <line x1='22' y1='11' x2='16' y2='11' />
                </svg>
              </div>

              <p className='mb-1 text-xs tracking-wider text-text-tertiary uppercase'>
                You&apos;re invited to join
              </p>
              <h2 className='mb-1 font-heading text-xl font-bold text-text-primary'>
                {inviteInfo.groupName}
              </h2>
              {inviteInfo.description && (
                <p className='mb-4 text-sm text-text-secondary'>
                  {inviteInfo.description}
                </p>
              )}

              {inviteInfo.status === 'expired' && (
                <div className='mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-2 text-sm text-danger'>
                  This invite has expired
                </div>
              )}

              {inviteInfo.status === 'valid' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAccept}
                  disabled={accepting}
                  className='amber-glow mt-4 w-full rounded-2xl bg-linear-to-r from-amber to-[#E8942A] py-3.5 font-heading text-base font-bold text-deep shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {!isAuthenticated
                    ? 'Sign in to Join'
                    : accepting
                      ? 'Joining...'
                      : 'Join Group'}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
