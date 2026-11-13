import React from 'react';

interface StampProps {
  label: string;
  type?: 'red' | 'green' | 'amber' | 'blue';
  rotation?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Stamp: React.FC<StampProps> = ({
  label,
  type = 'red',
  rotation = -3,
  size = 'md',
  className = '',
}) => {
  const colorStyles = {
    red: 'border-[#B4473E] text-[#B4473E] shadow-[0_0_1px_rgba(180,71,62,0.3)]',
    green: 'border-[#78966A] text-[#78966A] shadow-[0_0_1px_rgba(120,150,106,0.3)]',
    amber: 'border-[#C49A61] text-[#C49A61] shadow-[0_0_1px_rgba(196,154,97,0.3)]',
    blue: 'border-[#4EA8A1] text-[#4EA8A1] shadow-[0_0_1px_rgba(78,168,161,0.3)]',
  }[type];

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 border-[1.5px]',
    md: 'text-xs sm:text-sm px-3 py-1 border-2',
    lg: 'text-base sm:text-lg px-4 py-1.5 border-[2.5px]',
  }[size];

  return (
    <div
      style={{ transform: `rotate(${rotation}deg)` }}
      className={`inline-block font-typewriter font-bold tracking-[0.2em] uppercase rounded-sm select-none opacity-90 transition-transform ${colorStyles} ${sizeStyles} ${className}`}
    >
      {label}
    </div>
  );
};
