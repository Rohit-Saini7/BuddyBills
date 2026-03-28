'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const FEATURES = [
  {
    icon: (
      <svg
        width='28'
        height='28'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={1.6}
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z' />
        <path d='M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' />
      </svg>
    ),
    title: 'Works Offline',
    desc: 'Add expenses on a mountain top or underground metro. Zero internet required.',
  },
  {
    icon: (
      <svg
        width='28'
        height='28'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={1.6}
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z' />
      </svg>
    ),
    title: 'Instant UI',
    desc: 'Every tap is instant. No spinners, no waiting. The network is invisible.',
  },
  {
    icon: (
      <svg
        width='28'
        height='28'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={1.6}
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
        <circle cx='9' cy='7' r='4' />
        <path d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
      </svg>
    ),
    title: 'Fair Splits',
    desc: 'Equal or custom splits. Everyone sees their share in real-time.',
  },
  {
    icon: (
      <svg
        width='28'
        height='28'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={1.6}
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
        <path d='M7 11V7a5 5 0 0 1 10 0v4' />
      </svg>
    ),
    title: 'Your Data, Your Server',
    desc: '100% self-hosted. No Firebase, no vendor lock-in. You own everything.',
  },
];

const STEPS = [
  { num: '01', title: 'Create a group', desc: 'Name it. Add your friends.' },
  { num: '02', title: 'Track expenses', desc: 'Who paid? How much? Done.' },
  { num: '03', title: 'Settle up', desc: 'See who owes what. Square it.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <div className='mesh-bg relative min-h-screen overflow-x-hidden'>
      <div className='relative z-10'>
        {/* ─── Navbar ─── */}
        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='mx-auto flex max-w-5xl items-center justify-between px-6 py-5'
        >
          <div className='font-heading text-xl font-bold tracking-tight text-text-primary'>
            Buddy<span className='text-amber'>Bills</span>
          </div>
          <div className='flex items-center gap-3'>
            <Link
              href='/login'
              className='px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary'
            >
              Log in
            </Link>
            <Link
              href='/login'
              className='amber-glow-subtle rounded-xl bg-amber px-5 py-2.5 text-sm font-semibold text-deep transition-colors hover:bg-amber/90'
            >
              Get Started
            </Link>
          </div>
        </motion.nav>

        {/* ─── Hero Section ─── */}
        <section className='mx-auto max-w-3xl px-6 pt-16 pb-24 text-center'>
          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className='mb-8 inline-flex items-center gap-2 rounded-full border border-amber/20 bg-amber/10 px-4 py-1.5'
          >
            <div className='h-1.5 w-1.5 animate-pulse rounded-full bg-amber' />
            <span className='text-xs font-medium text-amber'>
              Offline-First • Open Source
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.6,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className='font-heading text-4xl leading-[1.1] font-extrabold tracking-tight text-text-primary sm:text-5xl md:text-6xl'
          >
            Split expenses.
            <br />
            <span className='amber-text-glow text-amber'>Not friendships.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className='mx-auto mt-6 max-w-md text-base leading-relaxed text-text-secondary sm:text-lg'
          >
            Track group expenses, settle debts instantly, and never argue about
            money again. Works 100% offline — your data stays yours.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className='mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row'
          >
            <Link
              href='/login'
              className='amber-glow w-full rounded-2xl bg-linear-to-r from-amber to-[#E8942A] px-8 py-3.5 text-center font-heading text-base font-bold text-deep shadow-lg transition-all hover:shadow-xl sm:w-auto'
            >
              Start Splitting Free
            </Link>
            <a
              href='#how-it-works'
              className='w-full rounded-2xl border border-subtle px-8 py-3.5 text-center text-sm font-medium text-text-secondary transition-all hover:border-text-tertiary hover:text-text-primary sm:w-auto'
            >
              See How It Works ↓
            </a>
          </motion.div>

          {/* Floating phone mockup preview */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.8,
              duration: 0.7,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className='relative mx-auto mt-16 max-w-[320px]'
          >
            {/* Glow behind the phone */}
            <div className='pointer-events-none absolute inset-0 scale-150 rounded-full bg-amber/10 blur-3xl' />

            <div className='glass-card-elevated relative rounded-3xl! border border-amber/10 p-4'>
              {/* Mini dashboard preview */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='font-heading text-sm font-bold text-text-primary'>
                    Buddy<span className='text-amber'>Bills</span>
                  </div>
                  <div className='h-6 w-6 rounded-full border border-amber/20 bg-amber/15' />
                </div>

                {/* Mini balance card */}
                <div className='rounded-xl border border-amber/10 bg-amber/5 p-3'>
                  <p className='text-[9px] tracking-widest text-text-tertiary uppercase'>
                    Net Balance
                  </p>
                  <p className='mt-0.5 font-heading text-xl font-bold text-success'>
                    <span className='text-[0.6em] opacity-60'>₹</span>2,340
                  </p>
                  <div className='mt-2 flex gap-4 border-t border-subtle pt-2'>
                    <div>
                      <p className='text-[8px] text-text-tertiary'>Owed</p>
                      <p className='text-xs font-semibold text-success'>
                        ₹4,200
                      </p>
                    </div>
                    <div>
                      <p className='text-[8px] text-text-tertiary'>Owe</p>
                      <p className='text-xs font-semibold text-danger'>
                        ₹1,860
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mini group cards */}
                {['Goa Trip 🏖️', 'Flat Expenses 🏠'].map((name, i) => (
                  <div
                    key={name}
                    className='glass-card flex items-center justify-between rounded-xl! p-2.5!'
                  >
                    <div>
                      <p className='text-xs font-semibold text-text-primary'>
                        {name}
                      </p>
                      <div className='mt-1 flex -space-x-1'>
                        {[0, 1, 2].map((j) => (
                          <div
                            key={j}
                            className='h-4 w-4 rounded-full border border-deep bg-elevated'
                            style={{
                              backgroundColor:
                                ['#F5A623', '#2DD4A8', '#7C6ADB'][j] + '33',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <p
                      className={`font-heading text-xs font-semibold ${i === 0 ? 'text-success' : 'text-danger'}`}
                    >
                      {i === 0 ? '+₹2,340' : '-₹1,450'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── Features Grid ─── */}
        <section className='mx-auto max-w-4xl px-6 py-20'>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            className='mb-14 text-center'
          >
            <h2 className='font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl'>
              Built for <span className='text-amber'>real life</span>
            </h2>
            <p className='mx-auto mt-3 max-w-md text-sm text-text-secondary'>
              No flaky internet at the restaurant? No problem. BuddyBills was
              designed to work anywhere.
            </p>
          </motion.div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial='hidden'
                whileInView='visible'
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                className='glass-card group p-5 transition-transform duration-200 hover:-translate-y-0.5'
              >
                <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber/12 bg-amber/8 text-amber transition-colors group-hover:border-amber/25 group-hover:bg-amber/15'>
                  {feature.icon}
                </div>
                <h3 className='mb-1.5 font-heading text-base font-semibold text-text-primary'>
                  {feature.title}
                </h3>
                <p className='text-sm leading-relaxed text-text-secondary'>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section id='how-it-works' className='mx-auto max-w-3xl px-6 py-20'>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            className='mb-14 text-center'
          >
            <h2 className='font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl'>
              Three steps. <span className='text-amber'>That&apos;s it.</span>
            </h2>
          </motion.div>

          <div className='space-y-6'>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                initial='hidden'
                whileInView='visible'
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                className='glass-card flex items-start gap-5 p-5'
              >
                <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10'>
                  <span className='font-heading text-lg font-bold text-amber'>
                    {step.num}
                  </span>
                </div>
                <div>
                  <h3 className='font-heading text-base font-semibold text-text-primary'>
                    {step.title}
                  </h3>
                  <p className='mt-1 text-sm text-text-secondary'>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── CTA Section ─── */}
        <section className='px-6 py-20'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className='glass-card-elevated relative mx-auto max-w-lg overflow-hidden p-8 text-center sm:p-12'
          >
            {/* Background glow */}
            <div className='pointer-events-none absolute top-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-amber/8 blur-3xl' />

            <div className='relative'>
              <h2 className='font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl'>
                Ready to stop the
                <br />
                <span className='amber-text-glow text-amber'>
                  &ldquo;who paid what?&rdquo;
                </span>
                <br />
                conversations?
              </h2>
              <p className='mt-4 mb-8 text-sm text-text-secondary'>
                Join BuddyBills. It&apos;s free, offline-first, and respects
                your privacy.
              </p>
              <Link
                href='/login'
                className='amber-glow inline-block rounded-2xl bg-linear-to-r from-amber to-[#E8942A] px-10 py-3.5 font-heading text-base font-bold text-deep shadow-lg transition-all hover:shadow-xl'
              >
                Get Started — It&apos;s Free
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ─── Footer ─── */}
        <footer className='border-t border-subtle px-6 py-8'>
          <div className='mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row'>
            <div className='font-heading text-sm font-bold text-text-tertiary'>
              Buddy<span className='text-amber/50'>Bills</span>
            </div>
            <p className='text-xs text-text-tertiary'>
              100% open source · Self-hosted · No tracking
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
