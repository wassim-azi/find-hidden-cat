import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Crown,
  Gift,
  Heart,
  HelpCircle,
  Lock,
  Sparkles,
  Star,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getLevelMetaList, TOTAL_LEVELS } from '../../game/levels';
import {
  getNextWorldAfter,
  getSpecialNodeInfo,
  getWorldForLevel,
  WORLDS,
  WorldDefinition,
} from '../../game/worlds';
import { getCollectibleCat } from '../../game/collectibleCats';
import { CatIllustration } from '../../components/Cat/CatIllustration';
import { HubHeader } from '../../components/Navigation/HubHeader';

const NODE_STEP_Y = 98;
const WORLD_BANNER_EXTRA_H = 126;
const TOP_SUMMIT_PAD = 118;
const BOTTOM_START_PAD = 104;
const X_PATTERN_PCT = [50, 74, 30, 72, 28, 56];

interface PositionedNode {
  levelId: number;
  title: string;
  size: 6 | 8;
  xPct: number;
  y: number;
  world: WorldDefinition;
}

interface WorldZoneLayout {
  world: WorldDefinition;
  topY: number;
  height: number;
  bannerY: number;
}

function buildJourneyLayout(): {
  totalHeight: number;
  nodes: PositionedNode[];
  zones: WorldZoneLayout[];
} {
  const levels = getLevelMetaList();
  const nodes: PositionedNode[] = [];
  const zones: WorldZoneLayout[] = [];

  let cursorY = TOP_SUMMIT_PAD;
  const worldsTopToBottom = [...WORLDS].reverse();

  for (const world of worldsTopToBottom) {
    const zoneTopY = cursorY;
    const bannerY = cursorY + 12;
    cursorY += WORLD_BANNER_EXTRA_H;

    const worldLevels = levels
      .filter((l) => l.id >= world.levelStart && l.id <= world.levelEnd)
      .sort((a, b) => b.id - a.id);

    for (const lvl of worldLevels) {
      const idxInWorld = lvl.id - world.levelStart;
      const xPct = X_PATTERN_PCT[idxInWorld % X_PATTERN_PCT.length]!;
      nodes.push({
        levelId: lvl.id,
        title: lvl.title,
        size: lvl.size,
        xPct,
        y: cursorY + 34,
        world,
      });
      cursorY += NODE_STEP_Y;
    }

    const zoneBottomY = cursorY + 14;
    zones.push({
      world,
      topY: zoneTopY,
      height: zoneBottomY - zoneTopY,
      bannerY,
    });
    cursorY = zoneBottomY;
  }

  nodes.sort((a, b) => a.levelId - b.levelId);

  return {
    totalHeight: cursorY + BOTTOM_START_PAD,
    nodes,
    zones,
  };
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function getSpecialLabelKey(levelId: number): string {
  const map: Record<number, string> = {
    4: 'map.special.treasure',
    6: 'map.special.boss_6',
    9: 'map.special.rescue',
    12: 'map.special.boss_12',
    15: 'map.special.mystery',
    18: 'map.special.boss_18',
    21: 'map.special.treasure_21',
    24: 'map.special.boss_24',
  };
  return map[levelId] ?? '';
}

const WorldDecorations: React.FC<{ decorType: WorldDefinition['decorType'] }> = React.memo(
  ({ decorType }) => {
    if (decorType === 'meadow') {
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-65">
          <span className="absolute top-36 left-5 w-6 h-6 rounded-full bg-[#FFE28A] blur-[1px]" />
          <span className="absolute top-64 right-6 w-5 h-5 rounded-full bg-[#B9E2C4]" />
          <span className="absolute bottom-32 left-8 w-8 h-4 rounded-full bg-white/80" />
          <span className="absolute bottom-52 right-10 w-10 h-5 rounded-full bg-white/75" />
        </div>
      );
    }
    if (decorType === 'candy') {
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-65">
          <span className="absolute top-40 right-6 w-6 h-6 rounded-full bg-[#FFB8C8]" />
          <span className="absolute top-72 left-6 w-7 h-4 rounded-full bg-[#B8EAD0]" />
          <span className="absolute bottom-40 right-8 w-5 h-5 rounded-full bg-[#FFE08A]" />
          <span className="absolute bottom-24 left-10 w-8 h-4 rounded-full bg-white/80" />
        </div>
      );
    }
    if (decorType === 'twilight') {
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-75">
          <span className="absolute top-44 left-7 text-[#F5C553] text-sm">✦</span>
          <span className="absolute top-80 right-7 text-[#F5C553] text-xs">★</span>
          <span className="absolute bottom-36 left-9 text-[#B8A6E0] text-sm">✦</span>
          <span className="absolute bottom-60 right-9 text-[#F5C553] text-xs">✦</span>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-80">
        <span className="absolute top-36 right-7 text-[#E5B842] text-base">✦</span>
        <span className="absolute top-72 left-6 text-[#9B86D4] text-sm">★</span>
        <span className="absolute bottom-44 right-8 text-[#FF94A8] text-sm">✦</span>
        <span className="absolute bottom-24 left-10 text-[#E5B842] text-xs">★</span>
      </div>
    );
  }
);
WorldDecorations.displayName = 'WorldDecorations';

export const MapScreen: React.FC = () => {
  const { t } = useTranslation();
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const activeMascotCatId = useGameStore((s) => s.activeMascotCatId);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const startLevel = useGameStore((s) => s.startLevel);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentNodeRef = useRef<HTMLDivElement | null>(null);

  const layout = useMemo(() => buildJourneyLayout(), []);
  const activeMascot = getCollectibleCat(activeMascotCatId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      currentNodeRef.current?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [unlockedLevelId, reducedMotion]);

  const currentWorld = getWorldForLevel(unlockedLevelId);
  const nextWorld = getNextWorldAfter(currentWorld.id);
  const levelsLeftInWorld = Math.max(0, currentWorld.levelEnd - unlockedLevelId + 1);
  const completedAll = Boolean(levelProgress[TOTAL_LEVELS]?.completed);

  const allPoints = useMemo(
    () => layout.nodes.map((n) => ({ x: (n.xPct / 100) * 360, y: n.y })),
    [layout.nodes]
  );

  const unlockedPoints = useMemo(
    () =>
      layout.nodes
        .filter((n) => n.levelId <= unlockedLevelId)
        .map((n) => ({ x: (n.xPct / 100) * 360, y: n.y })),
    [layout.nodes, unlockedLevelId]
  );

  const fullPathD = useMemo(() => buildSmoothPath(allPoints), [allPoints]);
  const unlockedPathD = useMemo(() => buildSmoothPath(unlockedPoints), [unlockedPoints]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative">
      <HubHeader title={t('map.headerTitle')} />

      {/* Gentle Engagement Nudge Strip */}
      <div className="px-3.5 pb-1.5 shrink-0 z-20">
        <div className="meow-card rounded-2xl px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#FF7A7A] shrink-0" />
            <p className="text-[11px] font-extrabold text-[#5A4E47] truncate">
              {completedAll
                ? t('map.completedAllNudge')
                : nextWorld
                  ? t('map.nextWorldNudge', {
                      count: levelsLeftInWorld,
                      world: t(`worlds.${nextWorld.id}.name`),
                    })
                  : t('map.summitNudge', { count: levelsLeftInWorld })}
            </p>
          </div>
          <button
            id="btn-map-jump-current"
            type="button"
            onClick={() =>
              currentNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            className="text-[10.5px] font-black text-[#E85E6B] bg-[#FFF0F0] px-2 py-0.5 rounded-full shrink-0 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            {t('common.levelShort', { id: unlockedLevelId })}
          </button>
        </div>
      </div>

      {/* Scrollable Vertical Winding World Canvas */}
      <div ref={scrollRef} id="level-map-scroll" className="flex-1 soft-scroll relative w-full">
        <div
          className="relative w-full mx-auto overflow-hidden"
          style={{ height: `${layout.totalHeight}px` }}
        >
          {/* Summit Cloud Banner */}
          <div
            className="absolute inset-x-0 top-0 flex flex-col items-center justify-center px-5 text-center"
            style={{
              height: `${TOP_SUMMIT_PAD}px`,
              background: 'linear-gradient(180deg, #E2DCF7 0%, #EAE4FA 100%)',
            }}
          >
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/85 text-[#6E56B2] text-[10px] font-black uppercase tracking-wider shadow-xs">
              <Crown className="w-3 h-3" />
              {t('map.cloudSummitBadge')}
            </span>
            <p className="text-[13.5px] font-black text-[#4A3C6E] mt-1">
              {t('map.cloudSummitTitle')}
            </p>
            <p className="text-[11px] font-bold text-[#7B6DA0]">
              {t('map.cloudSummitSubtitle')}
            </p>
          </div>

          {/* World Background Zones */}
          {layout.zones.map(({ world, topY, height, bannerY }) => {
            const isWorldUnlocked = unlockedLevelId >= world.levelStart;
            const worldStars = Array.from(
              { length: world.levelEnd - world.levelStart + 1 },
              (_, i) => levelProgress[world.levelStart + i]?.stars ?? 0
            ).reduce((a, b) => a + b, 0);
            const maxWorldStars = (world.levelEnd - world.levelStart + 1) * 3;
            const worldName = t(`worlds.${world.id}.name`);
            const worldSubtitle = t(`worlds.${world.id}.subtitle`);

            return (
              <div
                key={world.id}
                style={{
                  top: `${topY}px`,
                  height: `${height}px`,
                  background: `linear-gradient(180deg, ${world.skyTop} 0%, ${world.skyBottom} 100%)`,
                }}
                className="absolute inset-x-0 border-t border-white/60"
              >
                <WorldDecorations decorType={world.decorType} />

                <div style={{ top: `${bannerY - topY}px` }} className="absolute inset-x-3.5 z-10">
                  <div
                    className={`relative h-[94px] rounded-[22px] overflow-hidden border-2 shadow-[0_8px_20px_rgba(74,56,42,0.12)] ${
                      isWorldUnlocked
                        ? 'border-white/95'
                        : 'border-white/60 grayscale-[45%] opacity-85'
                    }`}
                  >
                    <img
                      src={world.bannerImage}
                      alt={worldName}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2D241E]/75 via-[#2D241E]/35 to-transparent" />
                    <div className="absolute inset-0 p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${world.badgeBg} ${world.badgeText}`}
                        >
                          {t('map.worldBadge', { id: world.id })}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-[#2D241E]/55 backdrop-blur-xs px-2 py-0.5 rounded-full tabular-nums">
                          <Star className="w-3 h-3 text-[#F4B942] fill-[#F4B942]" />
                          {worldStars}/{maxWorldStars}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-[17px] font-black text-white leading-tight drop-shadow-xs">
                          {worldName}
                        </h2>
                        <p className="text-[11px] font-bold text-white/90 leading-tight">
                          {isWorldUnlocked
                            ? worldSubtitle
                            : t('map.unlockPreviousHint', { id: world.levelStart - 1 })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom Meadow Floor under Level 1 */}
          <div
            className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-5"
            style={{
              height: `${BOTTOM_START_PAD}px`,
              background: 'linear-gradient(180deg, #E9F4E4 0%, #DFEDD8 100%)',
            }}
          >
            <span className="text-[11px] font-black uppercase tracking-wider text-[#5A8565] bg-white/80 px-3 py-1 rounded-full shadow-xs">
              {t('map.startOfJourney')}
            </span>
          </div>

          {/* Continuous SVG Winding Path */}
          <svg
            viewBox={`0 0 360 ${layout.totalHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            aria-hidden="true"
          >
            <path
              d={fullPathD}
              fill="none"
              stroke="rgba(96, 74, 54, 0.16)"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <path
              d={fullPathD}
              fill="none"
              stroke="#FFF8EE"
              strokeWidth="20"
              strokeLinecap="round"
            />
            <path
              d={fullPathD}
              fill="none"
              stroke="#DFD0BC"
              strokeWidth="3.5"
              strokeDasharray="7 10"
              strokeLinecap="round"
            />
            {unlockedPathD && (
              <path
                d={unlockedPathD}
                fill="none"
                stroke="#FF9A8B"
                strokeWidth="7"
                strokeLinecap="round"
                opacity="0.82"
              />
            )}
          </svg>

          {/* Interactive Winding Level Nodes */}
          {layout.nodes.map((node) => {
            const prog = levelProgress[node.levelId];
            const isCompleted = Boolean(prog?.completed);
            const isUnlocked = node.levelId <= unlockedLevelId || isCompleted;
            const isCurrent = node.levelId === unlockedLevelId;
            const special = getSpecialNodeInfo(node.levelId);
            const isSpecial = special.type !== 'normal';
            const specialKey = getSpecialLabelKey(node.levelId);
            const localizedTitle = t(`levels.${node.levelId}`, { defaultValue: node.title });

            const bgColor = !isUnlocked
              ? '#E3DBD0'
              : isCurrent
                ? '#FF7676'
                : special.type === 'boss'
                  ? '#9B7CE0'
                  : special.type === 'treasure'
                    ? '#F0B23A'
                    : special.type === 'rescue'
                      ? '#EB7B9B'
                      : special.type === 'mystery'
                        ? '#6FAFD4'
                        : node.world.nodeAccent;

            const shadowColor = !isUnlocked
              ? '#C8BEB0'
              : isCurrent
                ? '#D64C4C'
                : special.type === 'boss'
                  ? '#6E50B5'
                  : special.type === 'treasure'
                    ? '#C48418'
                    : special.type === 'rescue'
                      ? '#BD4F70'
                      : special.type === 'mystery'
                        ? '#4684A8'
                        : node.world.nodeShadow;

            const nodeDim = isCurrent || special.type === 'boss' ? 68 : 60;

            return (
              <div
                key={node.levelId}
                ref={isCurrent ? currentNodeRef : undefined}
                style={{ left: `${node.xPct}%`, top: `${node.y}px` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
              >
                {isCurrent && (
                  <motion.div
                    animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    className="mb-1.5 px-2.5 py-0.5 rounded-full bg-[#FF6B6B] text-white text-[10px] font-black uppercase tracking-wider shadow-[0_4px_10px_rgba(255,107,107,0.4)] border border-white/80 whitespace-nowrap"
                  >
                    {t('map.playTag')}
                  </motion.div>
                )}

                {!isCurrent && isSpecial && specialKey && (
                  <span
                    className={`mb-1 px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-tight whitespace-nowrap shadow-xs ${
                      isUnlocked
                        ? 'bg-white/95 text-[#5A4E47]'
                        : 'bg-white/70 text-[#9B8E82]'
                    }`}
                  >
                    {t(specialKey)}
                  </span>
                )}

                <div className="relative flex items-center justify-center">
                  {isCurrent && !reducedMotion && (
                    <motion.span
                      aria-hidden="true"
                      animate={{ scale: [1, 1.32, 1], opacity: [0.55, 0, 0.55] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full bg-[#FF7A7A] pointer-events-none"
                    />
                  )}

                  {isCurrent && (
                    <motion.div
                      animate={reducedMotion ? undefined : { y: [0, -5, 0], rotate: [-3, 3, -3] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                      className={`absolute ${
                        node.xPct > 55 ? '-left-14' : '-right-14'
                      } -top-2 w-13 h-13 rounded-2xl bg-white/95 border-2 border-[#FFF1D6] shadow-[0_6px_14px_rgba(92,69,52,0.18)] flex items-center justify-center p-1 pointer-events-none`}
                    >
                      <CatIllustration
                        breed={activeMascot.breed}
                        mood="happy"
                        className="w-full h-full"
                      />
                    </motion.div>
                  )}

                  <motion.button
                    id={`level-card-${node.levelId}`}
                    type="button"
                    whileTap={{ scale: 0.91 }}
                    onClick={() => startLevel(node.levelId, isCurrent)}
                    aria-label={
                      isCompleted
                        ? t('map.nodeAriaCompleted', {
                            id: node.levelId,
                            title: localizedTitle,
                            stars: prog?.stars ?? 0,
                          })
                        : isCurrent
                          ? t('map.nodeAriaCurrent', {
                              id: node.levelId,
                              title: localizedTitle,
                            })
                          : t('map.nodeAriaLocked', {
                              id: node.levelId,
                              title: localizedTitle,
                            })
                    }
                    style={{
                      width: `${nodeDim}px`,
                      height: `${nodeDim}px`,
                      backgroundColor: bgColor,
                      boxShadow: `0 5px 0 ${shadowColor}, 0 10px 18px rgba(58, 49, 44, 0.18), inset 0 3px 0 rgba(255,255,255,0.38)`,
                    }}
                    className={`relative rounded-full border-[3.5px] border-white flex flex-col items-center justify-center select-none cursor-pointer transition-transform ${
                      !isUnlocked ? 'opacity-90' : ''
                    }`}
                  >
                    {!isUnlocked ? (
                      <>
                        <Lock className="w-4 h-4 text-[#8C8075]" strokeWidth={2.6} />
                        <span className="text-[11px] font-black text-[#8C8075] leading-none mt-0.5">
                          {node.levelId}
                        </span>
                      </>
                    ) : (
                      <>
                        {special.type === 'boss' && (
                          <Crown className="w-3.5 h-3.5 text-[#FFE894] fill-[#FFE894] -mb-0.5" />
                        )}
                        {special.type === 'treasure' && (
                          <Gift className="w-3.5 h-3.5 text-white -mb-0.5" />
                        )}
                        {special.type === 'rescue' && (
                          <Heart className="w-3.5 h-3.5 text-white fill-white -mb-0.5" />
                        )}
                        {special.type === 'mystery' && (
                          <HelpCircle className="w-3.5 h-3.5 text-white -mb-0.5" />
                        )}
                        <span className="text-[20px] font-black text-white leading-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.2)]">
                          {node.levelId}
                        </span>
                        <span className="text-[8.5px] font-black text-white/85 leading-none mt-0.5">
                          {node.size}×{node.size}
                        </span>
                      </>
                    )}
                  </motion.button>
                </div>

                {isCompleted && (
                  <div className="flex items-center justify-center gap-0.5 mt-1.5 bg-white/92 px-2 py-0.5 rounded-full shadow-xs border border-[#EAE0D2]">
                    {[1, 2, 3].map((s) => {
                      const earned = (prog?.stars ?? 0) >= s;
                      return (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            earned
                              ? 'text-[#F4B942] fill-[#F4B942]'
                              : 'text-[#DFD5C7] fill-[#EFE7DA]'
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
