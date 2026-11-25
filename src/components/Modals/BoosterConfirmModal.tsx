import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Wand2, X } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { BoosterId, getShopItem } from '../../game/economy';

interface BoosterConfirmModalProps {
  boosterId: BoosterId | null;
  ownedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BoosterConfirmModal: React.FC<BoosterConfirmModalProps> = ({
  boosterId,
  ownedCount,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  if (!boosterId) return null;

  const item = getShopItem(boosterId);

  return (
    <ModalSheet
      open={Boolean(boosterId)}
      onClose={onCancel}
      ariaLabel={t('boosters.confirmAria')}
    >
      <div className="p-5 flex flex-col items-center text-center">
        <div
          style={{ backgroundColor: item.bgSoft, color: item.accentColor }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
        >
          <Wand2 className="w-7 h-7" />
        </div>

        <h2 className="text-[18px] font-black text-[#3A312C] tracking-tight">
          {t('boosters.confirmTitle', {
            name: t(`shop.items.${boosterId}.name`),
          })}
        </h2>
        <p className="text-[12.5px] font-bold text-[#7E7067] mt-1 leading-snug max-w-[270px]">
          {t(`shop.items.${boosterId}.desc`)}
        </p>

        <div className="mt-3 px-3 py-1.5 rounded-full bg-[#FAF5EC] border border-[#EAE0D2] text-[11.5px] font-extrabold text-[#5A4E47]">
          {t('boosters.ownedRemaining', {
            before: ownedCount,
            after: Math.max(0, ownedCount - 1),
          })}
        </div>

        <div className="w-full grid grid-cols-2 gap-2.5 mt-4">
          <TactileButton
            id="btn-cancel-booster"
            variant="secondary"
            size="md"
            fullWidth
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
            {t('common.cancel')}
          </TactileButton>
          <TactileButton
            id="btn-confirm-booster"
            variant="primary"
            size="md"
            fullWidth
            onClick={onConfirm}
          >
            <Check className="w-4 h-4" />
            {t('boosters.confirmUseBtn')}
          </TactileButton>
        </div>
      </div>
    </ModalSheet>
  );
};
