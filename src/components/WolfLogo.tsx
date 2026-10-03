import React from 'react';

interface WolfLogoProps {
  className?: string;
}

export const WolfLogo: React.FC<WolfLogoProps> = ({ className = 'w-5 h-5' }) => {
  return (
    <img
      src="/wolf_logo.png"
      alt="AEGIS Wolf Emblem"
      className={`${className} object-contain select-none pointer-events-none drop-shadow-sm`}
    />
  );
};
