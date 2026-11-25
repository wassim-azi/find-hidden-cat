import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Pencil, Redo2, RotateCcw, Undo2 } from 'lucide-react';

interface BottomToolbarProps {
  pencilMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hintsUsed: number;
  onTogglePencil: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onHint: () => void;
  onReset: () => void;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  pencilMode,
  canUndo,
  canRedo,
  hintsUsed,
  onTogglePencil,
  onUndo,
  onRedo,
  onHint,
  onReset,
}) => {
  return (
    <nav
      aria-label="Game controls"
      className="px-3.5 pb-3 pt-1.5 shrink-0"
    >
      <div className="meow-toolbar rounded-[24px] px-2 py-2 grid grid-cols-5 gap-1 items-center">
        {/* Pencil / X Mark Toggle */}
        <motion.button
          id="btn-tool-pencil"
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onTogglePencil}
          aria-pressed={pencilMode}
          aria-label={pencilMode ? 'Disable pencil X mode' : 'Enable pencil X mode'}
          className={`
            relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-[18px]
            transition-colors cursor-pointer select-none
            ${
              pencilMode
                ? 'bg-[#3A312C] text-white shadow-[0_4px_12px_rgba(58,49,44,0.28)]'
                : 'text-[#5A4E47] hover:bg-[#F7F1E6]'
            }
          `}
        >
          <div className="relative">
            <Pencil className="w-5 h-5" strokeWidth={2.3} />
            <span
              className={`absolute -top-1 -right-2 text-[9px] font-black px-1 rounded-full leading-tight ${
                pencilMode ? 'bg-[#FF7A7A] text-white' : 'bg-[#EAE0D2] text-[#5A4E47]'
              }`}
            >
              ×
            </span>
          </div>
          <span className="text-[10px] font-extrabold leading-none mt-0.5">
            {pencilMode ? 'X On' : 'Mark X'}
          </span>
        </motion.button>

        {/* Undo */}
        <motion.button
          id="btn-tool-undo"
          type="button"
          whileTap={canUndo ? { scale: 0.92 } : undefined}
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Undo move"
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-[18px] text-[#5A4E47] hover:bg-[#F7F1E6] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer select-none transition-colors"
        >
          <Undo2 className="w-5 h-5" strokeWidth={2.3} />
          <span className="text-[10px] font-extrabold leading-none mt-0.5">Undo</span>
        </motion.button>

        {/* Redo */}
        <motion.button
          id="btn-tool-redo"
          type="button"
          whileTap={canRedo ? { scale: 0.92 } : undefined}
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="Redo move"
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-[18px] text-[#5A4E47] hover:bg-[#F7F1E6] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer select-none transition-colors"
        >
          <Redo2 className="w-5 h-5" strokeWidth={2.3} />
          <span className="text-[10px] font-extrabold leading-none mt-0.5">Redo</span>
        </motion.button>

        {/* Hint */}
        <motion.button
          id="btn-tool-hint"
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onHint}
          aria-label="Get a hint"
          className="relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-[18px] text-[#9A6818] bg-[#FFF6DF] hover:bg-[#FDEEC9] cursor-pointer select-none transition-colors"
        >
          <Lightbulb className="w-5 h-5 text-[#E5A024]" strokeWidth={2.4} />
          <span className="text-[10px] font-extrabold leading-none mt-0.5">Hint</span>
          {hintsUsed > 0 && (
            <span className="absolute top-1 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#E5A024] text-white text-[9px] font-black flex items-center justify-center">
              {hintsUsed}
            </span>
          )}
        </motion.button>

        {/* Reset */}
        <motion.button
          id="btn-tool-reset"
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onReset}
          aria-label="Reset current board"
          className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-[18px] text-[#5A4E47] hover:bg-[#F7F1E6] cursor-pointer select-none transition-colors"
        >
          <RotateCcw className="w-5 h-5" strokeWidth={2.3} />
          <span className="text-[10px] font-extrabold leading-none mt-0.5">Reset</span>
        </motion.button>
      </div>
    </nav>
  );
};
