import React from 'react';
import { CatIllustration } from './CatIllustration';

interface MeowdokuLogoProps {
  compact?: boolean;
  iconOnly?: boolean;
}

export const MeowdokuLogo: React.FC<MeowdokuLogoProps> = ({
  compact = false,
  iconOnly = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 select-none">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FFE4B5] to-[#FFB5B5] flex items-center justify-center shadow-xs border border-white/80 shrink-0">
          <CatIllustration breed="tuxedo" className="w-7 h-7" />
        </div>
        {!iconOnly && (
          <span className="hidden min-[360px]:inline font-black tracking-tight text-[#3A312C] text-[16px] leading-none whitespace-nowrap">
            Meow<span className="text-[#D94D58]">doku</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center select-none">
      <h1 className="font-black text-[38px] sm:text-[42px] tracking-tight leading-none text-[#3A312C]">
        Meow<span className="text-[#D94D58]">doku</span>
      </h1>
    </div>
  );
};
