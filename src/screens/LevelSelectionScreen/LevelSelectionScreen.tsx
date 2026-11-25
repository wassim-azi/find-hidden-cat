import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Lock, Settings, Star } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getLevelMetaList, TOTAL_LEVELS } from '../../game/levels';
import { CHAPTERS } from '../../game/chapters';
import { Difficulty } from '../../game/gameTypes';
import { formatTime } from '../../utils/format';

const FILTERS: readonly { id: Difficulty | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const DIFF_BADGE: Record<Difficulty, string> = {
  easy: 'bg-[#E5F4EC] text-[#357C56]',
  medium: 'bg-[#FEF2DC] text-[#A46D1A]',
  hard: 'bg-[#FCE8E8] text-[#B84A4A]',
};

export const LevelSelectionScreen: React.FC = () => {
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const selectedDifficulty = useGameStore((s) => s.selectedDifficulty);
  const setDifficultyFilter = useGameStore((s) => s.setDifficultyFilter);
  const startLevel = useGameStore((s) => s.startLevel);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);

  const levels = getLevelMetaList();
  const visibleChapters =
    selectedDifficulty === 'all'
      ? CHAPTERS
      : CHAPTERS.filter((ch) => ch.id === selectedDifficulty);

  const totalStars = Object.values(levelProgress).reduce((acc, p) => acc + p.stars, 0);
  const maxStars = TOTAL_LEVELS * 3;
  const solvedCount = Object.values(levelProgress).filter((p) => p.completed).length;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <button
          id="btn-levels-back"
          type="button"
          onClick={() => goToScreen('welcome')}
          aria-label="Back to welcome screen"
          className="w-10 h-10 rounded-full bg-white border border-[#EAE0D2] shadow-[0_2px_8px_rgba(92,69,52,0.06)] flex items-center justify-center text-[#5A4E47] active:scale-92 transition-transform cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-[20px] font-black text-[#3A312C] tracking-tight leading-none">
            Chapters &amp; Levels
          </h1>
          <p className="text-[11.5px] font-bold text-[#8A7B70] mt-1">
            {solvedCount} of {TOTAL_LEVELS} solved
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="w-10 h-10 rounded-full bg-white border border-[#EAE0D2] shadow-[0_2px_8px_rgba(92,69,52,0.06)] flex items-center justify-center text-[#5A4E47] active:scale-92 transition-transform cursor-pointer"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* Stars Progress Pill + Difficulty Tabs */}
      <div className="px-4 pb-2.5 flex flex-col gap-2 shrink-0">
        <div className="meow-card rounded-2xl px-3.5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4.5 h-4.5 text-[#F4B942] fill-[#F4B942]" />
            <span className="text-[13.5px] font-black text-[#3A312C] tabular-nums">
              {totalStars}{' '}
              <span className="text-[#9A8B80] font-bold">/ {maxStars} Stars</span>
            </span>
          </div>
          <div className="w-24 h-2 bg-[#F2E9DC] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FF8585] to-[#F4B942] rounded-full transition-all duration-300"
              style={{ width: `${Math.round((totalStars / maxStars) * 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 bg-[#EFE6D8]/80 p-1 rounded-2xl">
          {FILTERS.map((f) => {
            const active = selectedDifficulty === f.id;
            return (
              <button
                key={f.id}
                id={`filter-${f.id}`}
                type="button"
                onClick={() => setDifficultyFilter(f.id)}
                className={`py-1.5 rounded-xl text-[12.5px] font-extrabold transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-[#3A312C] shadow-[0_2px_8px_rgba(92,69,52,0.1)]'
                    : 'text-[#7E7067] hover:text-[#3A312C]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Illustrated Storybook Chapters + Level Grids */}
      <div className="flex-1 soft-scroll px-4 pb-6 flex flex-col gap-5">
        {visibleChapters.map((chapter) => {
          const chapterLevels = levels.filter((l) => l.difficulty === chapter.id);
          const chapterSolved = chapterLevels.filter(
            (l) => levelProgress[l.id]?.completed
          ).length;

          return (
            <section key={chapter.id} className="flex flex-col gap-2.5">
              {/* Illustrated Gemini Nano Banana Chapter Banner */}
              <div className="relative w-full h-[108px] rounded-[22px] overflow-hidden border border-[#E6D9C6] shadow-[0_6px_18px_rgba(92,69,52,0.1)]">
                <img
                  src={chapter.imageSrc}
                  alt={chapter.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#2D241E]/72 via-[#2D241E]/32 to-transparent"
                />
                <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${chapter.accentBg} ${chapter.accentText}`}
                    >
                      {chapter.id}
                    </span>
                    <span className="text-[11px] font-black text-white bg-[#2D241E]/50 backdrop-blur-xs px-2 py-0.5 rounded-full tabular-nums">
                      {chapterSolved}/{chapterLevels.length}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-[18px] font-black text-white leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
                      {chapter.title}
                    </h2>
                    <p className="text-[11.5px] font-bold text-white/90 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                      {chapter.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chapter Level Grid */}
              <div className="grid grid-cols-4 gap-2">
                {chapterLevels.map((lvl) => {
                  const prog = levelProgress[lvl.id];
                  const isUnlocked = lvl.id <= unlockedLevelId || Boolean(prog?.completed);
                  const isCompleted = Boolean(prog?.completed);
                  const isCurrent = lvl.id === currentLevelId && isUnlocked;

                  return (
                    <motion.button
                      key={lvl.id}
                      id={`level-card-${lvl.id}`}
                      type="button"
                      disabled={!isUnlocked}
                      whileTap={isUnlocked ? { scale: 0.93 } : undefined}
                      onClick={() => startLevel(lvl.id, lvl.id === currentLevelId)}
                      aria-label={`Level ${lvl.id}, ${lvl.title}, ${lvl.difficulty}, ${lvl.size} by ${lvl.size}, ${
                        isCompleted
                          ? `completed with ${prog?.stars ?? 0} stars`
                          : isUnlocked
                            ? 'unlocked'
                            : 'locked'
                      }`}
                      className={`
                        relative rounded-[18px] p-2 flex flex-col items-center text-center
                        border transition-all select-none
                        ${
                          isCurrent
                            ? 'bg-white border-[#FF8585] ring-2 ring-[#FF8585]/25 shadow-[0_6px_14px_rgba(255,122,122,0.2)] cursor-pointer'
                            : isUnlocked
                              ? 'bg-white border-[#EAE0D2] shadow-[0_2px_8px_rgba(92,69,52,0.06)] cursor-pointer'
                              : 'bg-[#F2EAE0]/75 border-[#E6DCCE] opacity-70 cursor-not-allowed'
                        }
                      `}
                    >
                      <div className="w-full flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-black text-[#9A8B80]">
                          {lvl.size}×{lvl.size}
                        </span>
                        {isCompleted ? (
                          <span className="w-3.5 h-3.5 rounded-full bg-[#6EB58E] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" strokeWidth={3.2} />
                          </span>
                        ) : !isUnlocked ? (
                          <Lock className="w-3 h-3 text-[#A99B90]" />
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-[#FF7A7A]" />
                        ) : (
                          <span className="w-3 h-3" />
                        )}
                      </div>

                      <span
                        className={`text-[21px] font-black leading-none tracking-tight ${
                          isUnlocked ? 'text-[#3A312C]' : 'text-[#A99B90]'
                        }`}
                      >
                        {lvl.id}
                      </span>

                      <span
                        className={`mt-1 text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full leading-none ${DIFF_BADGE[lvl.difficulty]}`}
                      >
                        {lvl.difficulty}
                      </span>

                      <div className="flex items-center justify-center gap-0.5 mt-1.5">
                        {[1, 2, 3].map((s) => {
                          const earned = (prog?.stars ?? 0) >= s;
                          return (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                earned
                                  ? 'text-[#F4B942] fill-[#F4B942]'
                                  : 'text-[#E3D8C8] fill-[#EFE7DA]'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {prog?.bestTimeSec !== null && prog?.bestTimeSec !== undefined && (
                        <span className="text-[9px] font-bold text-[#9A8B80] tabular-nums mt-0.5">
                          {formatTime(prog.bestTimeSec)}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
