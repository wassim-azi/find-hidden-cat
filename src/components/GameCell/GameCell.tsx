import React from 'react';
import { CellValue, GridSize } from '../../game/gameTypes';
import { getRegionTheme } from '../../styles/theme';
import { CatIllustration } from '../Cat/CatIllustration';

interface GameCellProps {
  row: number;
  col: number;
  size: GridSize;
  regionId: number;
  /** Bitmask: 1=top, 2=right, 4=bottom, 8=left different-region boundary */
  borderMask: number;
  value: CellValue;
  isSelected: boolean;
  isSightline: boolean;
  isConflicting: boolean;
  isHintTarget: boolean;
  isLocked: boolean;
  isCelebrating: boolean;
  showSymbol: boolean;
  pencilMode: boolean;
  shakeNonce: number;
  onCellTap: (row: number, col: number) => void;
  onCellPointerDown: (row: number, col: number) => void;
}

/**
 * Pure GPU-accelerated 120fps GameCell.
 * Strictly memoized on primitive props: tapping a cell only re-renders affected tiles!
 */
export const GameCell: React.FC<GameCellProps> = React.memo(
  ({
    row,
    col,
    size,
    regionId,
    borderMask,
    value,
    isSelected,
    isSightline,
    isConflicting,
    isHintTarget,
    isLocked,
    isCelebrating,
    showSymbol,
    pencilMode,
    shakeNonce,
    onCellTap,
    onCellPointerDown,
  }) => {
    const theme = getRegionTheme(regionId);
    const hasTop = (borderMask & 1) !== 0;
    const hasRight = (borderMask & 2) !== 0;
    const hasBottom = (borderMask & 4) !== 0;
    const hasLeft = (borderMask & 8) !== 0;

    // Tactile pillowy ceramic tile bevel + deeper boundary contour against neighbor regions
    const shadows: string[] = [
      'inset 0 2.5px 0 rgba(255, 255, 255, 0.34)',
      'inset 0 -3px 0 rgba(45, 32, 24, 0.14)',
    ];
    if (hasTop) shadows.push(`inset 0 3px 0 ${theme.bgDark}70`);
    if (hasBottom) shadows.push(`inset 0 -3.5px 0 ${theme.bgDark}80`);
    if (hasLeft) shadows.push(`inset 3px 0 0 ${theme.bgDark}70`);
    if (hasRight) shadows.push(`inset -3px 0 0 ${theme.bgDark}70`);

    if (isSelected) {
      shadows.push(
        '0 0 0 2.5px #FFFFFF',
        '0 0 0 5px rgba(58, 49, 44, 0.36)',
        '0 8px 18px rgba(58, 49, 44, 0.2)'
      );
    } else if (isConflicting) {
      shadows.push('0 0 0 2.5px #E84848');
    } else if (isHintTarget) {
      shadows.push('0 0 0 3px #FFF4B8');
    }

    const roundedClass = size === 8 ? 'rounded-[9px]' : 'rounded-[12px]';
    const xSizeClass = size === 8 ? 'w-[58%] h-[58%]' : 'w-[56%] h-[56%]';

    const stateLabel =
      value === 'cat'
        ? isLocked
          ? 'Locked starter cat'
          : isConflicting
            ? 'Cat in conflict'
            : 'Cat placed'
        : value === 'x'
          ? 'Marked eliminated'
          : 'Empty';

    // Staggered living blink delay so cats blink naturally out of sync
    const blinkDelay = ((row * 3 + col * 7) % 9) * 0.45;

    return (
      <button
        id={`cell-${row}-${col}`}
        data-row={row}
        data-col={col}
        type="button"
        onPointerDown={(e) => {
          if (pencilMode && e.button === 0) {
            e.preventDefault();
            onCellPointerDown(row, col);
          }
        }}
        onClick={() => {
          if (!pencilMode) {
            onCellTap(row, col);
          }
        }}
        aria-label={`Row ${row + 1}, Column ${col + 1}, ${theme.name} region, ${stateLabel}`}
        aria-pressed={isSelected}
        style={{
          background: `linear-gradient(160deg, ${theme.bgLight}38 0%, ${theme.bg} 34%, ${theme.bg} 100%)`,
          backgroundColor: theme.bg,
          boxShadow: shadows.join(', '),
          filter: isSightline && !isSelected ? 'brightness(1.07) saturate(1.08)' : undefined,
        }}
        className={`
          game-cell relative aspect-square w-full flex items-center justify-center
          select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#3A312C]
          ${roundedClass}
          ${isSelected ? 'game-cell-selected z-20' : isConflicting || isHintTarget ? 'z-10' : 'z-0'}
        `}
      >
        {/* Soft sightline inner glow when another tile in same row/col/neighbor is selected */}
        {isSightline && !isSelected && (
          <span
            aria-hidden="true"
            className={`absolute inset-[2px] ${roundedClass} bg-white/14 pointer-events-none`}
          />
        )}

        {/* Optional colorblind region symbol in top-left corner */}
        {showSymbol && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 left-1 text-[8px] font-black text-white/80 leading-none pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
          >
            {theme.symbol}
          </span>
        )}

        {/* Hint spotlight gentle glow */}
        {isHintTarget && (
          <span
            aria-hidden="true"
            className={`anim-hint-pulse absolute inset-0 ${roundedClass} border-2 border-dashed border-white bg-white/18 pointer-events-none`}
          />
        )}

        {/* Subtle selected paw prompt when empty in normal mode */}
        {isSelected && value === 'empty' && !pencilMode && (
          <span
            className="anim-x-pop pointer-events-none flex items-center justify-center opacity-80"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white drop-shadow-xs">
              <circle cx="12" cy="14.5" r="3.6" fill="currentColor" />
              <circle cx="7.4" cy="9.8" r="1.8" fill="currentColor" />
              <circle cx="12" cy="7.8" r="1.9" fill="currentColor" />
              <circle cx="16.6" cy="9.8" r="1.8" fill="currentColor" />
            </svg>
          </span>
        )}

        {/* Occupied Cat with GPU squash-and-stretch pop & celebration wave */}
        {value === 'cat' && (
          <div
            key={isConflicting ? `cat-err-${shakeNonce}` : isCelebrating ? 'cat-win' : 'cat-ok'}
            style={
              isCelebrating
                ? { animationDelay: `${(row + col) * 42}ms` }
                : undefined
            }
            className={`w-[88%] h-[88%] flex items-center justify-center pointer-events-none ${
              isCelebrating
                ? 'anim-cat-celebrate'
                : isConflicting
                  ? 'anim-conflict-shake'
                  : 'anim-cat-pop'
            }`}
          >
            <CatIllustration
              breed={theme.breed}
              mood={isCelebrating ? 'celebrate' : isConflicting ? 'conflict' : 'idle'}
              blinkDelaySec={blinkDelay}
              className="w-full h-full drop-shadow-[0_3px_4px_rgba(45,32,24,0.24)]"
            />
          </div>
        )}

        {/* Crisp Rounded White X Mark */}
        {value === 'x' && (
          <svg
            viewBox="0 0 40 40"
            className={`anim-x-pop ${xSizeClass} pointer-events-none drop-shadow-[0_1.5px_2px_rgba(45,32,24,0.18)]`}
            aria-hidden="true"
          >
            <path
              d="M10 10 L30 30 M30 10 L10 30"
              stroke="#FFFFFF"
              strokeWidth="7.5"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Subtle golden star badge for locked starter clue cats */}
        {isLocked && value === 'cat' && (
          <span
            aria-label="Starter clue cat"
            className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-xs flex items-center justify-center pointer-events-none"
          >
            <span className="text-[8px] text-[#E59C1E] leading-none font-black">★</span>
          </span>
        )}

        {/* Conflict badge */}
        {isConflicting && (
          <span
            aria-hidden="true"
            className="anim-x-pop absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E84848] text-white text-[10px] font-black flex items-center justify-center shadow-sm border border-white pointer-events-none"
          >
            !
          </span>
        )}
      </button>
    );
  }
);

GameCell.displayName = 'GameCell';
