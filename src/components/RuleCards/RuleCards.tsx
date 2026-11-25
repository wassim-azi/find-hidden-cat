import React from 'react';
import { motion } from 'framer-motion';
import { RuleViolationType } from '../../game/gameTypes';

interface RuleCardsProps {
  violatedRules: Set<RuleViolationType>;
  onOpenTutorial: () => void;
}

/** Tiny 3x3 visual icons matching the Meowdoku rule card aesthetics */
const RuleMiniIcon: React.FC<{ variant: RuleViolationType }> = ({ variant }) => {
  if (variant === 'region') {
    // One colored L-region with 1 cat & X marks
    const colors = [
      '#E8C158', '#E8C158', '#E8C158',
      '#E8C158', '#E87E8E', '#86B4D0',
      '#79AE8D', '#E87E8E', '#86B4D0',
    ];
    return (
      <div className="grid grid-cols-3 gap-[1.5px] w-7 h-7 shrink-0 rounded-md p-[1.5px] bg-[#EFE7DA]">
        {colors.map((bg, i) => (
          <div
            key={i}
            className="rounded-[2px] flex items-center justify-center text-[6px] font-black text-white leading-none"
            style={{ backgroundColor: bg }}
          >
            {i === 0 ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E2930]" />
            ) : i === 1 || i === 2 || i === 3 ? (
              '×'
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'rowCol') {
    // Center cat eliminating its row and column
    return (
      <div className="grid grid-cols-3 gap-[1.5px] w-7 h-7 shrink-0 rounded-md p-[1.5px] bg-[#EFE7DA]">
        {Array.from({ length: 9 }, (_, i) => {
          const isCenter = i === 4;
          const isCross = i === 1 || i === 3 || i === 5 || i === 7;
          return (
            <div
              key={i}
              className="rounded-[2px] flex items-center justify-center text-[6.5px] font-black leading-none"
              style={{
                backgroundColor: isCenter ? '#E87E8E' : isCross ? '#E8A89A' : '#DFD4C4',
                color: '#FFFFFF',
              }}
            >
              {isCenter ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E2930]" />
              ) : isCross ? (
                '×'
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  // Adjacent / No touching: center cat surrounded by 8 X's
  return (
    <div className="grid grid-cols-3 gap-[1.5px] w-7 h-7 shrink-0 rounded-md p-[1.5px] bg-[#EFE7DA]">
      {Array.from({ length: 9 }, (_, i) => {
        const isCenter = i === 4;
        return (
          <div
            key={i}
            className="rounded-[2px] flex items-center justify-center text-[6px] font-black leading-none"
            style={{
              backgroundColor: isCenter ? '#86B4D0' : '#C8B8A6',
              color: '#FFFFFF',
            }}
          >
            {isCenter ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E2930]" />
            ) : (
              '×'
            )}
          </div>
        );
      })}
    </div>
  );
};

const RULES: readonly { id: RuleViolationType; label: string }[] = [
  { id: 'region', label: '1 cat per color' },
  { id: 'rowCol', label: '1 per row & col' },
  { id: 'adjacent', label: 'Cats never touch' },
];

export const RuleCards: React.FC<RuleCardsProps> = ({
  violatedRules,
  onOpenTutorial,
}) => {
  return (
    <div className="px-3.5 py-1 shrink-0">
      <button
        id="btn-rules-bar"
        type="button"
        onClick={onOpenTutorial}
        aria-label="View how to play rules"
        className="w-full meow-card rounded-2xl p-1.5 grid grid-cols-3 gap-1.5 text-left cursor-pointer active:scale-[0.99] transition-transform"
      >
        {RULES.map((rule) => {
          const isViolated = violatedRules.has(rule.id);
          return (
            <motion.div
              key={rule.id}
              animate={
                isViolated
                  ? { scale: [1, 1.04, 1], backgroundColor: '#FFF0F0' }
                  : { scale: 1, backgroundColor: '#FAF5EC' }
              }
              transition={{ duration: 0.28 }}
              className={`
                flex items-center gap-1.5 px-1.5 py-1.5 rounded-xl border transition-colors
                ${
                  isViolated
                    ? 'border-[#F27979] shadow-[0_0_0_2px_rgba(242,121,121,0.18)]'
                    : 'border-transparent'
                }
              `}
            >
              <RuleMiniIcon variant={rule.id} />
              <span
                className={`text-[10px] sm:text-[10.5px] font-extrabold leading-[1.15] tracking-tight ${
                  isViolated ? 'text-[#C84444]' : 'text-[#5A4E47]'
                }`}
              >
                {rule.label}
              </span>
            </motion.div>
          );
        })}
      </button>
    </div>
  );
};
