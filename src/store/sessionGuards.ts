import { ActivePuzzleSave, GameMode, PuzzleDefinition } from '../game/gameTypes';

/**
 * Decides whether a persisted in-progress puzzle can be resumed safely.
 *
 * A save is rejected when:
 * - it belongs to another level or has the wrong board shape;
 * - it contains a cat that is not part of the puzzle's unique solution (e.g. the level's
 *   layout changed in an app update, or the save was tampered with) — resuming it would
 *   leave the player on a board that can never be completed;
 * - a locked starter cat is missing;
 * - it was played on another Daily difficulty variant (#24);
 * - it is a Classic session that already ran out of hearts (resuming would hand out
 *   free mistakes; Classic rules say the level restarts).
 */
export function isResumableSave(
  save: ActivePuzzleSave | null | undefined,
  puzzle: PuzzleDefinition
): boolean {
  if (!save || save.levelId !== puzzle.id) return false;
  if (save.board.length !== puzzle.size) return false;
  // A board from another Daily variant (#24) belongs to a different puzzle
  if ((save.dailyVariant ?? null) !== (puzzle.dailyVariant ?? null)) return false;
  for (let r = 0; r < puzzle.size; r++) {
    const row = save.board[r];
    if (!row || row.length !== puzzle.size) return false;
    for (let c = 0; c < puzzle.size; c++) {
      if (row[c] === 'cat' && !puzzle.solution.some((s) => s.row === r && s.col === c)) {
        return false;
      }
    }
  }
  for (const starter of puzzle.initialCats) {
    if (save.board[starter.row]?.[starter.col] !== 'cat') return false;
  }
  const mode: GameMode = save.gameMode ?? 'classic';
  if (mode === 'classic' && typeof save.hearts === 'number' && save.hearts <= 0) return false;
  return true;
}

export interface SessionSnapshotForMode {
  gameMode: GameMode;
  elapsedSec: number;
  mistakesCount: number;
  hintsUsed: number;
  undoStackLength: number;
  isSolved: boolean;
}

/**
 * Game-mode changes requested while a puzzle is in progress.
 * Downgrading Classic → Practice is always allowed immediately. Upgrading Practice → Classic
 * mid-puzzle would let a player make free mistakes and then claim Classic stars/perfect
 * stats, so the upgrade is deferred to the next puzzle.
 */
export function resolveSessionGameMode(
  session: SessionSnapshotForMode,
  requested: GameMode
): { sessionMode: GameMode; deferred: boolean } {
  if (requested === session.gameMode) return { sessionMode: requested, deferred: false };
  if (requested === 'practice') return { sessionMode: 'practice', deferred: false };

  const started =
    !session.isSolved &&
    (session.elapsedSec > 0 ||
      session.mistakesCount > 0 ||
      session.hintsUsed > 0 ||
      session.undoStackLength > 0);
  if (!started) return { sessionMode: 'classic', deferred: false };
  return { sessionMode: 'practice', deferred: true };
}
