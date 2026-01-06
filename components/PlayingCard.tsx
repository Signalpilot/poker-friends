'use client';

import { Card, getSuitSymbol, getSuitColor } from '@/lib/poker';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PlayingCard({ 
  card, 
  faceDown = false, 
  size = 'md',
  className = '' 
}: PlayingCardProps) {
  const sizeClasses = {
    sm: 'w-10 h-14 text-sm',
    md: 'w-14 h-20 text-lg',
    lg: 'w-20 h-28 text-2xl'
  };

  if (faceDown || !card) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-lg shadow-lg card-shadow ${className}`}
        style={{
          background: 'repeating-linear-gradient(45deg, #1e40af, #1e40af 5px, #1e3a8a 5px, #1e3a8a 10px)',
          border: '2px solid #1e3a8a'
        }}
      />
    );
  }

  const symbol = getSuitSymbol(card.suit);
  const colorClass = getSuitColor(card.suit);

  return (
    <div 
      className={`${sizeClasses[size]} bg-white rounded-lg shadow-lg card-shadow flex flex-col items-center justify-center relative ${className}`}
      style={{ border: '1px solid #ddd' }}
    >
      {/* Top left */}
      <div className={`absolute top-1 left-1.5 ${colorClass} font-bold leading-none`}>
        <div className="text-center" style={{ fontSize: size === 'sm' ? '0.6rem' : size === 'md' ? '0.75rem' : '1rem' }}>
          {card.rank}
        </div>
        <div className="text-center" style={{ fontSize: size === 'sm' ? '0.5rem' : size === 'md' ? '0.65rem' : '0.9rem' }}>
          {symbol}
        </div>
      </div>
      
      {/* Center */}
      <div className={`${colorClass} font-bold`} style={{ fontSize: size === 'sm' ? '1.2rem' : size === 'md' ? '1.8rem' : '2.5rem' }}>
        {symbol}
      </div>
      
      {/* Bottom right (rotated) */}
      <div className={`absolute bottom-1 right-1.5 ${colorClass} font-bold leading-none rotate-180`}>
        <div className="text-center" style={{ fontSize: size === 'sm' ? '0.6rem' : size === 'md' ? '0.75rem' : '1rem' }}>
          {card.rank}
        </div>
        <div className="text-center" style={{ fontSize: size === 'sm' ? '0.5rem' : size === 'md' ? '0.65rem' : '0.9rem' }}>
          {symbol}
        </div>
      </div>
    </div>
  );
}
