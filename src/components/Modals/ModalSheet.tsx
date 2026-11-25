import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalSheetProps {
  open: boolean;
  onClose?: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const ModalSheet: React.FC<ModalSheetProps> = ({
  open,
  onClose,
  ariaLabel,
  children,
  maxWidthClass = 'max-w-[360px]',
}) => {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[#2E241E]/45 backdrop-blur-[4px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full ${maxWidthClass} max-h-full overflow-y-auto overscroll-contain bg-[#FFFDF9] rounded-[28px] border border-[#EAE0D2] shadow-[0_24px_48px_rgba(46,36,30,0.24)]`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
