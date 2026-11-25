import React from 'react';
import { motion } from 'framer-motion';
import { GridSize } from '../../game/gameTypes';
import { getRegionTheme } from '../../styles/theme';
import { CatIllustration, CatSilhouette } from '../Cat/CatIllustration';

interface ProgressIndicatorProps {
  size: GridSize;
  placedCount: number;
  completedRegions: Set<number>;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  size,
  placedCount,
  completedRegions,
}) => {
  const validFound = completedRegions.size;
  const pct = Math.min(100, Math.round((validFound / size) * 100));

  return (
    <section
      aria-label={`Progress: ${validFound} of ${size} cats found`}
      className="px-3.5 py-1 shrink-0"
    >
      <div className="meow-card rounded-2xl px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* Colored Region Cat Trackers (Meowdoku signature visual!) */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
            {Array.from({ length: size }, (_, regId) => {
              const theme = getRegionTheme(regId);
              const isFound = completedRegions.has(regId);
              return (
                <motion.div
                  key={regId}
                  animate={isFound ? { scale: [0.85, 1.15, 1] } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  className="relative flex items-center justify-center shrink-0"
                  style={{
                    width: size === 8 ? '26px' : '30px',
                    height: size === 8 ? '26px' : '30px',
                  }}
                  title={`${theme.name} region ${isFound ? 'found' : 'unfound'}`}
                >
                  {isFound ? (
                    <CatIllustration
                      breed={theme.breed}
                      mood="happy"
                      className="w-full h-full drop-shadow-[0_1px_2px_rgba(58,49,44,0.16)]"
                    />
                  ) : (
                    <CatSilhouette
                      color={theme.silhouette}
                      className="w-[88%] h-[88%] opacity-85"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Numeric Pill */}
          <div className="flex items-center gap-1 bg-[#FAF5EC] border border-[#EDE3D4] rounded-full px-2.5 py-0.5 shrink-0">
            <span className="text-[14px] font-black text-[#4B9B6E] tabular-nums">
              {validFound}
            </span>
            <span className="text-[12px] font-bold text-[#9C8D82]">/</span>
            <span className="text-[13px] font-extrabold text-[#5A4E47] tabular-nums">
              {size}
            </span>
            {placedCount > validFound && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#EE6C6C] ml-0.5"
                title="Conflict present"
              />
            )}
          </div>
        </div>

        {/* Sleek animated progress bar */}
        <div className="w-full h-1.5 bg-[#F2E9DC] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#FF8B8B] via-[#F4B942] to-[#6EC194]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          />
        </div>
      </div>
    </section>
  );
};
