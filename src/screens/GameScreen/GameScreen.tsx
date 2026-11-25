import React, { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Lightbulb, Sparkles, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useGameTimer } from '../../hooks/useGameTimer';
import { CellCoord } from '../../game/gameTypes';
import { GameHeader } from '../../components/GameHeader/GameHeader';
import { ProgressIndicator } from '../../components/ProgressIndicator/ProgressIndicator';
import { RuleCards } from '../../components/RuleCards/RuleCards';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { BottomToolbar } from '../../components/BottomToolbar/BottomToolbar';
import { PauseModal } from '../../components/Modals/PauseModal';
import { VictoryScreen } from '../VictoryScreen/VictoryScreen';

export const GameScreen: React.FC = () => {
  useGameTimer();

  // NOTE: elapsedSec is intentionally NOT subscribed here — LiveTimer inside GameHeader
  // isolates the 1s tick so GameScreen & GameBoard have ZERO re-renders per second!
  const puzzle = useGameStore((s) => s.puzzle);
  const board = useGameStore((s) => s.board);
  const validation = useGameStore((s) => s.validation);
  const selectedCell = useGameStore((s) => s.selectedCell);
  const pencilMode = useGameStore((s) => s.pencilMode);
  const canUndo = useGameStore((s) => s.undoStack.length > 0);
  const canRedo = useGameStore((s) => s.redoStack.length > 0);
  const activeHint = useGameStore((s) => s.activeHint);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const shakeNonce = useGameStore((s) => s.shakeNonce);
  const isPaused = useGameStore((s) => s.isPaused);
  const isCelebratingBoard = useGameStore((s) => s.isCelebratingBoard);
  const victorySummary = useGameStore((s) => s.victorySummary);
  const showRegionSymbols = useGameStore((s) => s.settings.showRegionSymbols);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const tapCell = useGameStore((s) => s.tapCell);
  const placeOrToggleDirect = useGameStore((s) => s.placeOrToggleDirect);
  const beginDragMark = useGameStore((s) => s.beginDragMark);
  const dragMarkCell = useGameStore((s) => s.dragMarkCell);
  const endDragMark = useGameStore((s) => s.endDragMark);
  const togglePencilMode = useGameStore((s) => s.togglePencilMode);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redo);
  const requestHint = useGameStore((s) => s.requestHint);
  const applyActiveHint = useGameStore((s) => s.applyActiveHint);
  const dismissHint = useGameStore((s) => s.dismissHint);
  const restartLevel = useGameStore((s) => s.restartLevel);
  const setPaused = useGameStore((s) => s.setPaused);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const setTutorialOpen = useGameStore((s) => s.setTutorialOpen);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const startNextLevel = useGameStore((s) => s.startNextLevel);

  const handleOpenPause = useCallback(() => setPaused(true), [setPaused]);
  const handleClosePause = useCallback(() => setPaused(false), [setPaused]);
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), [setSettingsOpen]);
  const handleOpenTutorial = useCallback(() => setTutorialOpen(true), [setTutorialOpen]);
  const handleGoLevels = useCallback(() => goToScreen('levels'), [goToScreen]);
  const handleSelectCell = useCallback(
    (coord: CellCoord) => useGameStore.setState({ selectedCell: coord }),
    []
  );

  return (
    <div className="relative h-full w-full flex flex-col justify-between overflow-hidden">
      {/* Top Bar (timer isolated internally) */}
      <GameHeader
        levelId={puzzle.id}
        dailyDateKey={puzzle.dailyDateKey}
        difficulty={puzzle.difficulty}
        onPause={handleOpenPause}
        onOpenSettings={handleOpenSettings}
        onLogoClick={handleGoLevels}
      />

      {/* Cat Silhouette Progress Tracker */}
      <ProgressIndicator
        size={puzzle.size}
        placedCount={validation.placedCatsCount}
        completedRegions={validation.completedRegions}
      />

      {/* Three Compact Visual Rule Cards */}
      <RuleCards
        violatedRules={validation.violatedRules}
        onOpenTutorial={handleOpenTutorial}
      />

      {/* Centerpiece Responsive 120fps Puzzle Board */}
      <main className="w-full flex-1 min-h-0 flex flex-col items-center justify-center">
        <GameBoard
          puzzle={puzzle}
          board={board}
          validation={validation}
          selectedCell={selectedCell}
          activeHint={activeHint}
          pencilMode={pencilMode}
          isCelebrating={isCelebratingBoard}
          showRegionSymbols={showRegionSymbols}
          shakeNonce={shakeNonce}
          onTapCell={tapCell}
          onDirectAction={placeOrToggleDirect}
          onSelectCell={handleSelectCell}
          onBeginDragMark={beginDragMark}
          onDragMarkCell={dragMarkCell}
          onEndDragMark={endDragMark}
        />
      </main>

      {/* Fixed-height Contextual Feedback / Hint / Helper Banner */}
      <div className="px-3.5 h-[50px] flex items-center justify-center shrink-0">
        <AnimatePresence mode="wait">
          {isCelebratingBoard ? (
            <motion.div
              key="celebrate-banner"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full rounded-2xl bg-[#E8F7EE] border border-[#9FD7B5] px-3 py-2 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#3A9462]" />
              <p className="text-[12.5px] font-black text-[#2C784E]">
                Purr-fect! Every hidden cat found!
              </p>
            </motion.div>
          ) : activeHint ? (
            <motion.div
              key="hint-banner"
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              className="w-full rounded-2xl bg-[#FFF7E2] border border-[#F2D58A] px-3 py-1.5 flex items-center justify-between gap-2 shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Lightbulb className="w-4 h-4 text-[#DF991E] shrink-0" />
                <p className="text-[11.5px] font-bold text-[#6E4D12] leading-tight line-clamp-2">
                  {activeHint.message}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {activeHint.canApply && (
                  <button
                    id="btn-apply-hint"
                    type="button"
                    onClick={applyActiveHint}
                    className="px-2.5 py-1 rounded-xl bg-[#E8A328] text-white text-[11px] font-black inline-flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Check className="w-3 h-3" strokeWidth={3} />
                    {activeHint.applyValue === 'cat' ? 'Place' : 'Fix'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismissHint}
                  aria-label="Dismiss hint"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#9A7A3A] hover:bg-[#F5E6BF] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : validation.primaryMessage ? (
            <motion.div
              key="conflict-banner"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              role="status"
              aria-live="polite"
              className="w-full rounded-2xl bg-[#FFF0F0] border border-[#F5B5B5] px-3 py-2 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-[#D94B4B] shrink-0" />
              <p className="text-[12px] font-extrabold text-[#B53D3D] leading-tight">
                {validation.primaryMessage}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="tip-banner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full rounded-2xl bg-white/80 border border-[#EDE3D4] px-3 py-2 flex items-center justify-center gap-1.5 text-center"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF8585] shrink-0" />
              <p className="text-[12px] font-bold text-[#7E7067] leading-tight">
                {pencilMode
                  ? 'Tap or drag across tiles to paint × marks'
                  : selectedCell
                    ? 'Tap highlighted tile again to place a cat'
                    : `${puzzle.title} — tap a tile to begin`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Toolbar */}
      <BottomToolbar
        pencilMode={pencilMode}
        canUndo={canUndo}
        canRedo={canRedo}
        hintsUsed={hintsUsed}
        onTogglePencil={togglePencilMode}
        onUndo={undo}
        onRedo={redo}
        onHint={requestHint}
        onReset={restartLevel}
      />

      {/* Pause Overlay */}
      <PauseModal
        open={isPaused}
        levelId={puzzle.id}
        levelTitle={puzzle.title}
        onResume={handleClosePause}
        onRestart={restartLevel}
        onOpenRules={() => {
          setPaused(false);
          setTutorialOpen(true);
        }}
        onExitToLevels={handleGoLevels}
      />

      {/* Victory Celebration Overlay */}
      <VictoryScreen
        summary={victorySummary}
        reducedMotion={reducedMotion}
        onNextLevel={startNextLevel}
        onReplay={restartLevel}
        onLevels={handleGoLevels}
      />
    </div>
  );
};
