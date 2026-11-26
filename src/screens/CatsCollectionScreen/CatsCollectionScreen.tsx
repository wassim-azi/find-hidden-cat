import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Calendar, Check, ChevronDown, ChevronUp, Gift, Heart, Lock, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  CatRarity,
  COLLECTIBLE_CATS,
  CollectibleCat,
  getCollectibleCat,
} from '../../game/collectibleCats';
import { CAT_SETS, getSetProgress } from '../../game/catSets';
import {
  ensureCurrentSeasonProgress,
  getSeasonForDate,
  SEASON_ITEMS,
  SEASONS_ORDER,
} from '../../game/seasons';
import { formatRewardLabel } from '../../game/rewardLabels';
import { buildUnlockContext } from '../../game/unlockContext';
import { formatLocalizedDate } from '../../i18n';
import { CatIllustration, CatSilhouette } from '../../components/Cat/CatIllustration';
import { CatProfileSheet } from '../../components/Modals/CatProfileSheet';
import { HubHeader } from '../../components/Navigation/HubHeader';
import { TactileButton } from '../../components/Buttons/TactileButton';

const RARITY_STYLES: Record<CatRarity, { bg: string; text: string }> = {
  common: { bg: 'bg-[#EEF4F0]', text: 'text-[#4B7B5D]' },
  rare: { bg: 'bg-[#EAF3FB]', text: 'text-[#3B76A8]' },
  epic: { bg: 'bg-[#F3ECFD]', text: 'text-[#6D4EB8]' },
  legendary: { bg: 'bg-[#FFF3D1]', text: 'text-[#A66E12]' },
};

export const CatsCollectionScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [selectedCat, setSelectedCat] = useState<CollectibleCat | null>(null);
  const [showAllSeasons, setShowAllSeasons] = useState(false);

  const unlockedCatIds = useGameStore((s) => s.unlockedCatIds);
  const activeMascotCatId = useGameStore((s) => s.activeMascotCatId);
  const unlockedAccessoryIds = useGameStore((s) => s.unlockedAccessoryIds);
  const activeAccessoryId = useGameStore((s) => s.activeAccessoryId);
  const favouriteCatIds = useGameStore((s) => s.favouriteCatIds);
  const claimedSetIds = useGameStore((s) => s.claimedSetIds);
  const seasonProgressRaw = useGameStore((s) => s.seasonProgress);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const progressStats = useGameStore((s) => s.progressStats);
  const unlockedAchievementIds = useGameStore((s) => s.unlockedAchievementIds);
  const claimCatSet = useGameStore((s) => s.claimCatSet);

  const ctx = buildUnlockContext({
    levelProgress,
    unlockedLevelId,
    progressStats,
    unlockedAchievementIds,
    unlockedCatIds,
  });

  const lang = i18n.language.startsWith('fr') ? 'fr' : 'en';
  const now = new Date();
  const seasonInfo = getSeasonForDate(now);
  const seasonProgress = ensureCurrentSeasonProgress(seasonProgressRaw, now);
  const currentSeasonDef = SEASON_ITEMS[seasonInfo.season];
  const companion = getCollectibleCat(activeMascotCatId);

  const unlockedSet = new Set(unlockedCatIds);
  const favSet = new Set(favouriteCatIds);
  const unlockedAccSet = new Set(unlockedAccessoryIds);

  const seasonalCards = [
    {
      id: currentSeasonDef.dailyItem,
      current: Math.min(currentSeasonDef.dailyTarget, seasonProgress.dailySolved),
      target: currentSeasonDef.dailyTarget,
      reqText: t('seasons.reqDaily', { target: currentSeasonDef.dailyTarget }),
    },
    {
      id: currentSeasonDef.starsItem,
      current: Math.min(currentSeasonDef.starsTarget, seasonProgress.threeStarWins),
      target: currentSeasonDef.starsTarget,
      reqText: t('seasons.reqStars', { target: currentSeasonDef.starsTarget }),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <HubHeader title={t('cats.headerTitle')} />

      <div className="px-3.5 pb-2.5 shrink-0">
        <div className="meow-card rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[14px] font-black text-[#3A312C] leading-none">
              {t('cats.collectedCount', {
                owned: unlockedCatIds.length,
                total: COLLECTIBLE_CATS.length,
              })}
            </div>
            <p className="text-[11px] font-bold text-[#8A7B70] mt-1">
              {t('cats.tapToSelect')}
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-[#9B86D4] shrink-0" />
        </div>
      </div>

      <div className="flex-1 soft-scroll px-3.5 pb-4 flex flex-col gap-4">
        {/* Seasonal Accessory Collection (#20) */}
        <section
          id="seasonal-section"
          className="meow-card rounded-[24px] p-3.5 border border-[#E5DDF5] bg-gradient-to-br from-[#FAF7FF] to-[#FFF9EE] flex flex-col gap-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[14.5px] font-black text-[#3A312C] leading-tight">
                {t('seasons.title', {
                  season: t(`seasons.names.${seasonInfo.season}`),
                })}
              </h3>
              <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7E7067] mt-0.5">
                <Calendar className="w-3 h-3 shrink-0" />
                {t('seasons.until', {
                  date: formatLocalizedDate(seasonInfo.endKey, lang),
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {seasonalCards.map((item) => {
              const owned = unlockedAccSet.has(item.id);
              const pct = Math.round((item.current / item.target) * 100);
              const itemName = t(`accessories.${item.id}`);

              return (
                <div
                  key={item.id}
                  data-seasonal-item={item.id}
                  className="rounded-2xl bg-white/90 border border-[#EAE0D2] p-2.5 flex items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFF6E4] to-[#FFE7EC] flex items-center justify-center shrink-0">
                    <CatIllustration
                      breed={companion.breed}
                      mood="idle"
                      alive={false}
                      accessory={item.id}
                      className="w-12 h-12"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-black text-[#3A312C] truncate">
                        {itemName}
                      </span>
                      {owned ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#3B8B61] bg-[#E8F7EE] px-2 py-0.5 rounded-full shrink-0">
                          <Check className="w-3 h-3" strokeWidth={3} />
                          {t('seasons.earned')}
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-black text-[#8A7B70] tabular-nums shrink-0">
                          {item.current}/{item.target}
                        </span>
                      )}
                    </div>
                    {!owned && (
                      <>
                        <p className="text-[10.5px] font-semibold text-[#7E7067] mt-0.5 leading-snug">
                          {item.reqText}
                        </p>
                        <div
                          role="progressbar"
                          aria-valuenow={item.current}
                          aria-valuemin={0}
                          aria-valuemax={item.target}
                          aria-label={itemName}
                          className="w-full h-1.5 bg-[#EFE6D8] rounded-full overflow-hidden mt-1.5"
                        >
                          <div
                            className="h-full bg-gradient-to-r from-[#9B7FE0] to-[#6EB58E] rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10.5px] font-bold text-[#7E7067] leading-snug">
            {t('seasons.returns')}
          </p>

          {/* Collapsible All Seasons List */}
          <div id="seasonal-all" className="border-t border-[#EAE0D2]/80 pt-2">
            <button
              type="button"
              aria-expanded={showAllSeasons}
              onClick={() => setShowAllSeasons((v) => !v)}
              className="w-full flex items-center justify-between text-[11.5px] font-black text-[#5C4F47] cursor-pointer py-0.5"
            >
              <span>{t('seasons.allSeasons')}</span>
              {showAllSeasons ? (
                <ChevronUp className="w-4 h-4 text-[#8A7B70]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#8A7B70]" />
              )}
            </button>

            {showAllSeasons && (
              <div className="mt-2 flex flex-col gap-1.5">
                {SEASONS_ORDER.map((s) => {
                  const def = SEASON_ITEMS[s];
                  const items = [def.dailyItem, def.starsItem];
                  return (
                    <div
                      key={s}
                      className="rounded-xl bg-white/80 border border-[#EAE0D2] px-2.5 py-2 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11.5px] font-black text-[#3A312C]">
                          {t(`seasons.names.${s}`)}
                        </span>
                        <span className="text-[10px] font-bold text-[#8A7B70]">
                          {t('seasons.returnsEvery', {
                            season: t(`seasons.namesLower.${s}`),
                          })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((accId) => {
                          const hasIt = unlockedAccSet.has(accId);
                          return (
                            <span
                              key={accId}
                              className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border ${
                                hasIt
                                  ? 'bg-[#E8F7EE] border-[#C3E5D1] text-[#2D754E]'
                                  : 'bg-[#FAF5EC] border-[#EAE0D2] text-[#7E7067]'
                              }`}
                            >
                              {hasIt && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                              {t(`accessories.${accId}`)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Cat Sets (#19) */}
        {CAT_SETS.map((catSet) => {
          const progress = getSetProgress(catSet, unlockedCatIds);
          const isClaimed = claimedSetIds.includes(catSet.id);
          const pct = Math.round((progress.owned / progress.total) * 100);
          const setName = t(`catSets.${catSet.id}.name`);

          const setCats = catSet.catIds
            .map((id) => COLLECTIBLE_CATS.find((c) => c.id === id))
            .filter((c): c is CollectibleCat => Boolean(c));

          // Sort within set: favourites -> unlocked -> locked
          const orderedSetCats = [
            ...setCats.filter((c) => unlockedSet.has(c.id) && favSet.has(c.id)),
            ...setCats.filter((c) => unlockedSet.has(c.id) && !favSet.has(c.id)),
            ...setCats.filter((c) => !unlockedSet.has(c.id)),
          ];

          return (
            <section key={catSet.id} id={`cat-set-${catSet.id}`} className="flex flex-col gap-2">
              <div className="meow-card rounded-2xl px-3.5 py-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[13.5px] font-black text-[#3A312C] leading-tight">
                      {setName}
                    </h3>
                    <div className="text-[10.5px] font-bold text-[#8A7B70] mt-0.5">
                      {formatRewardLabel(catSet.rewardCoins, undefined, t)} +{' '}
                      {t(`accessories.${catSet.rewardAccessory}`)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-black text-[#6E6057] tabular-nums">
                      {progress.owned}/{progress.total}
                    </span>
                    {isClaimed ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-[#3B8B61] bg-[#E8F7EE] px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" strokeWidth={3} />
                        {t('common.claimed')}
                      </span>
                    ) : progress.complete ? (
                      <TactileButton
                        id={`btn-claim-set-${catSet.id}`}
                        variant="primary"
                        size="sm"
                        onClick={() => claimCatSet(catSet.id)}
                        className="h-7.5 px-2.5 text-[10.5px]"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        {t('catSets.claim')}
                      </TactileButton>
                    ) : null}
                  </div>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={progress.owned}
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-label={setName}
                  className="w-full h-1.5 bg-[#EFE6D8] rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-gradient-to-r from-[#FF8B8B] to-[#6EB58E] rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {orderedSetCats.map((cat) => {
                  const unlocked = unlockedSet.has(cat.id);
                  const isActive = activeMascotCatId === cat.id;
                  const isFav = unlocked && favSet.has(cat.id);
                  const rarity = RARITY_STYLES[cat.rarity];

                  return (
                    <motion.button
                      key={cat.id}
                      id={`cat-card-${cat.id}`}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedCat(cat)}
                      className={`relative rounded-[22px] p-3 flex flex-col items-center text-center border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white border-[#FF8585] ring-2 ring-[#FF8585]/25 shadow-[0_6px_18px_rgba(255,122,122,0.18)]'
                          : unlocked
                            ? 'bg-white border-[#EAE0D2] shadow-[0_3px_10px_rgba(92,69,52,0.06)]'
                            : 'bg-[#F5EFE6]/85 border-[#E7DDD0]'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full leading-none ${rarity.bg} ${rarity.text}`}
                        >
                          {t(`cats.rarity.${cat.rarity}`)}
                        </span>
                        <div className="flex items-center gap-1">
                          {isFav && (
                            <Heart className="w-3.5 h-3.5 text-[#E85B78] fill-[#E85B78]" />
                          )}
                          {isActive ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-white bg-[#6EB58E] px-1.5 py-0.5 rounded-full leading-none">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                              {t('cats.activeBadge')}
                            </span>
                          ) : !unlocked ? (
                            <Lock className="w-3.5 h-3.5 text-[#A99B90]" />
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={`w-18 h-18 rounded-2xl flex items-center justify-center mb-2 ${
                          unlocked
                            ? 'bg-gradient-to-br from-[#FFF6E4] to-[#FFE7EC]'
                            : 'bg-[#EAE1D4]'
                        }`}
                      >
                        {unlocked ? (
                          <CatIllustration
                            breed={cat.breed}
                            mood={isActive ? 'happy' : 'idle'}
                            accessory={isActive ? activeAccessoryId : null}
                            className="w-15 h-15"
                          />
                        ) : (
                          <CatSilhouette color="#B8AC9F" className="w-13 h-13 opacity-80" />
                        )}
                      </div>

                      <h3 className="text-[15px] font-black text-[#3A312C] leading-tight">
                        {unlocked || cat.rarity === 'common' ? cat.name : t('cats.mysteryName')}
                      </h3>
                      <p className="text-[10.5px] font-extrabold text-[#FF7A7A] mt-0.5 leading-tight">
                        {unlocked
                          ? t(`cats.roster.${cat.id}.title`)
                          : t(`cats.roster.${cat.id}.req`)}
                      </p>

                      <p className="text-[10.5px] font-semibold text-[#7E7067] mt-1.5 leading-snug line-clamp-2">
                        {unlocked
                          ? t(`cats.roster.${cat.id}.personality`)
                          : cat.progressHint(ctx)}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <CatProfileSheet
        cat={selectedCat}
        open={Boolean(selectedCat)}
        onClose={() => setSelectedCat(null)}
        ctx={ctx}
      />
    </div>
  );
};
