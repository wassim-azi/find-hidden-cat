import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ModalSheet } from '../../components/Modals/ModalSheet';
import { TactileButton } from '../../components/Buttons/TactileButton';
import { CatIllustration } from '../../components/Cat/CatIllustration';

interface TutorialScreenProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    badge: 'Rule 1 of 3',
    title: 'One Cat per Color',
    subtitle: 'Each colored area hides exactly one cat. Mark the rest with ×!',
    demo: 'region' as const,
  },
  {
    badge: 'Rule 2 of 3',
    title: 'One per Row & Column',
    subtitle: 'No two cats can share the same horizontal row or vertical column.',
    demo: 'rowCol' as const,
  },
  {
    badge: 'Rule 3 of 3',
    title: 'Cats Never Touch',
    subtitle: 'Cats love space! Keep all 8 surrounding tiles clear — even diagonally.',
    demo: 'adjacent' as const,
  },
];

const AnimatedRuleDemo: React.FC<{ demo: 'region' | 'rowCol' | 'adjacent' }> = ({
  demo,
}) => {
  // 4x4 animated visual grid for instant comprehension
  const regionColors = [
    '#E8C158', '#E8C158', '#E87E8E', '#E87E8E',
    '#E8C158', '#86B4D0', '#E87E8E', '#79AE8D',
    '#86B4D0', '#86B4D0', '#79AE8D', '#79AE8D',
    '#86B4D0', '#9B86D4', '#9B86D4', '#79AE8D',
  ];

  const catIndex = demo === 'region' ? 0 : demo === 'rowCol' ? 5 : 5;

  const isMarkedX = (idx: number): boolean => {
    const r = Math.floor(idx / 4);
    const c = idx % 4;
    const cr = Math.floor(catIndex / 4);
    const cc = catIndex % 4;
    if (idx === catIndex) return false;

    if (demo === 'region') {
      return regionColors[idx] === regionColors[catIndex];
    }
    if (demo === 'rowCol') {
      return r === cr || c === cc;
    }
    // adjacent
    return Math.abs(r - cr) <= 1 && Math.abs(c - cc) <= 1;
  };

  const isHighlighted = (idx: number): boolean => {
    return idx === catIndex || isMarkedX(idx);
  };

  return (
    <div className="w-[196px] h-[196px] mx-auto bg-white p-2 rounded-[20px] border border-[#EAE0D2] shadow-[0_8px_20px_rgba(92,69,52,0.08)]">
      <div className="grid grid-cols-4 grid-rows-4 gap-1.5 w-full h-full">
        {regionColors.map((bg, idx) => {
          const isCat = idx === catIndex;
          const showX = isMarkedX(idx);
          const lit = isHighlighted(idx);

          return (
            <motion.div
              key={`${demo}-${idx}`}
              initial={{ opacity: 0.4, scale: 0.92 }}
              animate={{ opacity: lit ? 1 : 0.34, scale: 1 }}
              transition={{ duration: 0.25, delay: showX ? 0.16 + (idx % 4) * 0.04 : 0 }}
              style={{ backgroundColor: bg }}
              className={`rounded-[9px] flex items-center justify-center relative ${
                lit ? 'ring-2 ring-white shadow-xs' : ''
              }`}
            >
              {isCat && (
                <motion.div
                  initial={{ scale: 0.4, y: 6 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                  className="w-[86%] h-[86%]"
                >
                  <CatIllustration breed="tuxedo" mood="happy" className="w-full h-full" />
                </motion.div>
              )}
              {showX && (
                <motion.svg
                  viewBox="0 0 40 40"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 20,
                    delay: 0.22 + idx * 0.03,
                  }}
                  className="w-[54%] h-[54%]"
                >
                  <path
                    d="M10 10 L30 30 M30 10 L10 30"
                    stroke="#FFFFFF"
                    strokeWidth="7.5"
                    strokeLinecap="round"
                  />
                </motion.svg>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export const TutorialScreen: React.FC<TutorialScreenProps> = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  return (
    <ModalSheet open={open} onClose={handleClose} ariaLabel="How to play Meowdoku">
      <div className="p-5 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#FF7A7A] bg-[#FFF0F0] px-2.5 py-1 rounded-full">
            {current.badge}
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close tutorial"
            className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer active:scale-92"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Animated Demo & Copy */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center"
          >
            <AnimatedRuleDemo demo={current.demo} />

            <h2 className="text-[21px] font-black text-[#3A312C] mt-4 tracking-tight">
              {current.title}
            </h2>
            <p className="text-[13.5px] font-semibold text-[#7E7067] mt-1.5 leading-snug max-w-[270px]">
              {current.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Quick controls tip */}
        <div className="mt-4 rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] px-3 py-2 text-center text-[11.5px] font-bold text-[#6E6057]">
          Tap a tile to select, tap again to place a cat. Toggle <span className="text-[#3A312C] font-black">Mark ×</span> to eliminate spots!
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 my-4">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setStep(idx)}
              aria-label={`Step ${idx + 1}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === step ? 'w-6 bg-[#FF7A7A]' : 'w-2 bg-[#E3D8C8]'
              }`}
            />
          ))}
        </div>

        {/* Footer nav */}
        <div className="flex items-center gap-2.5">
          {step > 0 && (
            <TactileButton
              variant="secondary"
              size="md"
              onClick={() => setStep((s) => s - 1)}
              className="px-3.5"
              ariaLabel="Previous rule"
            >
              <ChevronLeft className="w-4 h-4" />
            </TactileButton>
          )}
          {step < STEPS.length - 1 ? (
            <TactileButton
              id="btn-tutorial-next"
              variant="primary"
              fullWidth
              onClick={() => setStep((s) => s + 1)}
            >
              Next Rule
              <ChevronRight className="w-4 h-4" />
            </TactileButton>
          ) : (
            <TactileButton
              id="btn-tutorial-done"
              variant="primary"
              fullWidth
              onClick={handleClose}
            >
              Got It, Let&apos;s Play!
            </TactileButton>
          )}
        </div>
      </div>
    </ModalSheet>
  );
};
