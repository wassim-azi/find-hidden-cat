import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { UpcomingGoal } from '../../game/upcomingGoals';
import { getCollectibleCat } from '../../game/collectibleCats';
import { useGameStore } from '../../store/gameStore';

interface GoalCardProps {
  goal: UpcomingGoal;
  compact?: boolean;
  id?: string;
}

export function formatGoalLabel(goal: UpcomingGoal, t: TFunction): string {
  if (goal.kind === 'mission') {
    const metric = String(goal.labelParams.metric ?? '');
    return t(goal.labelKey, {
      ...goal.labelParams,
      title: t(`missions.items.${metric}.title`),
    });
  }
  if (goal.kind === 'next_world') {
    const worldId = goal.labelParams.worldId;
    return t(goal.labelKey, {
      ...goal.labelParams,
      world: t(`worlds.${worldId}.name`),
    });
  }
  if (goal.kind === 'cat_unlock') {
    const catId = String(goal.labelParams.catId ?? '');
    return t(goal.labelKey, {
      ...goal.labelParams,
      name: getCollectibleCat(catId).name,
    });
  }
  if (goal.kind === 'coins_for_item') {
    const itemId = String(goal.labelParams.itemId ?? '');
    return t(goal.labelKey, {
      ...goal.labelParams,
      item: t(`shop.items.${itemId}.name`),
    });
  }
  return t(goal.labelKey, goal.labelParams);
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, compact = false, id }) => {
  const { t } = useTranslation();
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const startLevel = useGameStore((s) => s.startLevel);

  const label = formatGoalLabel(goal, t);
  const pct = Math.min(100, Math.max(0, Math.round((goal.current / goal.target) * 100)));

  const handleTap = () => {
    if (goal.action === 'level' && typeof goal.levelId === 'number') {
      startLevel(goal.levelId, true);
      return;
    }
    if (goal.action !== 'level') {
      goToScreen(goal.action);
    }
  };

  return (
    <button
      id={id}
      type="button"
      onClick={handleTap}
      className={`w-full text-left rounded-2xl bg-white/90 border border-[#EDE3D4] hover:border-[#E2D2BC] active:scale-[0.985] transition-all cursor-pointer flex flex-col ${
        compact ? 'px-2.5 py-1.5 gap-1' : 'px-3.5 py-2.5 gap-1.5 shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Sparkles className="w-3.5 h-3.5 text-[#FF7A7A] shrink-0" />
          <span
            className={`font-extrabold text-[#3A312C] leading-snug ${
              compact ? 'text-[11px] truncate' : 'text-[12px] line-clamp-2'
            }`}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10.5px] font-black text-[#7E7067] tabular-nums">
            {goal.current} / {goal.target}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#A99B90]" />
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={goal.current}
        aria-valuemin={0}
        aria-valuemax={goal.target}
        className="w-full h-1.5 bg-[#F2E9DC] rounded-full overflow-hidden"
      >
        {reducedMotion ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF8B8B] via-[#F4B942] to-[#6EC194]"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#FF8B8B] via-[#F4B942] to-[#6EC194]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          />
        )}
      </div>
    </button>
  );
};
