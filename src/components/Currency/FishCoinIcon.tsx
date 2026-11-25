import React from 'react';

interface FishCoinIconProps {
  className?: string;
}

/**
 * Custom golden-coral Fish Coin emblem for the Meowdoku economy.
 */
export const FishCoinIcon: React.FC<FishCoinIconProps> = React.memo(
  ({ className = 'w-5 h-5' }) => (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="fish-coin-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE68A" />
          <stop offset="55%" stopColor="#F5BA3B" />
          <stop offset="100%" stopColor="#E09122" />
        </linearGradient>
      </defs>
      <circle
        cx="18"
        cy="18"
        r="16"
        fill="url(#fish-coin-gold)"
        stroke="#C77B14"
        strokeWidth="2"
      />
      <circle
        cx="18"
        cy="18"
        r="12.5"
        fill="none"
        stroke="#FFF6CE"
        strokeWidth="1.2"
        opacity="0.7"
      />
      {/* Cute plump fish silhouette inside coin */}
      <path
        d="M25.5 18 C23.5 13.5 17 12.2 13 15.2 L9.5 12.5 L10.5 18 L9.5 23.5 L13 20.8 C17 23.8 23.5 22.5 25.5 18 Z"
        fill="#FFFDF5"
      />
      <circle cx="21" cy="17.2" r="1.3" fill="#C77B14" />
    </svg>
  )
);

FishCoinIcon.displayName = 'FishCoinIcon';

interface FishCoinPillProps {
  coins: number;
  onClick?: () => void;
  compact?: boolean;
}

export const FishCoinPill: React.FC<FishCoinPillProps> = ({
  coins,
  onClick,
  compact = false,
}) => {
  const inner = (
    <span
      className={`inline-flex items-center gap-1.5 bg-white/95 border border-[#ECDAB8] rounded-full shadow-[0_2px_8px_rgba(92,69,52,0.08)] ${
        compact ? 'px-2 py-0.5' : 'px-2.5 py-1'
      }`}
    >
      <FishCoinIcon className={compact ? 'w-4 h-4' : 'w-4.5 h-4.5'} />
      <span
        className={`font-black text-[#6B4812] tabular-nums leading-none ${
          compact ? 'text-[12px]' : 'text-[13px]'
        }`}
      >
        {coins}
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${coins} Fish Coins. Tap to open shop`}
        className="cursor-pointer active:scale-94 transition-transform"
      >
        {inner}
      </button>
    );
  }

  return inner;
};
