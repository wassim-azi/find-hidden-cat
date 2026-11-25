import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  BoardGrid,
  CellCoord,
  HintResult,
  PuzzleDefinition,
  ValidationResult,
  cellKey,
  coordsEqual,
} from '../../game/gameTypes';
import { GameCell } from '../GameCell/GameCell';

interface GameBoardProps {
  puzzle: PuzzleDefinition;
  board: BoardGrid;
  validation: ValidationResult;
  selectedCell: CellCoord | null;
  activeHint: HintResult | null;
  pencilMode: boolean;
  isCelebrating: boolean;
  showRegionSymbols: boolean;
  shakeNonce: number;
  onTapCell: (coord: CellCoord) => void;
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
    validation,
    selectedCell,
    activeHint,
    pencilMode,
    isCelebrating,
    showRegionSymbols,
    shakeNonce,
    onTapCell,
    onDirectAction,
    onSelectCell,
    onBeginDragMark,
    onDragMarkCell,
    onEndDragMark,
  }) => {
    const { size, regions, initialCats } = puzzle;
    const isDraggingRef = useRef(false);
    const lastDragKeyRef = useRef<string | null>(null);

    // Precompute locked-cell lookup and region border bitmasks ONCE per puzzle
    const lockedSet = useMemo(() => {
      const set = new Set<string>();
      for (const c of initialCats) set.add(cellKey(c.row, c.col));
      return set;
    }, [initialCats]);

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

    const handleCellTap = useCallback(
      (row: number, col: number) => {
        onTapCell({ row, col });
      },
      [onTapCell]
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
        if (!isDraggingRef.current || !pencilMode) return;
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
      [pencilMode, onDragMarkCell]
    );

    const finishDrag = useCallback(() => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        lastDragKeyRef.current = null;
        onEndDragMark();
      }
    }, [onEndDragMark]);

    // Ensure drag finishes even if finger lifts outside board
    useEffect(() => {
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
      return () => {
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
      };
    }, [finishDrag]);

    // Keyboard navigation support
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        const curr = selectedCell ?? { row: 0, col: 0 };
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onSelectCell({ row: (curr.row - 1 + size) % size, col: curr.col });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onSelectCell({ row: (curr.row + 1) % size, col: curr.col });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onSelectCell({ row: curr.row, col: (curr.col - 1 + size) % size });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onSelectCell({ row: curr.row, col: (curr.col + 1) % size });
        } else if ((e.key === 'Enter' || e.key === ' ') && selectedCell) {
          e.preventDefault();
          onTapCell(selectedCell);
        } else if ((e.key === 'x' || e.key === 'X') && selectedCell) {
          e.preventDefault();
          onDirectAction(selectedCell, 'x');
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCell, size, onTapCell, onDirectAction, onSelectCell]);

    const gapClass = size === 8 ? 'gap-[4px] sm:gap-[5px]' : 'gap-[6px] sm:gap-[7px]';
    const paddingClass = size === 8 ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3';

    return (
      <div
        className="w-full h-full px-3.5 py-1 flex items-center justify-center"
        style={{ containerType: 'size' }}
      >
        <div
          role="grid"
          aria-label={`${size} by ${size} Meowdoku cat puzzle board`}
          onPointerMove={handleGridPointerMove}
          style={{
            width: 'min(calc(100cqw - 28px), calc(100cqh - 8px), 392px)',
            height: 'min(calc(100cqw - 28px), calc(100cqh - 8px), 392px)',
            touchAction: pencilMode ? 'none' : 'manipulation',
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

                // Subtle luminous sightlines on row, col, and 8-neighbors of selected tile
                const isSightline =
                  !pencilMode &&
                  selectedCell !== null &&
                  !isSelected &&
                  (selectedCell.row === r ||
                    selectedCell.col === c ||
                    (Math.abs(selectedCell.row - r) <= 1 && Math.abs(selectedCell.col - c) <= 1));

                const isConflicting = validation.conflictingCellKeys.has(key);
                const isHintTarget = activeHint
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
                    isSelected={isSelected}
                    isSightline={isSightline}
                    isConflicting={isConflicting}
                    isHintTarget={isHintTarget}
                    isLocked={lockedSet.has(key)}
                    isCelebrating={isCelebrating}
                    showSymbol={showRegionSymbols}
                    pencilMode={pencilMode}
                    shakeNonce={shakeNonce}
                    onCellTap={handleCellTap}
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
