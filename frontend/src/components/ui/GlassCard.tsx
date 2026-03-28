'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'amber';
  hover?: boolean;
  delay?: number;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = '',
  variant = 'default',
  hover = true,
  delay = 0,
  onClick,
}: GlassCardProps) {
  const base =
    variant === 'amber'
      ? 'glass-card border-amber/10 bg-amber-dim/30'
      : variant === 'elevated'
        ? 'glass-card-elevated'
        : 'glass-card';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`${base} p-4 ${hover ? 'transition-transform duration-200 hover:-translate-y-0.5' : ''} ${onClick ? 'active:scale-[0.98]' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </motion.div>
  );
}
