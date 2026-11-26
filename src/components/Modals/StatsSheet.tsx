import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Download, X } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { COLLECTIBLE_CATS } from '../../game/collectibleCats';
import { isStreakUiAllowed } from '../../game/familyMode';
import { TOTAL_LEVELS } from '../../game/levels';
import { TECHNIQUE_RANK } from '../../game/logicalSolver';
import { DIFFICULTY_TIERS, MIN_CLASSIFY_SAMPLES } from '../../game/skillProfile';
import { buildLast14Days, buildStatsExport } from '../../game/statsExport';
import { formatLocalizedDate, getCurrentLanguage } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { formatDuration } from '../../utils/format';

interface StatsSheetProps {
  open: boolean;
  onClose: () => void;
}

export const StatsSheet: React.FC<StatsSheetProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const progressStats = useGameStore((s) => s.progressStats);
  const skillProfile = useGameStore((s) => s.skillProfile);
  const dailyLogin = useGameStore((s) => s.dailyLogin);
  const unlockedCatIds = useGameStore((s) => s.unlockedCatIds);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const settings = useGameStore((s) => s.settings);

  const lang = getCurrentLanguage();
  const lt = progressStats.lifetime;
  const streakUiAllowed = isStreakUiAllowed(settings);

  const last14 = useMemo(
    () => buildLast14Days(progressStats.byDay, Date.now()),
    [progressStats.byDay, open]
  );
  const last14Total = last14.reduce((sum, d) => sum + d.puzzlesCompleted, 0);
  const last14Max = Math.max(1, ...last14.map((d) => d.puzzlesCompleted));

  const tierRows = DIFFICULTY_TIERS.filter(
    (tier) => (skillProfile.classic[tier]?.samples ?? 0) >= MIN_CLASSIFY_SAMPLES
  ).map((tier) => ({
    tier,
    stats: skillProfile.classic[tier]!,
  }));

  const metTechniqueRanks = ([1, 2, 3, 4] as const).filter((rank) =>
    lt.techniquesSeen.some((tech) => TECHNIQUE_RANK[tech] === rank)
  );

  const totals = [
    { id: 'stat-puzzles', label: t('stats.puzzles'), value: String(lt.puzzlesCompleted) },
    {
      id: 'stat-campaign',
      label: t('stats.campaign'),
      value: `${lt.campaignFirstClears}/${TOTAL_LEVELS}`,
    },
    { id: 'stat-daily', label: t('stats.daily'), value: String(lt.dailySolved) },
    { id: 'stat-golden', label: t('stats.golden'), value: String(lt.goldenSolved) },
    { id: 'stat-three-stars', label: t('stats.threeStars'), value: String(lt.threeStarWins) },
    { id: 'stat-no-hint', label: t('stats.noHint'), value: String(lt.uniqueNoHintPuzzles) },
    {
      id: 'stat-no-mistake',
      label: t('stats.noMistake'),
      value: String(lt.uniqueNoMistakePuzzles),
    },
    { id: 'stat-play-time', label: t('stats.playTime'), value: formatDuration(lt.playTimeSec) },
    ...(streakUiAllowed
      ? [
          {
            id: 'stat-longest-streak',
            label: t('stats.longestStreak'),
            value: t('common.days', {
              count: Math.max(dailyLogin.longestStreak, dailyLogin.streakCount),
            }),
          },
        ]
      : []),
    {
      id: 'stat-cats',
      label: t('stats.cats'),
      value: `${unlockedCatIds.length}/${COLLECTIBLE_CATS.length}`,
    },
  ];

  const handleExport = () => {
    const payload = buildStatsExport({
      progressStats,
      skillProfile,
      dailyLogin,
      unlockedCatIds,
      levelProgress,
      now: Date.now(),
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meowdoku-stats-${payload.exportedOn}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <ModalSheet id="stats-sheet" open={open} onClose={onClose} ariaLabel={t('stats.title')}>
      <div className="p-5 flex flex-col max-h-[86dvh] soft-scroll">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#F3ECFD] text-[#6B4EB5] flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-[19px] font-black text-[#3A312C] tracking-tight">
              {t('stats.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer active:scale-92"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {lt.puzzlesCompleted === 0 ? (
          <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-5 text-center text-[13px] font-bold text-[#7E7067]">
            {t('stats.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* 1. Totals grid */}
            <div className="grid grid-cols-2 gap-2">
              {totals.map((item) => (
                <div
                  key={item.id}
                  id={item.id}
                  className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] px-3 py-2"
                >
                  <div className="text-[10.5px] font-bold text-[#8A7B70] leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[17px] font-black text-[#3A312C] tabular-nums mt-0.5 leading-tight">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Last 14 days bar chart + accessible table */}
            <section className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-[#8A7B70] mb-2">
                {t('stats.last14')}
              </h3>
              <div
                role="img"
                aria-label={t('stats.chartAria', { total: last14Total })}
                className="flex items-end gap-1 h-20 pt-2"
              >
                {last14.map((day) => {
                  const pct =
                    day.puzzlesCompleted > 0
                      ? Math.max(14, Math.round((day.puzzlesCompleted / last14Max) * 100))
                      : 6;
                  return (
                    <div
                      key={day.date}
                      title={`${formatLocalizedDate(day.date, lang)}: ${day.puzzlesCompleted}`}
                      className="flex-1 h-full flex items-end"
                    >
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          day.puzzlesCompleted > 0 ? 'bg-[#6EB58E]' : 'bg-[#E5DACB]'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <table className="sr-only">
                <caption>{t('stats.last14')}</caption>
                <tbody>
                  {last14.map((day) => (
                    <tr key={day.date}>
                      <td>{formatLocalizedDate(day.date, lang)}</td>
                      <td>{day.puzzlesCompleted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* 3. Pace by difficulty tier */}
            {tierRows.length > 0 && (
              <section className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-[#8A7B70] mb-2">
                  {t('stats.byTier')}
                </h3>
                <div className="flex flex-col gap-1.5">
                  {tierRows.map(({ tier, stats }) => (
                    <div
                      key={tier}
                      className="flex items-center justify-between text-[12px] font-bold text-[#3A312C]"
                    >
                      <span>{t(`difficulty.${tier}`)}</span>
                      <span className="font-black text-[#6B4EB5] tabular-nums">
                        {t('stats.timeRatio', { ratio: stats.timeRatio.toFixed(1) })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Logic techniques met (TECHNIQUE_RANK 1-4) */}
            {metTechniqueRanks.length > 0 && (
              <section className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-[#8A7B70] mb-2">
                  {t('stats.techniques')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {metTechniqueRanks.map((rank) => (
                    <span
                      key={rank}
                      className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white border border-[#E5DACB] text-[#4B367E]"
                    >
                      {t(`achievements.tech_rank_${rank}.title`)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Export JSON */}
            <div className="pt-1 flex flex-col gap-1.5">
              <TactileButton
                id="btn-stats-export"
                variant="secondary"
                fullWidth
                onClick={handleExport}
              >
                <Download className="w-4 h-4 text-[#6B4EB5]" />
                {t('stats.export')}
              </TactileButton>
              <p className="text-[10.5px] font-bold text-[#8A7B70] text-center">
                {t('stats.exportNote')}
              </p>
            </div>
          </div>
        )}
      </div>
    </ModalSheet>
  );
};
