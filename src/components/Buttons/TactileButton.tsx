import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface TactileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  id?: string;
  type?: 'button' | 'submit';
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-[#FF8787] to-[#F36A6A] text-white shadow-[0_5px_0_#D85252,0_10px_20px_rgba(243,106,106,0.28)] active:shadow-[0_2px_0_#D85252] border border-[#FF9E9E]/50',
  secondary:
    'bg-white text-[#3A312C] shadow-[0_4px_0_#E3D8C8,0_6px_16px_rgba(92,69,52,0.08)] active:shadow-[0_1px_0_#E3D8C8] border border-[#EAE0D2]',
  ghost:
    'bg-[#F4ECE0]/85 text-[#5D5048] hover:bg-[#EDE3D4] border border-transparent',
  danger:
    'bg-gradient-to-b from-[#EE6C6C] to-[#D95353] text-white shadow-[0_4px_0_#B43B3B] active:shadow-[0_1px_0_#B43B3B]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm rounded-2xl',
  md: 'h-12 px-5 text-[15px] rounded-2xl',
  lg: 'h-14 px-7 text-[17px] rounded-[20px]',
};

export const TactileButton: React.FC<TactileButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  ariaLabel,
  id,
  type = 'button',
}) => {
  return (
    <button
      id={id}
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2.5 font-extrabold tracking-tight
        select-none cursor-pointer transition-all duration-100
        active:scale-[0.97] active:translate-y-[2px]
        disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 disabled:active:translate-y-0
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
};
