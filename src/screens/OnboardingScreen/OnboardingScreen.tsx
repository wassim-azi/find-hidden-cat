import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowRight,
  Cat,
  Check,
  Lightbulb,
  MousePointerClick,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  BoardGrid,
  CellCoord,
  cellKey,
  coordsEqual,
} from '../../game/gameTypes';
import {
  brokenRule,
  createOnboardingBoard,
  getLitCellKeys,
  nextStepIndex,
  ONBOARDING_PUZZLE,
  ONBOARDING_STEPS,
  OnboardingBrokenRule,
} from '../../game/onboarding';
import { GameCell } from '../../components/GameCell/GameCell';
import { TactileButton } from '../../components/Buttons/TactileButton';
import { particleBus } from '../../components/Effects/ParticleCanvas';
import { soundManager } from '../../utils/sound';
import { triggerHaptic } from '../../utils/haptics';

const PointerCue: React.FC<{ reducedMotion: boolean; className?: string }> = ({
  reducedMotion,
  className = '',
}) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none z-30 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-[#3A312C] border-2 border-[#FF7A7A] shadow-[0_4px_10px_rgba(58,49,44,0.28)] ${
      reducedMotion ? '' : 'animate-bounce'
    } ${className}`}
  >
    <MousePointerClick className="w-4 h-4 text-[#FF6B6B]" strokeWidth={2.5} />
  </span>
);

export const OnboardingScreen: React.FC = () => {
  const { t } = useTranslation();
  const settings = useGameStore((s) => s.settings);
  const onboardingReturnScreen = useGameStore((s) => s.onboardingReturnScreen);
  const markTutorialSeen = useGameStore((s) => s.markTutorialSeen);
  const startLevel = useGameStore((s) => s.startLevel);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const closeOnboarding = useGameStore((s) => s.closeOnboarding);

  const isReplay = onboardingReturnScreen !== null;

  const [stepIndex, setStepIndex] = useState(0);
  const [board, setBoard] = useState<BoardGrid>(() => createOnboardingBoard());
  const [toolOn, setToolOn] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CellCoord | null>(null);
  const [wrongFlash, setWrongFlash] = useState<{
    cell: CellCoord;
    rule: OnboardingBrokenRule;
  } | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [pulsingTarget, setPulsingTarget] = useState(false);
  const [toolPulse, setToolPulse] = useState(false);

  const isDraggingRef = useRef(false);
  const lastDragKeyRef = useRef<string | null>(null);
  const dragStepCountRef = useRef(0);
  const wrongTimerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const toolAnimTimerRef = useRef<number | null>(null);

  const step = ONBOARDING_STEPS[stepIndex]!;
  const litSet = useMemo(() => getLitCellKeys(step), [step]);

  useEffect(() => {
    return () => {
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
      if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current);
      if (toolAnimTimerRef.current !== null) window.clearTimeout(toolAnimTimerRef.current);
    };
  }, []);

  const borderMasks = useMemo(() => {
    const { size, regions } = ONBOARDING_PUZZLE;
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
  }, []);

  const triggerTargetPulse = useCallback(() => {
    setPulsingTarget(true);
    if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => {
      pulseTimerRef.current = null;
      setPulsingTarget(false);
    }, 900);
  }, []);

  const transitionToStep = useCallback(
    (nextIdx: number) => {
      const nextStep = ONBOARDING_STEPS[nextIdx];
      if (!nextStep) return;

      isDraggingRef.current = false;
      lastDragKeyRef.current = null;
      setSelectedCell(null);
      setHintShown(false);
      setPulsingTarget(false);

      if (wrongTimerRef.current !== null) {
        window.clearTimeout(wrongTimerRef.current);
        wrongTimerRef.current = null;
      }
      setWrongFlash(null);

      if (nextStep.autoToolMode === 'off') {
        setToolOn((prev) => {
          if (prev) {
            setToolPulse(true);
            if (toolAnimTimerRef.current !== null) window.clearTimeout(toolAnimTimerRef.current);
            toolAnimTimerRef.current = window.setTimeout(() => setToolPulse(false), 450);
          }
          return false;
        });
      } else if (nextStep.autoToolMode === 'on') {
        setToolOn((prev) => {
          if (!prev) {
            setToolPulse(true);
            if (toolAnimTimerRef.current !== null) window.clearTimeout(toolAnimTimerRef.current);
            toolAnimTimerRef.current = window.setTimeout(() => setToolPulse(false), 450);
          }
          return true;
        });
      }

      setStepIndex(nextIdx);

      if (nextStep.id === 'done') {
        soundManager.play('victory', settings.soundEnabled);
        triggerHaptic('victory', settings.hapticsEnabled);
        if (!settings.reducedMotion) {
          particleBus.victoryFountain();
        }
      }
    },
    [settings.hapticsEnabled, settings.reducedMotion, settings.soundEnabled]
  );

  const placeCatAt = useCallback(
    (coord: CellCoord) => {
      if (step.goal !== 'place' || toolOn) return;
      if (!litSet.has(cellKey(coord.row, coord.col))) {
        triggerTargetPulse();
        return;
      }
      if (board[coord.row]?.[coord.col] !== 'empty') {
        triggerTargetPulse();
        return;
      }

      const isTarget = step.targetCells.some((c) => coordsEqual(c, coord));
      if (isTarget) {
        const nextBoard = board.map((row, r) =>
          row.map((val, c) => (r === coord.row && c === coord.col ? 'cat' : val))
        );
        setBoard(nextBoard);
        setSelectedCell(null);
        soundManager.play('placeCat', settings.soundEnabled);
        triggerHaptic('cat', settings.hapticsEnabled);
        const nextIdx = nextStepIndex(stepIndex, nextBoard, toolOn);
        if (nextIdx !== stepIndex) {
          transitionToStep(nextIdx);
        }
        return;
      }

      if (step.freePlay) {
        const rule = brokenRule(board, coord) ?? 'rowCol';
        const nextBoard = board.map((row, r) =>
          row.map((val, c) => (r === coord.row && c === coord.col ? 'cat' : val))
        );
        setBoard(nextBoard);
        setSelectedCell(null);
        setWrongFlash({ cell: coord, rule });

        if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
        wrongTimerRef.current = window.setTimeout(() => {
          wrongTimerRef.current = null;
          setBoard((cur) =>
            cur.map((row, r) =>
              row.map((val, c) =>
                r === coord.row && c === coord.col && val === 'cat' ? 'empty' : val
              )
            )
          );
          setWrongFlash(null);
        }, 900);
        return;
      }

      triggerTargetPulse();
    },
    [
      board,
      litSet,
      settings.hapticsEnabled,
      settings.soundEnabled,
      step,
      stepIndex,
      toolOn,
      transitionToStep,
      triggerTargetPulse,
    ]
  );

  const markXAt = useCallback(
    (coord: CellCoord, fromDrag = false) => {
      if (!toolOn) return;
      if (!litSet.has(cellKey(coord.row, coord.col))) {
        if (!fromDrag) triggerTargetPulse();
        return;
      }
      const curVal = board[coord.row]?.[coord.col];
      if (curVal !== 'empty') return; // Never overwrite cat or toggle X off

      const nextBoard = board.map((row, r) =>
        row.map((val, c) => (r === coord.row && c === coord.col ? 'x' : val))
      );
      setBoard(nextBoard);

      if (fromDrag) {
        dragStepCountRef.current += 1;
        soundManager.playDragX(dragStepCountRef.current, settings.soundEnabled);
      } else {
        soundManager.play('markX', settings.soundEnabled);
      }
      triggerHaptic('x', settings.hapticsEnabled);

      const nextIdx = nextStepIndex(stepIndex, nextBoard, toolOn);
      if (nextIdx !== stepIndex) {
        transitionToStep(nextIdx);
      }
    },
    [
      board,
      litSet,
      settings.hapticsEnabled,
      settings.soundEnabled,
      stepIndex,
      toolOn,
      transitionToStep,
      triggerTargetPulse,
    ]
  );

  const handleCellTap = useCallback(
    (row: number, col: number) => {
      const coord = { row, col };
      if (!litSet.has(cellKey(row, col))) {
        triggerTargetPulse();
        return;
      }
      if (step.goal === 'ack' || step.goal === 'toggleTool') {
        triggerTargetPulse();
        return;
      }
      if (toolOn) {
        markXAt(coord);
        return;
      }
      if (board[row]?.[col] !== 'empty') {
        triggerTargetPulse();
        return;
      }
      soundManager.play('select', settings.soundEnabled);
      triggerHaptic('select', settings.hapticsEnabled);
      setSelectedCell(coord);
    },
    [
      board,
      litSet,
      markXAt,
      settings.hapticsEnabled,
      settings.soundEnabled,
      step.goal,
      toolOn,
      triggerTargetPulse,
    ]
  );

  const handleCellDoubleTap = useCallback(
    (row: number, col: number) => {
      placeCatAt({ row, col });
    },
    [placeCatAt]
  );

  const handleCellLongPress = useCallback(
    (row: number, col: number) => {
      placeCatAt({ row, col });
    },
    [placeCatAt]
  );

  const handleKeyboardTap = useCallback(
    (row: number, col: number) => {
      const coord = { row, col };
      if (!litSet.has(cellKey(row, col))) {
        triggerTargetPulse();
        return;
      }
      if (step.goal === 'ack' || step.goal === 'toggleTool') {
        triggerTargetPulse();
        return;
      }
      if (toolOn) {
        markXAt(coord);
        return;
      }
      if (board[row]?.[col] !== 'empty') {
        triggerTargetPulse();
        return;
      }
      soundManager.play('select', settings.soundEnabled);
      triggerHaptic('select', settings.hapticsEnabled);
      setSelectedCell(coord);
    },
    [
      board,
      litSet,
      markXAt,
      settings.hapticsEnabled,
      settings.soundEnabled,
      step.goal,
      toolOn,
      triggerTargetPulse,
    ]
  );

  const handleCellPointerDown = useCallback(
    (row: number, col: number) => {
      if (!toolOn) return;
      isDraggingRef.current = true;
      lastDragKeyRef.current = `${row},${col}`;
      dragStepCountRef.current = 0;
      markXAt({ row, col }, true);
    },
    [markXAt, toolOn]
  );

  const handleGridPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !toolOn) return;
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const cellEl = target?.closest<HTMLElement>('[data-row][data-col]');
      if (!cellEl) return;

      const r = Number(cellEl.dataset.row);
      const c = Number(cellEl.dataset.col);
      if (Number.isNaN(r) || Number.isNaN(c)) return;

      const k = `${r},${c}`;
      if (k === lastDragKeyRef.current) return;
      lastDragKeyRef.current = k;
      markXAt({ row: r, col: c }, true);
    },
    [markXAt, toolOn]
  );

  useEffect(() => {
    const stopDrag = () => {
      isDraggingRef.current = false;
      lastDragKeyRef.current = null;
    };
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    return () => {
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, []);

  const handleToggleTool = () => {
    if (step.autoToolMode === 'off') {
      triggerTargetPulse();
      return;
    }
    const nextTool = !toolOn;
    soundManager.play('button', settings.soundEnabled);
    setToolOn(nextTool);
    if (nextTool) setSelectedCell(null);

    if (step.goal === 'toggleTool' && nextTool) {
      const nextIdx = nextStepIndex(stepIndex, board, nextTool);
      if (nextIdx !== stepIndex) {
        transitionToStep(nextIdx);
      }
    }
  };

  const handleSkip = () => {
    soundManager.play('button', settings.soundEnabled);
    if (isReplay) {
      closeOnboarding();
    } else {
      markTutorialSeen();
      goToScreen('welcome');
    }
  };

  const handleNext = () => {
    if (step.goal !== 'ack' || stepIndex >= ONBOARDING_STEPS.length - 1) return;
    soundManager.play('button', settings.soundEnabled);
    transitionToStep(stepIndex + 1);
  };

  const handleStartGame = () => {
    markTutorialSeen();
    startLevel(1, false);
  };

  const handleDone = () => {
    soundManager.play('button', settings.soundEnabled);
    closeOnboarding();
  };

  // First incomplete target cell for pointer cue & pulse
  const firstIncompleteTarget = useMemo(() => {
    if (step.goal === 'place') {
      return step.targetCells.find((c) => board[c.row]?.[c.col] !== 'cat') ?? null;
    }
    if (step.goal === 'markX') {
      return step.targetCells.find((c) => board[c.row]?.[c.col] !== 'x') ?? null;
    }
    return null;
  }, [board, step]);

  const showPlaceBar =
    step.goal === 'place' &&
    !toolOn &&
    selectedCell !== null &&
    board[selectedCell.row]?.[selectedCell.col] === 'empty';

  const pointerOnPlaceButton =
    showPlaceBar &&
    !step.freePlay &&
    firstIncompleteTarget !== null &&
    coordsEqual(selectedCell, firstIncompleteTarget);

  const pointerCell =
    !step.freePlay && !pointerOnPlaceButton ? firstIncompleteTarget : null;

  const instructionContent = useMemo(() => {
    const boldComponents = {
      bold: <strong className="font-black text-[#3A312C]" />,
    };
    if (step.id === 'placeFirst') {
      const modeKey =
        settings.controlMode === 'double-tap'
          ? 'doubleTap'
          : settings.controlMode === 'long-press'
            ? 'longPress'
            : 'tapConfirm';
      return (
        <Trans
          i18nKey={`onboarding.steps.placeFirst.${modeKey}`}
          values={{ place: t('game.ctxPlaceCat') }}
          components={boldComponents}
        />
      );
    }
    if (step.id === 'toolOn') {
      return (
        <Trans
          i18nKey="onboarding.steps.toolOn"
          values={{ tool: t('game.toolbar.markX') }}
          components={boldComponents}
        />
      );
    }
    if (step.regionId !== undefined) {
      return (
        <Trans
          i18nKey={step.instructionKey}
          values={{ color: t(`regions.${step.regionId}`) }}
          components={boldComponents}
        />
      );
    }
    return <Trans i18nKey={step.instructionKey} components={boldComponents} />;
  }, [settings.controlMode, step, t]);

  const completedRegions = useMemo(() => {
    const set = new Set<number>();
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r]![c] === 'cat') {
          set.add(ONBOARDING_PUZZLE.regions[r]![c]!);
        }
      }
    }
    return set;
  }, [board]);

  const isDone = step.id === 'done';
  const showToolBar = step.id !== 'done';

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden px-3.5 pt-2.5 pb-3">
      {/* Top Bar: Progress Dots + Skip */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1" aria-hidden="true">
          {ONBOARDING_STEPS.map((s, idx) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === stepIndex
                  ? 'w-5 bg-[#FF7A7A]'
                  : idx < stepIndex
                    ? 'w-2 bg-[#6EB58E]'
                    : 'w-1.5 bg-[#DFD4C4]'
              }`}
            />
          ))}
        </div>
        <span className="sr-only">
          {t('onboarding.stepAria', {
            num: stepIndex + 1,
            total: ONBOARDING_STEPS.length,
          })}
        </span>

        <button
          id="btn-onboarding-skip"
          type="button"
          onClick={handleSkip}
          className="px-3 py-1 rounded-full bg-white/90 border border-[#EAE0D2] text-[11.5px] font-extrabold text-[#6E5C4F] hover:text-[#3A312C] shadow-2xs cursor-pointer active:scale-95 shrink-0"
        >
          {t('onboarding.skip')}
        </button>
      </div>

      {/* Instruction Card */}
      <div
        id="onboarding-instruction"
        role="status"
        aria-live="polite"
        className="mt-1.5 rounded-2xl bg-white/95 border border-[#E8DDD0] px-3.5 py-2 shadow-[0_4px_14px_rgba(92,69,52,0.06)] shrink-0"
      >
        <p className="text-[12.5px] min-[360px]:text-[13.5px] font-bold text-[#5C4E45] leading-snug text-center">
          {instructionContent}
        </p>

        {wrongFlash && (
          <div className="mt-1.5 rounded-xl bg-[#FFF0F0] border border-[#F5B5B5] px-2.5 py-1 flex items-center justify-center gap-1.5 text-[#B53D3D] text-[11px] font-extrabold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{t(`onboarding.wrong.${wrongFlash.rule}`)}</span>
          </div>
        )}

        {hintShown && !wrongFlash && (
          <div className="mt-1.5 rounded-xl bg-[#FFF7E2] border border-[#F2D58A] px-2.5 py-1 flex items-center justify-center gap-1.5 text-[#6E4D12] text-[11px] font-bold">
            <Lightbulb className="w-3.5 h-3.5 text-[#E5A024] shrink-0" />
            <span>{t('onboarding.hint')}</span>
          </div>
        )}
      </div>

      {/* Guided 4x4 Board */}
      <main
        className="w-full flex-1 min-h-0 flex items-center justify-center py-1"
        style={{ containerType: 'size' }}
      >
        <div
          role="grid"
          aria-label={t('game.boardAria', { size: 4 })}
          onPointerMove={handleGridPointerMove}
          style={{
            width: 'min(calc(100cqw - 8px), calc(100cqh - 8px), 316px)',
            height: 'min(calc(100cqw - 8px), calc(100cqh - 8px), 316px)',
            touchAction: toolOn ? 'none' : 'manipulation',
          }}
          className="meow-board-frame rounded-[24px] p-2.5"
        >
          <div
            className="w-full h-full grid gap-[7px]"
            style={{
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
            }}
          >
            {ONBOARDING_PUZZLE.regions.map((rowRegions, r) =>
              rowRegions.map((regionId, c) => {
                const coord = { row: r, col: c };
                const key = cellKey(r, c);
                const val = board[r]![c]!;
                const isLit = litSet.has(key);
                const isSelected = coordsEqual(selectedCell, coord);
                const isWrongCell = Boolean(
                  wrongFlash && coordsEqual(wrongFlash.cell, coord)
                );
                const isHintCell =
                  hintShown &&
                  step.targetCells.some((tc) => coordsEqual(tc, coord));
                const isTargetPulse =
                  pulsingTarget &&
                  ((firstIncompleteTarget &&
                    coordsEqual(firstIncompleteTarget, coord)) ||
                    false);
                const showPointerHere =
                  pointerCell !== null && coordsEqual(pointerCell, coord);

                return (
                  <div key={key} className="relative w-full h-full">
                    <GameCell
                      cellId={`onboarding-cell-${r}-${c}`}
                      row={r}
                      col={c}
                      size={4}
                      regionId={regionId}
                      borderMask={borderMasks[r]![c]!}
                      value={val}
                      isManualX={val === 'x'}
                      isAutoX={false}
                      candidateMark={null}
                      showCandidates={false}
                      isSelected={isSelected}
                      isSightline={false}
                      isRegionCompleted={completedRegions.has(regionId)}
                      highlightCompletedRegions={false}
                      fadeCompletedRegions={false}
                      isConflicting={isWrongCell}
                      isMistakeFlash={isWrongCell}
                      isHintArea={false}
                      isHintTarget={isHintCell}
                      isLocked={false}
                      isCelebrating={isDone}
                      showSymbol={settings.showRegionSymbols}
                      highContrast={settings.highContrast}
                      pencilMode={toolOn}
                      pencilSubMode="x"
                      controlMode={settings.controlMode}
                      shakeNonce={isWrongCell ? 1 : 0}
                      dimmed={!isLit}
                      isTargetPulse={isTargetPulse}
                      onKeyboardTap={handleKeyboardTap}
                      onCellTap={handleCellTap}
                      onCellDoubleTap={handleCellDoubleTap}
                      onCellLongPress={handleCellLongPress}
                      onCellPointerDown={handleCellPointerDown}
                    />
                    {showPointerHere && (
                      <PointerCue
                        reducedMotion={settings.reducedMotion}
                        className="absolute -bottom-1.5 -right-1.5"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Contextual Action Area (Place Cat / Next / Hint / Start or Done) */}
      <div className="min-h-[46px] flex items-center justify-center gap-2 shrink-0 py-0.5">
        {step.id === 'ruleColor' && (
          <div className="relative w-full max-w-[260px]">
            <TactileButton
              id="btn-onboarding-next"
              variant="primary"
              size="sm"
              fullWidth
              onClick={handleNext}
            >
              <span>{t('onboarding.next')}</span>
              <ArrowRight className="w-4 h-4" />
            </TactileButton>
            <PointerCue
              reducedMotion={settings.reducedMotion}
              className="absolute -top-2 -right-2"
            />
          </div>
        )}

        {showPlaceBar && selectedCell && (
          <div className="relative w-full max-w-[260px]">
            <button
              id="btn-onboarding-place"
              type="button"
              onClick={() => placeCatAt(selectedCell)}
              className="w-full py-2 px-4 rounded-2xl bg-gradient-to-b from-[#FF8B8B] to-[#F26666] text-white text-[13px] font-black inline-flex items-center justify-center gap-1.5 shadow-[0_4px_0_#D85252] cursor-pointer active:scale-95"
            >
              <Cat className="w-4 h-4 shrink-0" />
              <span>{t('game.ctxPlaceCat')}</span>
            </button>
            {pointerOnPlaceButton && (
              <PointerCue
                reducedMotion={settings.reducedMotion}
                className="absolute -top-2 -right-2"
              />
            )}
          </div>
        )}

        {step.freePlay && !showPlaceBar && (
          <button
            id="btn-onboarding-hint"
            type="button"
            onClick={() => {
              soundManager.play('hint', settings.soundEnabled);
              setHintShown(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#FFF6DF] border border-[#F2D58A] text-[#8E5B10] text-[12px] font-black cursor-pointer active:scale-95"
          >
            <Lightbulb className="w-4 h-4 text-[#E5A024]" />
            <span>{t('onboarding.hintButton')}</span>
          </button>
        )}

        {isDone && (
          <div className="w-full max-w-[280px]">
            {isReplay ? (
              <TactileButton
                id="btn-onboarding-done"
                variant="primary"
                size="md"
                fullWidth
                onClick={handleDone}
              >
                <Check className="w-4 h-4" strokeWidth={3} />
                <span>{t('onboarding.done')}</span>
              </TactileButton>
            ) : (
              <TactileButton
                id="btn-onboarding-start"
                variant="primary"
                size="md"
                fullWidth
                onClick={handleStartGame}
                className="relative overflow-hidden btn-shimmer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('onboarding.start')}</span>
              </TactileButton>
            )}
          </div>
        )}
      </div>

      {/* Tool Bar (Notes × toggle) */}
      {showToolBar && (
        <div className="flex justify-center pt-1 shrink-0">
          <div className="relative">
            <button
              id="btn-onboarding-tool"
              type="button"
              onClick={handleToggleTool}
              aria-pressed={toolOn}
              className={`relative flex items-center gap-2 px-5 py-2 rounded-[18px] border text-[12px] font-extrabold transition-all cursor-pointer select-none active:scale-95 ${
                toolOn
                  ? 'bg-[#3A312C] border-[#3A312C] text-white shadow-[0_4px_12px_rgba(58,49,44,0.28)]'
                  : 'bg-white border-[#E6D9C7] text-[#5A4E47] shadow-[0_3px_8px_rgba(92,69,52,0.08)]'
              } ${
                step.goal === 'toggleTool'
                  ? 'ring-3 ring-[#FF7A7A]/70'
                  : toolPulse
                    ? 'scale-105 ring-2 ring-[#6EB58E]'
                    : ''
              }`}
            >
              <span className="relative inline-flex items-center">
                <Pencil className="w-4 h-4" strokeWidth={2.3} />
                <span
                  className={`ml-1 text-[10px] font-black px-1.5 rounded-full leading-tight ${
                    toolOn ? 'bg-[#FF7A7A] text-white' : 'bg-[#EAE0D2] text-[#5A4E47]'
                  }`}
                >
                  ×
                </span>
              </span>
              <span>{toolOn ? t('game.toolbar.xOn') : t('game.toolbar.markX')}</span>
            </button>
            {step.goal === 'toggleTool' && (
              <PointerCue
                reducedMotion={settings.reducedMotion}
                className="absolute -top-2.5 -right-2.5"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
