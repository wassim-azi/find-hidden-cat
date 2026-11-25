import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Cat,
  Check,
  Grid,
  Lightbulb,
  RotateCcw,
  Shield,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useGameTimer } from '../../hooks/useGameTimer';
import { CellCoord } from '../../game/gameTypes';
import { BoosterId } from '../../game/economy';
import { formatLocalizedDate } from '../../i18n';
import { GameHeader } from '../../components/GameHeader/GameHeader';
import { ProgressIndicator } from '../../components/ProgressIndicator/ProgressIndicator';
import { RuleCards } from '../../components/RuleCards/RuleCards';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { BottomToolbar } from '../../components/BottomToolbar/BottomToolbar';
import { PauseModal } from '../../components/Modals/PauseModal';
import { VictoryScreen } from '../VictoryScreen/VictoryScreen';

const LIVE_BOOSTERS: readonly {
  id: BoosterId;
  color: string;
  bg: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'superHint',
    color: '#7B5CC7',
    bg: '#F3ECFD',
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: 'revealCat',
    color: '#DF5E70',
    bg: '#FFF0F3',
    icon: <Cat className="w-4 h-4" />,
  },
  {
    id: 'revealRegion',
    color: '#CE6F38',
    bg: '#FFF2E8',
    icon: <Grid className="w-4 h-4" />,
  },
  {
    id: 'mistakeShield',
    color: '#3B8B61',
    bg: '#E8F7EE',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    id: 'undoToken',
    color: '#4384A6',
    bg: '#EAF5FB',
    icon: <RotateCcw className="w-4 h-4" />,
  },
];

export const GameScreen: React.FC = () => {
  useGameTimer();
  const { t, i18n } = useTranslation();
  const [boostersOpen, setBoostersOpen] = useState(false);

  const puzzle = useGameStore((s) => s.puzzle);
  const board = useGameStore((s) => s.board);
  const validation = useGameStore((s) => s.validation);
  const selectedCell = useGameStore((s) => s.selectedCell);
  const pencilMode = useGameStore((s) => s.pencilMode);
  const canUndo = useGameStore((s) => s.undoStack.length > 0);
  const canRedo = useGameStore((s) => s.redoStack.length > 0);
  const activeHint = useGameStore((s) => s.activeHint);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const boosters = useGameStore((s) => s.boosters);
  const isMistakeShieldActive = useGameStore((s) => s.isMistakeShieldActive);
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
  const useBooster = useGameStore((s) => s.useBooster);
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
  const handleGoMap = useCallback(() => {
    const summary = useGameStore.getState().victorySummary;
    goToScreen('map');
    if (summary?.unlockedNextWorld) {
      useGameStore.setState({ unlockedWorldModal: summary.unlockedNextWorld });
    } else if (summary?.newlyUnlockedCats && summary.newlyUnlockedCats.length > 0) {
      useGameStore.setState({ unlockedCatModal: summary.newlyUnlockedCats[0]! });
    }
  }, [goToScreen]);

  const handleSelectCell = useCallback(
    (coord: CellCoord) => useGameStore.setState({ selectedCell: coord }),
    []
  );

  const totalExtraBoosters =
    boosters.superHint +
    boosters.revealCat +
    boosters.revealRegion +
    boosters.mistakeShield +
    boosters.undoToken;

  const lang = i18n.language.startsWith('fr') ? 'fr' : 'en';
  const localizedLevelTitle = puzzle.dailyDateKey
    ? puzzle.dailyDateKey.startsWith('golden-')
      ? t('levels.goldenTitle', { week: puzzle.dailyDateKey.replace('golden-', '') })
      : t('levels.dailyTitle', { date: formatLocalizedDate(puzzle.dailyDateKey, lang) })
    : t(`levels.${puzzle.id}`, { defaultValue: puzzle.title });

  return (
    <div className="relative h-full w-full flex flex-col justify-between overflow-hidden">
      <GameHeader
        levelId={puzzle.id}
        dailyDateKey={puzzle.dailyDateKey}
        difficulty={puzzle.difficulty}
        onPause={handleOpenPause}
        onOpenSettings={handleOpenSettings}
        onLogoClick={handleGoMap}
      />

      <ProgressIndicator
        size={puzzle.size}
        placedCount={validation.placedCatsCount}
        completedRegions={validation.completedRegions}
      />

      <RuleCards
        violatedRules={validation.violatedRules}
        onOpenTutorial={handleOpenTutorial}
      />

      <main className="w-full flex-1 min-h-0 flex flex-col items-center justify-center relative">
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

        <AnimatePresence>
          {boostersOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="absolute bottom-1.5 inset-x-3.5 z-30 meow-toolbar rounded-2xl p-2 grid grid-cols-5 gap-1.5"
            >
              {LIVE_BOOSTERS.map((b) => {
                const qty = boosters[b.id];
                return (
                  <button
                    key={b.id}
                    id={`btn-use-booster-${b.id}`}
                    type="button"
                    onClick={() => {
                      useBooster(b.id);
                      setBoostersOpen(false);
                    }}
                    style={{ backgroundColor: b.bg, color: b.color }}
                    className="relative flex flex-col items-center justify-center py-1.5 rounded-xl cursor-pointer active:scale-92 transition-transform"
                  >
                    {b.icon}
                    <span className="text-[9px] min-[360px]:text-[9.5px] font-black leading-none mt-1 truncate max-w-full px-0.5">
                      {t(`shop.items.${b.id}.short`)}
                    </span>
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#3A312C] text-white text-[9px] font-black flex items-center justify-center border border-white tabular-nums">
                      {qty}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="px-3.5 h-[50px] flex items-center justify-between gap-2 shrink-0">
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {isCelebratingBoard ? (
              <motion.div
                key="celebrate-banner"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-2xl bg-[#E8F7EE] border border-[#9FD7B5] px-3 py-2 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#3A9462] shrink-0" />
                <p className="text-[12px] font-black text-[#2C784E] truncate">
                  {t('game.celebrateBanner')}
                </p>
              </motion.div>
            ) : activeHint ? (
              <motion.div
                key="hint-banner"
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                className="w-full rounded-2xl bg-[#FFF7E2] border border-[#F2D58A] px-2.5 py-1.5 flex items-center justify-between gap-1.5 shadow-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Lightbulb className="w-4 h-4 text-[#DF991E] shrink-0" />
                  <p className="text-[10.5px] font-bold text-[#6E4D12] leading-tight line-clamp-2">
                    {activeHint.message}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {activeHint.canApply && (
                    <button
                      id="btn-apply-hint"
                      type="button"
                      onClick={applyActiveHint}
                      className="px-2 py-1 rounded-xl bg-[#E8A328] text-white text-[10px] font-black inline-flex items-center gap-0.5 cursor-pointer active:scale-95"
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                      {activeHint.applyValue === 'cat'
                        ? t('game.hintPlace')
                        : t('game.hintFix')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={dismissHint}
                    aria-label={t('game.dismissHintAria')}
                    className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-[#9A7A3A] cursor-pointer"
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
                <p className="text-[11px] font-extrabold text-[#B53D3D] leading-tight truncate">
                  {validation.primaryMessage}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="tip-banner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-2xl bg-white/85 border border-[#EDE3D4] px-3 py-2 flex items-center justify-center gap-1.5 text-center"
              >
                {isMistakeShieldActive ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-[#3B8B61] shrink-0" />
                    <p className="text-[11px] font-extrabold text-[#2D754E] truncate">
                      {t('game.shieldActiveBanner')}
                    </p>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#FF8585] shrink-0" />
                    <p className="text-[11px] font-bold text-[#7E7067] truncate">
                      {pencilMode
                        ? t('game.tipDragX')
                        : selectedCell
                          ? t('game.tipTapAgain')
                          : localizedLevelTitle}
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          id="btn-open-boosters"
          type="button"
          onClick={() => setBoostersOpen((v) => !v)}
          aria-expanded={boostersOpen}
          aria-label={t('game.openBoostersAria')}
          className={`relative h-9 px-2.5 rounded-2xl border flex items-center gap-1 text-[11px] font-black shrink-0 cursor-pointer active:scale-94 transition-all ${
            boostersOpen
              ? 'bg-[#7B5CC7] border-[#7B5CC7] text-white'
              : 'bg-[#F3ECFD] border-[#DFD2F8] text-[#6B4EB5]'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>{t('game.itemsButton')}</span>
          {totalExtraBoosters > 0 && (
            <span className="min-w-4 h-4 px-1 rounded-full bg-[#FF7A7A] text-white text-[9px] font-black flex items-center justify-center">
              {totalExtraBoosters}
            </span>
          )}
        </button>
      </div>

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

      <PauseModal
        open={isPaused}
        levelId={puzzle.id}
        levelTitle={localizedLevelTitle}
        onResume={handleClosePause}
        onRestart={restartLevel}
        onOpenRules={() => {
          setPaused(false);
          setTutorialOpen(true);
        }}
        onExitToLevels={handleGoMap}
      />

      <VictoryScreen
        summary={victorySummary}
        reducedMotion={reducedMotion}
        onNextLevel={startNextLevel}
        onReplay={restartLevel}
        onLevels={handleGoMap}
      />
    </div>
  );
};
