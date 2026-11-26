import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Gift } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import {
  CHEST_ACCESSORY_FALLBACK_COINS,
  CHEST_GUARANTEED,
  ChestOddsLine,
  getChestOdds,
  PITY_AFTER,
} from '../../game/chests';
import { formatRewardLabel } from '../../game/rewardLabels';
import { formatLocalizedNumber } from '../../i18n';

interface ChestOddsSheetProps {
  open: boolean;
  onClose: () => void;
}

function formatOddsLine(line: ChestOddsLine, t: TFunction): string {
  const percent = formatLocalizedNumber(line.percent);
  const { entry } = line;
  if (entry.kind === 'coins') {
    return t('chests.oddsCoins', { percent, coins: entry.amount });
  }
  if (entry.kind === 'booster') {
    return t('chests.oddsBooster', { percent, name: t(`shop.items.${entry.id}.name`) });
  }
  return t('chests.oddsAccessory', { percent });
}

/** Published chest odds (#21), generated from CHEST_BONUS_TABLE — the table the RNG rolls. */
export const ChestOddsSheet: React.FC<ChestOddsSheetProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const guaranteed = formatRewardLabel(CHEST_GUARANTEED.coins, CHEST_GUARANTEED.boosters, t);

  return (
    <ModalSheet id="chest-odds-sheet" open={open} onClose={onClose} ariaLabel={t('chests.oddsTitle')}>
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE396] to-[#F3B038] text-[#6B4209] flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <h2 className="text-[18px] font-black text-[#3A312C] leading-tight">
            {t('chests.oddsTitle')}
          </h2>
        </div>

        <p className="text-[12.5px] font-black text-[#6B4812] bg-[#FFF6DF] border border-[#F2DFB4] rounded-xl px-3 py-2">
          {t('chests.guaranteed', { reward: guaranteed })}
        </p>

        <ul className="flex flex-col gap-1.5" data-chest-odds>
          {getChestOdds().map((line) => (
            <li
              key={line.entry.kind}
              className="text-[12.5px] font-extrabold text-[#5A4E47] bg-[#FAF5EC] border border-[#EDE3D4] rounded-xl px-3 py-1.5 tabular-nums"
            >
              {formatOddsLine(line, t)}
            </li>
          ))}
        </ul>

        <ul className="flex flex-col gap-1 text-[11.5px] font-bold text-[#7E7067] list-disc pl-4">
          <li>{t('chests.fallbackRule', { coins: CHEST_ACCESSORY_FALLBACK_COINS })}</li>
          <li>{t('chests.pityRule', { n: PITY_AFTER + 1 })}</li>
          <li>{t('chests.notForSale')}</li>
        </ul>

        <TactileButton id="btn-chest-odds-close" variant="secondary" fullWidth onClick={onClose}>
          {t('common.close')}
        </TactileButton>
      </div>
    </ModalSheet>
  );
};
