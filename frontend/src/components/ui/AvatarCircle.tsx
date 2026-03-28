'use client';

import React from 'react';

interface AvatarCircleProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AVATAR_COLORS = [
  'bg-linear-to-br from-[#F5A623] to-[#D97706] text-white shadow-xs',
  'bg-linear-to-br from-[#2DD4A8] to-[#0D9488] text-white shadow-xs',
  'bg-linear-to-br from-[#F45B69] to-[#E11D48] text-white shadow-xs',
  'bg-linear-to-br from-[#7C6ADB] to-[#5B49C4] text-white shadow-xs',
  'bg-linear-to-br from-[#3B82F6] to-[#1D4ED8] text-white shadow-xs',
  'bg-linear-to-br from-[#EC4899] to-[#BE185D] text-white shadow-xs',
  'bg-linear-to-br from-[#14B8A6] to-[#0F766E] text-white shadow-xs',
  'bg-linear-to-br from-[#F97316] to-[#C2410C] text-white shadow-xs',
  'bg-linear-to-br from-[#6366F1] to-[#4338CA] text-white shadow-xs',
  'bg-linear-to-br from-[#10B981] to-[#047857] text-white shadow-xs',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AvatarCircle({
  name,
  size = 'md',
  className = '',
}: AvatarCircleProps) {
  const colorIdx = hashName(name) % AVATAR_COLORS.length;
  const colorClass = AVATAR_COLORS[colorIdx];
  const initials = getInitials(name);

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-heading font-semibold ring-1 ring-white/10 select-none ring-inset ${colorClass} ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ names, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = names.slice(0, max);
  const remaining = names.length - max;

  return (
    <div className='flex -space-x-2'>
      {visible.map((name, index) => (
        <AvatarCircle
          key={name + index}
          name={name}
          size={size}
          className='ring-2 ring-deep'
        />
      ))}
      {remaining > 0 && (
        <div
          className={`inline-flex items-center justify-center rounded-full bg-elevated font-medium text-text-secondary ring-2 ring-deep ${
            size === 'sm'
              ? 'h-7 w-7 text-[10px]'
              : size === 'md'
                ? 'h-9 w-9 text-xs'
                : 'h-12 w-12 text-sm'
          }`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
