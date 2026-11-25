import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import i18n from '../../i18n';
import {
  BoardGrid,
  CandidateMark,
  CellCoord,
  ControlMode,
  HintResult,
  PencilSubMode,
  PuzzleDefinition,
  ValidationResult,
  cellKey,
  coordsEqual,
} from '../../game/gameTypes';
import { MistakeFlash } from '../../store/gameStore';
import { GameCell } from '../GameCell/GameCell';

interface GameBoardProps {
  puzzle: PuzzleDefinition;
  board: BoardGrid;
  manualXKeys: string[];
  autoXKeys: string[];
  candidateMarks: Record<string, CandidateMark>;
  validation: ValidationResult;
  selectedCell: CellCoord | null;
  activeHint: HintResult | null;
  mistakeFlash: MistakeFlash | null;
  pencilMode: boolean;
  pencilSubMode: PencilSubMode;
  controlMode: ControlMode;
  isCelebrating: boolean;
  showRegionSymbols: boolean;
  showCandidates: boolean;
  highlightRowCol: boolean;
  highlightNeighbors: boolean;
  highlightRegion: boolean;
  highlightCompletedRegions: boolean;
  fadeCompletedRegions: boolean;
  highContrast: boolean;
  shakeNonce: number;
  onTapCell: (coord: CellCoord) => void;
  onDoubleTapCell: (coord: CellCoord) => void;
  onLongPressCell: (coord: CellCoord) => void;
  onDirectAction: (coord: CellCoord, mode: 'cat' | 'x') => void;
  onSelectCell: (coord: CellCoord) => void;
  onBeginDragMark: (coord: CellCoord) => void;
  onDragMarkCell: (coord: CellCoord) => void;
  onEndDragMark: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = React.memo(
  ({
    puzzle,
    board,
    manualXKeys,
    autoXKeys,
    candidateMarks,
    validation,
    selectedCell,
    activeHint,
    mistakeFlash,
    pencilMode,
    pencilSubMode,
    controlMode,
    isCelebrating,
    showRegionSymbols,
    showCandidates,
    highlightRowCol,
    highlightNeighbors,
    highlightRegion,
    highlightCompletedRegions,
    fadeCompletedRegions,
    highContrast,
    shakeNonce,
    onTapCell,
    onDoubleTapCell,
    onLongPressCell,
    onDirectAction,
    onSelectCell,
    onBeginDragMark,
    onDragMarkCell,
    onEndDragMark,
  }) => {
    const { size, regions, initialCats } = puzzle;
    const isDraggingRef = useRef(false);
    const lastDragKeyRef = useRef<string | null>(null);

    const lockedSet = useMemo(() => {
      const set = new Set<string>();
      for (const c of initialCats) set.add(cellKey(c.row, c.col));
      return set;
    }, [initialCats]);

    const manualXSet = useMemo(() => new Set(manualXKeys), [manualXKeys]);
    const autoXSet = useMemo(() => new Set(autoXKeys), [autoXKeys]);

    const hintAreaSet = useMemo(() => {
      const set = new Set<string>();
      if (activeHint) {
        for (const c of activeHint.areaCells) set.add(cellKey(c.row, c.col));
      }
      return set;
    }, [activeHint]);

    const mistakeFlashSet = useMemo(() => {
      const set = new Set<string>();
      if (mistakeFlash) {
        for (const c of mistakeFlash.cells) set.add(cellKey(c.row, c.col));
      }
      return set;
    }, [mistakeFlash]);

    const borderMasks = useMemo(() => {
      const masks: number[][] = [];
      for (let r = 0; r < size; r++) {
        const rowMasks: number[] = [];
        for (let c = 0; c < size; c++) {
          const reg = regions[r]![c]!;
          let mask = 0;
          if (r > 0 && regions[r - 1]![c] !== reg) mask |= 1;
          if (c < size - 1 && regions[r]![c + 1] !== reg) mask |= 2;
          if (r < size - 1 && regions[r + 1]![c] !== reg) mask |= 4;
          if (c > 0 && regions[r]![c - 1] !== reg) mask |= 8;
          rowMasks.push(mask);
        }
        masks.push(rowMasks);
      }
      return masks;
    }, [size, regions]);

    const selectedRegionId =
      selectedCell !== null ? regions[selectedCell.row]?.[selectedCell.col] : undefined;

    const handleCellTap = useCallback(
      (row: number, col: number) => {
        onTapCell({ row, col });
      },
      [onTapCell]
    );

    const handleCellDoubleTap = useCallback(
      (row: number, col: number) => {
        onDoubleTapCell({ row, col });
      },
      [onDoubleTapCell]
    );

    const handleCellLongPress = useCallback(
      (row: number, col: number) => {
        onLongPressCell({ row, col });
      },
      [onLongPressCell]
    );

    const handleCellPointerDown = useCallback(
      (row: number, col: number) => {
        isDraggingRef.current = true;
        lastDragKeyRef.current = `${row},${col}`;
        onBeginDragMark({ row, col });
      },
      [onBeginDragMark]
    );

    const handleGridPointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current || !pencilMode || pencilSubMode !== 'x') return;
        const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const cellEl = target?.closest<HTMLElement>('[data-row][data-col]');
        if (!cellEl) return;

        const r = Number(cellEl.dataset.row);
        const c = Number(cellEl.dataset.col);
        if (Number.isNaN(r) || Number.isNaN(c)) return;

        const k = `${r},${c}`;
        if (k === lastDragKeyRef.current) return;
        lastDragKeyRef.current = k;
        onDragMarkCell({ row: r, col: c });
      },
      [pencilMode, pencilSubMode, onDragMarkCell]
    );

    const finishDrag = useCallback(() => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        lastDragKeyRef.current = null;
        onEndDragMark();
      }
    }, [onEndDragMark]);

    useEffect(() => {
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
      return () => {
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
      };
    }, [finishDrag]);

    // Keyboard accessibility navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        // Only react when the board (a cell) or nothing in particular has focus. Otherwise
        // Enter/Space on a focused toolbar or modal button would ALSO place a cat on the
        // selected tile — an accidental move that can cost a heart.
        const target = e.target instanceof HTMLElement ? e.target : null;
        const focusedCell = target?.closest<HTMLElement>('[data-row][data-col]') ?? null;
        const isNeutralFocus =
          !target || target === document.body || target === document.documentElement;
        if (!focusedCell && !isNeutralFocus) return;
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

        const moveTo = (coord: CellCoord) => {
          onSelectCell(coord);
          // Keep keyboard focus (and screen-reader position) on the newly selected tile
          if (focusedCell) {
            document.getElementById(`cell-${coord.row}-${coord.col}`)?.focus();
          }
        };
        // The focused tile is the keyboard user's cursor; never act on a different selected tile
        const focusedCoord = focusedCell
          ? { row: Number(focusedCell.dataset.row), col: Number(focusedCell.dataset.col) }
          : null;
        const curr = focusedCoord ?? selectedCell ?? { row: 0, col: 0 };
        const actionCell = focusedCoord ?? selectedCell;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveTo({ row: (curr.row - 1 + size) % size, col: curr.col });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveTo({ row: (curr.row + 1) % size, col: curr.col });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          moveTo({ row: curr.row, col: (curr.col - 1 + size) % size });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          moveTo({ row: curr.row, col: (curr.col + 1) % size });
        } else if ((e.key === 'Enter' || e.key === ' ') && actionCell) {
          e.preventDefault();
          onSelectCell(actionCell);
          onDirectAction(actionCell, pencilMode ? 'x' : 'cat');
        } else if ((e.key === 'x' || e.key === 'X') && actionCell) {
          e.preventDefault();
          onSelectCell(actionCell);
          onDirectAction(actionCell, 'x');
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCell, size, pencilMode, onDirectAction, onSelectCell]);

    const gapClass = size === 8 ? 'gap-[4px] sm:gap-[5px]' : 'gap-[6px] sm:gap-[7px]';
    const paddingClass = size === 8 ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3';

    return (
      <div
        className="w-full h-full px-3.5 py-0.5 flex items-center justify-center"
        style={{ containerType: 'size' }}
      >
        <div
          role="grid"
          aria-label={i18n.t('game.boardAria', { size })}
          onPointerMove={handleGridPointerMove}
          style={{
            width: 'min(calc(100cqw - 28px), calc(100cqh - 4px), 388px)',
            height: 'min(calc(100cqw - 28px), calc(100cqh - 4px), 388px)',
            touchAction: pencilMode && pencilSubMode === 'x' ? 'none' : 'manipulation',
          }}
          className={`meow-board-frame rounded-[24px] ${paddingClass}`}
        >
          <div
            className={`w-full h-full grid ${gapClass}`}
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
            }}
          >
            {regions.map((rowRegions, r) =>
              rowRegions.map((regionId, c) => {
                const value = board[r]?.[c] ?? 'empty';
                const key = cellKey(r, c);
                const isSelected =
                  selectedCell !== null && selectedCell.row === r && selectedCell.col === c;

                const isRowOrColMatch =
                  highlightRowCol &&
                  selectedCell !== null &&
                  (selectedCell.row === r || selectedCell.col === c);

                const isNeighborMatch =
                  highlightNeighbors &&
                  selectedCell !== null &&
                  Math.abs(selectedCell.row - r) <= 1 &&
                  Math.abs(selectedCell.col - c) <= 1;

                const isRegionMatch =
                  highlightRegion &&
                  selectedRegionId !== undefined &&
                  regionId === selectedRegionId;

                const isSightline =
                  !pencilMode &&
                  selectedCell !== null &&
                  !isSelected &&
                  (isRowOrColMatch || isNeighborMatch || isRegionMatch);

                const isConflicting = validation.conflictingCellKeys.has(key);
                const isMistakeFlash = mistakeFlashSet.has(key);
                const isHintArea = hintAreaSet.has(key);
                const isHintTarget = activeHint?.revealTargetCell
                  ? coordsEqual(activeHint.targetCell, { row: r, col: c })
                  : false;

                return (
                  <GameCell
                    key={key}
                    row={r}
                    col={c}
                    size={size}
                    regionId={regionId}
                    borderMask={borderMasks[r]![c]!}
                    value={value}
                    isManualX={manualXSet.has(key)}
                    isAutoX={autoXSet.has(key)}
                    candidateMark={candidateMarks[key] ?? null}
                    showCandidates={showCandidates}
                    isSelected={isSelected}
                    isSightline={isSightline}
                    isRegionCompleted={validation.completedRegions.has(regionId)}
                    highlightCompletedRegions={highlightCompletedRegions}
                    fadeCompletedRegions={fadeCompletedRegions}
                    isConflicting={isConflicting}
                    isMistakeFlash={isMistakeFlash}
                    isHintArea={isHintArea}
                    isHintTarget={isHintTarget}
                    isLocked={lockedSet.has(key)}
                    isCelebrating={isCelebrating}
                    showSymbol={showRegionSymbols}
                    highContrast={highContrast}
                    pencilMode={pencilMode}
                    pencilSubMode={pencilSubMode}
                    controlMode={controlMode}
                    shakeNonce={shakeNonce}
                    onCellTap={handleCellTap}
                    onCellDoubleTap={handleCellDoubleTap}
                    onCellLongPress={handleCellLongPress}
                    onCellPointerDown={handleCellPointerDown}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }
);

GameBoard.displayName = 'GameBoard';
