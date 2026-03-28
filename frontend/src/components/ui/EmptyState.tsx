'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className='flex flex-col items-center justify-center px-8 py-16 text-center'
    >
      {icon && <div className='mb-5 text-text-tertiary'>{icon}</div>}
      <h3 className='mb-2 font-heading text-lg font-semibold text-text-primary'>
        {title}
      </h3>
      <p className='mb-6 max-w-[260px] text-sm leading-relaxed text-text-secondary'>
        {description}
      </p>
      {action &&
        (action.href ? (
          <Link href={action.href}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className='amber-glow-subtle rounded-xl bg-amber px-6 py-2.5 text-sm font-semibold text-deep transition-colors hover:bg-amber/90'
            >
              {action.label}
            </motion.button>
          </Link>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={action.onClick}
            className='amber-glow-subtle rounded-xl bg-amber px-6 py-2.5 text-sm font-semibold text-deep transition-colors hover:bg-amber/90'
          >
            {action.label}
          </motion.button>
        ))}
    </motion.div>
  );
}
