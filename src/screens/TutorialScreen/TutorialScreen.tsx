import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from 'lucide-react';
import { ModalSheet } from '../../components/Modals/ModalSheet';
import { TactileButton } from '../../components/Buttons/TactileButton';
import { CatIllustration } from '../../components/Cat/CatIllustration';
import { getTutorialVoiceScript, tutorialNarrator } from '../../utils/narration';

interface TutorialScreenProps {
  open: boolean;
  onClose: () => void;
  onTryInteractive?: () => void;
}

const STEP_DEMOS = ['region', 'rowCol', 'adjacent'] as const;

const AnimatedRuleDemo: React.FC<{ demo: 'region' | 'rowCol' | 'adjacent' }> = ({
  demo,
}) => {
  const regionColors = [
    '#E8C158', '#E8C158', '#E87E8E', '#E87E8E',
    '#E8C158', '#86B4D0', '#E87E8E', '#79AE8D',
    '#86B4D0', '#86B4D0', '#79AE8D', '#79AE8D',
    '#86B4D0', '#9B86D4', '#9B86D4', '#79AE8D',
  ];

  const catIndex = demo === 'region' ? 0 : 5;

  const isMarkedX = (idx: number): boolean => {
    const r = Math.floor(idx / 4);
    const c = idx % 4;
    const cr = Math.floor(catIndex / 4);
    const cc = catIndex % 4;
    if (idx === catIndex) return false;
    if (demo === 'region') return regionColors[idx] === regionColors[catIndex];
    if (demo === 'rowCol') return r === cr || c === cc;
    return Math.abs(r - cr) <= 1 && Math.abs(c - cc) <= 1;
  };

  const isHighlighted = (idx: number): boolean => idx === catIndex || isMarkedX(idx);

  return (
    <div className="w-[186px] h-[186px] mx-auto bg-white p-2 rounded-[20px] border border-[#EAE0D2] shadow-[0_8px_20px_rgba(92,69,52,0.08)]">
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

export const TutorialScreen: React.FC<TutorialScreenProps> = ({
  open,
  onClose,
  onTryInteractive,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stepNum = step + 1;
  const demo = STEP_DEMOS[step]!;

  useEffect(() => {
    if (!open) {
      tutorialNarrator.stop();
      setIsSpeaking(false);
    }
    return () => {
      tutorialNarrator.stop();
    };
  }, [open]);

  const handleStepChange = (nextStep: number) => {
    tutorialNarrator.stop();
    setIsSpeaking(false);
    setStep(nextStep);
  };

  const handleToggleVoice = () => {
    if (isSpeaking) {
      tutorialNarrator.stop();
      setIsSpeaking(false);
    } else {
      void tutorialNarrator.speakStep(step, setIsSpeaking);
    }
  };

  const handleClose = () => {
    tutorialNarrator.stop();
    setIsSpeaking(false);
    setStep(0);
    onClose();
  };

  return (
    <ModalSheet open={open} onClose={handleClose} ariaLabel={t('tutorial.dialogAria')}>
      <div className="p-5 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#FF7A7A] bg-[#FFF0F0] px-2.5 py-1 rounded-full">
              {t(`tutorial.steps.${stepNum}.badge`)}
            </span>
            <button
              id="btn-tutorial-voice"
              type="button"
              onClick={handleToggleVoice}
              aria-label={isSpeaking ? t('tutorial.stopAria') : t('tutorial.listenAria')}
              className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                isSpeaking
                  ? 'bg-[#6EB58E] text-white'
                  : 'bg-[#FAF2E4] text-[#6E5C4F] hover:bg-[#F2E6D2]'
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  {t('tutorial.stop')}
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  {t('tutorial.listen')}
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label={t('tutorial.closeAria')}
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
            <AnimatedRuleDemo demo={demo} />

            <h2 className="text-[20px] font-black text-[#3A312C] mt-3.5 tracking-tight">
              {t(`tutorial.steps.${stepNum}.title`)}
            </h2>
            <p className="text-[13px] font-semibold text-[#7E7067] mt-1 leading-snug max-w-[275px]">
              {t(`tutorial.steps.${stepNum}.subtitle`)}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Synchronized Live Captions while Voice Guide is speaking */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 overflow-hidden"
            >
              <div
                role="status"
                aria-live="polite"
                className="rounded-2xl bg-[#3A312C] text-white px-3 py-2 text-[11px] font-bold leading-snug text-center shadow-sm"
              >
                <span className="text-[#FFE082] font-black uppercase text-[9.5px] tracking-wider block mb-0.5">
                  {t('tutorial.captionLabel')}
                </span>
                “{getTutorialVoiceScript(step)}”
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick controls tip */}
        <div className="mt-3.5 rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] px-3 py-2 text-center text-[11px] font-bold text-[#6E6057]">
          <Trans
            i18nKey="tutorial.controlsTip"
            components={{ bold: <span className="text-[#3A312C] font-black" /> }}
          />
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 my-3.5">
          {STEP_DEMOS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleStepChange(idx)}
              aria-label={t('tutorial.stepAria', { num: idx + 1 })}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === step ? 'w-6 bg-[#FF7A7A]' : 'w-2 bg-[#E3D8C8]'
              }`}
            />
          ))}
        </div>

        {/* Footer nav */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            {step > 0 && (
              <TactileButton
                variant="secondary"
                size="md"
                onClick={() => handleStepChange(step - 1)}
                className="px-3.5"
                ariaLabel={t('tutorial.prevAria')}
              >
                <ChevronLeft className="w-4 h-4" />
              </TactileButton>
            )}
            {step < STEP_DEMOS.length - 1 ? (
              <TactileButton
                id="btn-tutorial-next"
                variant="primary"
                fullWidth
                onClick={() => handleStepChange(step + 1)}
              >
                {t('tutorial.nextRule')}
                <ChevronRight className="w-4 h-4" />
              </TactileButton>
            ) : (
              <TactileButton
                id="btn-tutorial-done"
                variant="primary"
                fullWidth
                onClick={handleClose}
              >
                {t('tutorial.done')}
              </TactileButton>
            )}
          </div>
          {onTryInteractive && (
            <TactileButton
              id="btn-tutorial-interactive"
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => {
                tutorialNarrator.stop();
                setIsSpeaking(false);
                setStep(0);
                onTryInteractive();
              }}
            >
              {t('onboarding.tryIt')}
            </TactileButton>
          )}
        </div>
      </div>
    </ModalSheet>
  );
};
