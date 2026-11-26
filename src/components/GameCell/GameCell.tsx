import React, { useRef, useState } from 'react';
import i18n from '../../i18n';
import {
  CandidateMark,
  CellValue,
  ControlMode,
  PencilSubMode,
} from '../../game/gameTypes';
import { getRegionTheme } from '../../styles/theme';
import { CatIllustration } from '../Cat/CatIllustration';

interface GameCellProps {
  row: number;
  col: number;
  size: number;
  regionId: number;
  /** Bitmask: 1=top, 2=right, 4=bottom, 8=left different-region boundary */
  borderMask: number;
  value: CellValue;
  isManualX: boolean;
  isAutoX: boolean;
  candidateMark: CandidateMark | null;
  showCandidates: boolean;
  isSelected: boolean;
  isSightline: boolean;
  isRegionCompleted: boolean;
  highlightCompletedRegions: boolean;
  fadeCompletedRegions: boolean;
  isConflicting: boolean;
  isMistakeFlash: boolean;
  isHintArea: boolean;
  isHintTarget: boolean;
  isLocked: boolean;
  isCelebrating: boolean;
  showSymbol: boolean;
  highContrast: boolean;
  pencilMode: boolean;
  pencilSubMode: PencilSubMode;
  controlMode: ControlMode;
  shakeNonce: number;
  cellId?: string;
  dimmed?: boolean;
  isTargetPulse?: boolean;
  onKeyboardTap?: (row: number, col: number) => void;
  onCellTap: (row: number, col: number) => void;
  onCellDoubleTap: (row: number, col: number) => void;
  onCellLongPress: (row: number, col: number) => void;
  onCellPointerDown: (row: number, col: number) => void;
}

export const DOUBLE_TAP_WINDOW_MS = 340;
export const LONG_PRESS_DURATION_MS = 360;
const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

/**
 * Pure GPU-accelerated 120fps GameCell.
 * Strictly memoized on primitive props so tapping a cell only re-renders affected tiles!
 */
export const GameCell: React.FC<GameCellProps> = React.memo(
  ({
    row,
    col,
    size,
    regionId,
    borderMask,
    value,
    isManualX,
    isAutoX,
    candidateMark,
    showCandidates,
    isSelected,
    isSightline,
    isRegionCompleted,
    highlightCompletedRegions,
    fadeCompletedRegions,
    isConflicting,
    isMistakeFlash,
    isHintArea,
    isHintTarget,
    isLocked,
    isCelebrating,
    showSymbol,
    highContrast,
    pencilMode,
    pencilSubMode,
    controlMode,
    shakeNonce,
    cellId,
    dimmed = false,
    isTargetPulse = false,
    onKeyboardTap,
    onCellTap,
    onCellDoubleTap,
    onCellLongPress,
    onCellPointerDown,
  }) => {
    const theme = getRegionTheme(regionId);
    const hasTop = (borderMask & 1) !== 0;
    const hasRight = (borderMask & 2) !== 0;
    const hasBottom = (borderMask & 4) !== 0;
    const hasLeft = (borderMask & 8) !== 0;

    const lastTapRef = useRef<number>(0);
    const longPressTimerRef = useRef<number | null>(null);
    const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
    const longPressFiredRef = useRef<boolean>(false);
    const [isLongPressing, setIsLongPressing] = useState(false);

    const cancelLongPress = () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressStartRef.current = null;
      setIsLongPressing(false);
    };

    const showConflict = isConflicting || isMistakeFlash;
    const borderAlpha = highContrast ? 'CC' : '70';
    const borderWidth = highContrast ? '3.5px' : '3px';

    // Tactile pillowy ceramic tile bevel + deeper boundary contour against neighbor regions
    const shadows: string[] = [
      'inset 0 2.5px 0 rgba(255, 255, 255, 0.34)',
      'inset 0 -3px 0 rgba(45, 32, 24, 0.14)',
    ];
    if (hasTop) shadows.push(`inset 0 ${borderWidth} 0 ${highContrast ? '#241C18' : `${theme.bgDark}${borderAlpha}`}`);
    if (hasBottom) shadows.push(`inset 0 -3.5px 0 ${highContrast ? '#241C18' : `${theme.bgDark}80`}`);
    if (hasLeft) shadows.push(`inset ${borderWidth} 0 0 ${highContrast ? '#241C18' : `${theme.bgDark}${borderAlpha}`}`);
    if (hasRight) shadows.push(`inset -${borderWidth} 0 0 ${highContrast ? '#241C18' : `${theme.bgDark}${borderAlpha}`}`);

    if (showConflict) {
      shadows.push('0 0 0 2.5px #E84848', '0 0 12px rgba(232, 72, 72, 0.35)');
    } else if (isSelected) {
      shadows.push(
        '0 0 0 2.5px #FFFFFF',
        `0 0 0 5px ${highContrast ? '#1F1815' : 'rgba(58, 49, 44, 0.42)'}`,
        '0 8px 18px rgba(58, 49, 44, 0.2)'
      );
    } else if (isHintTarget) {
      shadows.push('0 0 0 3px #FFF4B8', '0 0 14px rgba(232, 163, 40, 0.45)');
    } else if (isHintArea) {
      shadows.push('0 0 0 2px rgba(255, 244, 184, 0.92)');
    }

    const roundedClass = size === 8 ? 'rounded-[9px]' : 'rounded-[12px]';
    const xSizeClass = size === 8 ? 'w-[56%] h-[56%]' : 'w-[54%] h-[54%]';

    const stateLabel =
      value === 'cat'
        ? isLocked
          ? i18n.t('game.cellStateLocked')
          : showConflict
            ? i18n.t('game.cellStateConflict')
            : i18n.t('game.cellStateCat')
        : isManualX
          ? i18n.t('game.cellStateManualX')
          : isAutoX
            ? i18n.t('game.cellStateAutoX')
            : candidateMark
              ? i18n.t('game.cellStateCandidate')
              : i18n.t('game.cellStateEmpty');

    const regName = i18n.t(`regions.${Math.abs(regionId) % 8}`);
    const blinkDelay = ((row * 3 + col * 7) % 9) * 0.45;

    // Optional visual fading ONLY if the player explicitly turned fadeCompletedRegions ON
    const tileFilter = dimmed
      ? 'brightness(0.72) saturate(0.42) opacity(0.4)'
      : fadeCompletedRegions && isRegionCompleted && value !== 'cat' && !isSelected && !isHintTarget
        ? 'saturate(0.45) brightness(1.04) opacity(0.74)'
        : isSightline && !isSelected
          ? 'brightness(1.08) saturate(1.08)'
          : undefined;

    return (
      <button
        id={cellId ?? `cell-${row}-${col}`}
        data-row={row}
        data-col={col}
        type="button"
        tabIndex={dimmed ? -1 : undefined}
        onKeyDown={(e) => {
          if (!dimmed && onKeyboardTap && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onKeyboardTap(row, col);
          }
        }}
        onPointerDown={(e) => {
          if (dimmed) return;
          if (pencilMode && pencilSubMode === 'x' && e.button === 0) {
            e.preventDefault();
            onCellPointerDown(row, col);
            return;
          }
          if (!pencilMode && controlMode === 'long-press' && e.button === 0 && !isLocked) {
            longPressFiredRef.current = false;
            longPressStartRef.current = { x: e.clientX, y: e.clientY };
            setIsLongPressing(true);
            longPressTimerRef.current = window.setTimeout(() => {
              longPressTimerRef.current = null;
              longPressFiredRef.current = true;
              setIsLongPressing(false);
              onCellLongPress(row, col);
            }, LONG_PRESS_DURATION_MS);
          }
        }}
        onPointerMove={(e) => {
          if (longPressStartRef.current) {
            const dx = e.clientX - longPressStartRef.current.x;
            const dy = e.clientY - longPressStartRef.current.y;
            if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE_PX) {
              cancelLongPress();
            }
          }
        }}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onClick={(e) => {
          if (dimmed) {
            onCellTap(row, col);
            return;
          }
          if (e.detail === 0 && onKeyboardTap) {
            onKeyboardTap(row, col);
            return;
          }
          if (pencilMode && pencilSubMode === 'x') {
            return; // Handled on pointerDown for instant drag-painting
          }
          if (longPressFiredRef.current) {
            longPressFiredRef.current = false;
            return;
          }

          if (!pencilMode && controlMode === 'double-tap') {
            const now = Date.now();
            if (now - lastTapRef.current <= DOUBLE_TAP_WINDOW_MS) {
              lastTapRef.current = 0;
              onCellDoubleTap(row, col);
              return;
            }
            lastTapRef.current = now;
          }

          onCellTap(row, col);
        }}
        aria-label={i18n.t('game.cellAria', {
          row: row + 1,
          col: col + 1,
          region: regName,
          state: stateLabel,
        })}
        aria-pressed={isSelected}
        style={{
          background: `linear-gradient(160deg, ${theme.bgLight}38 0%, ${theme.bg} 34%, ${theme.bg} 100%)`,
          backgroundColor: theme.bg,
          boxShadow: shadows.join(', '),
          filter: tileFilter,
        }}
        className={`
          game-cell relative aspect-square w-full flex items-center justify-center
          select-none ${dimmed ? 'cursor-default' : 'cursor-pointer'} focus-visible:outline-2 focus-visible:outline-[#3A312C]
          ${roundedClass}
          ${isMistakeFlash ? 'anim-conflict-shake' : ''}
          ${isSelected ? 'game-cell-selected z-20' : showConflict || isHintTarget || isTargetPulse ? 'z-10' : 'z-0'}
        `}
      >
        {/* Gentle target pulse when a non-lit cell is tapped during onboarding */}
        {isTargetPulse && !isHintTarget && (
          <span
            aria-hidden="true"
            className={`anim-hint-pulse absolute inset-0 ${roundedClass} border-2 border-white bg-white/25 pointer-events-none`}
          />
        )}

        {/* Soft sightline inner glow */}
        {isSightline && !isSelected && (
          <span
            aria-hidden="true"
            className={`absolute inset-[2px] ${roundedClass} bg-white/16 pointer-events-none`}
          />
        )}

        {/* Long-press visual progress ring */}
        {isLongPressing && (
          <span
            aria-hidden="true"
            className={`anim-longpress-ring absolute inset-0 ${roundedClass} border-2 border-white pointer-events-none`}
          />
        )}

        {/* Optional colorblind region symbol in top-left corner */}
        {showSymbol && (
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-1 font-black leading-none pointer-events-none ${
              highContrast
                ? 'text-[9px] text-[#1F1815] bg-white/85 px-0.5 rounded'
                : 'text-[8px] text-white/85 drop-shadow-[0_1px_1px_rgba(0,0,0,0.22)]'
            }`}
          >
            {theme.symbol}
          </span>
        )}

        {/* Completed Region subtle check glow (optional, non-fading!) */}
        {highlightCompletedRegions && isRegionCompleted && value === 'cat' && !showConflict && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[#4CA676] text-white text-[7px] font-black flex items-center justify-center border border-white pointer-events-none shadow-2xs"
          >
            ✓
          </span>
        )}

        {/* Stage 1 & 2 Progressive Hint Area soft glow */}
        {isHintArea && !isHintTarget && (
          <span
            aria-hidden="true"
            className={`anim-hint-area absolute inset-0 ${roundedClass} bg-[#FFF5C4]/25 border border-[#FFF4B8]/80 pointer-events-none`}
          />
        )}

        {/* Stage 3 & 4 Progressive Hint Spotlight */}
        {isHintTarget && (
          <span
            aria-hidden="true"
            className={`anim-hint-pulse absolute inset-0 ${roundedClass} border-2 border-dashed border-white bg-white/22 pointer-events-none`}
          />
        )}

        {/* Subtle selected paw prompt when empty in normal mode */}
        {isSelected && value === 'empty' && !pencilMode && !candidateMark && (
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
            key={showConflict ? `cat-err-${shakeNonce}` : isCelebrating ? 'cat-win' : 'cat-ok'}
            style={
              isCelebrating
                ? { animationDelay: `${(row + col) * 42}ms` }
                : undefined
            }
            className={`w-[88%] h-[88%] flex items-center justify-center pointer-events-none ${
              isCelebrating
                ? 'anim-cat-celebrate'
                : showConflict
                  ? 'anim-conflict-shake'
                  : 'anim-cat-pop'
            }`}
          >
            <CatIllustration
              breed={theme.breed}
              mood={isCelebrating ? 'celebrate' : showConflict ? 'conflict' : 'idle'}
              blinkDelaySec={blinkDelay}
              className="w-full h-full drop-shadow-[0_3px_4px_rgba(45,32,24,0.24)]"
            />
          </div>
        )}

        {/* Manual X Mark (crisp bold solid white X) */}
        {value !== 'cat' && isManualX && (
          <svg
            viewBox="0 0 40 40"
            className={`anim-x-pop ${xSizeClass} pointer-events-none drop-shadow-[0_1.5px_2px_rgba(45,32,24,0.22)]`}
            aria-hidden="true"
          >
            <path
              d="M9 9 L31 31 M31 9 L9 31"
              stroke={highContrast ? '#1F1815' : '#FFFFFF'}
              strokeWidth="7.5"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Auto X Mark (visually distinct softer translucent X so Manual X & Auto X are unmistakable!) */}
        {value !== 'cat' && !isManualX && isAutoX && (
          <svg
            viewBox="0 0 40 40"
            className={`${size === 8 ? 'w-[44%] h-[44%]' : 'w-[42%] h-[42%]'} pointer-events-none opacity-60`}
            aria-hidden="true"
          >
            <path
              d="M11 11 L29 29 M29 11 L11 29"
              stroke={highContrast ? '#1F1815' : '#FFFFFF'}
              strokeWidth="4.6"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
          </svg>
        )}

        {/* Candidate Note Badge (possible paw-dot or priority golden star) — never silently overwritten */}
        {showCandidates && value !== 'cat' && candidateMark && (
          <span
            aria-hidden="true"
            className={`anim-x-pop pointer-events-none flex items-center justify-center rounded-full shadow-xs border border-white/90 ${
              isManualX || isAutoX
                ? 'absolute bottom-0.5 right-0.5 w-3.5 h-3.5 text-[8px]'
                : size === 8
                  ? 'w-5 h-5 text-[10px]'
                  : 'w-6 h-6 text-[12px]'
            } ${
              candidateMark === 'priority'
                ? 'bg-[#FFF3C4] text-[#D48512] font-black'
                : 'bg-white/92 text-[#5A4E47] font-black'
            }`}
          >
            {candidateMark === 'priority' ? '★' : '•'}
          </span>
        )}

        {/* Subtle golden star badge for locked starter clue cats */}
        {isLocked && value === 'cat' && (
          <span
            aria-label={i18n.t('game.cellStateLocked')}
            className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-xs flex items-center justify-center pointer-events-none"
          >
            <span className="text-[8px] text-[#E59C1E] leading-none font-black">★</span>
          </span>
        )}

        {/* Conflict / Mistake flash badge */}
        {showConflict && (
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
