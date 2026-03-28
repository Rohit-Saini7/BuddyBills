'use client';

import React from 'react';

interface AmountDisplayProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  className?: string;
}

export function AmountDisplay({
  amount,
  currency = '₹',
  size = 'md',
  showSign = false,
  className = '',
}: AmountDisplayProps) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const colorClass = showSign
    ? isPositive
      ? 'text-success'
      : isNegative
        ? 'text-danger'
        : 'text-amber'
    : 'text-white';

  const glowClass = isPositive ? '' : isNegative ? '' : 'amber-text-glow';

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl font-bold',
  };

  const sign = showSign ? (isPositive ? '+' : isNegative ? '-' : '') : '';

  return (
    <span
      className={`font-heading font-semibold tracking-tight tabular-nums ${colorClass} ${glowClass} ${sizeClasses[size]} ${className}`}
    >
      {sign}
      <span className='mr-0.5 text-adaptive-sm opacity-70'>{currency}</span>
      {absAmount.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}
