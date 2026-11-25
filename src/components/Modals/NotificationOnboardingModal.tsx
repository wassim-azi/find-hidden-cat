import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Calendar, Moon, ShieldCheck, X } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import {
  loadNotificationPrefs,
  registerPeriodicSyncIfSupported,
  requestBrowserNotificationPermission,
  saveNotificationPrefs,
} from '../../services/localNotifications';

interface NotificationOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onEnabled?: () => void;
  onToast?: (msg: string) => void;
}

export const NotificationOnboardingModal: React.FC<
  NotificationOnboardingModalProps
> = ({ open, onClose, onEnabled, onToast }) => {
  const { t } = useTranslation();
  const [requesting, setRequesting] = useState(false);

  const handleDecline = () => {
    const prefs = loadNotificationPrefs();
    saveNotificationPrefs({ ...prefs, onboardingDismissed: true });
    onClose();
  };

  const handleEnable = async () => {
    setRequesting(true);
    const perm = await requestBrowserNotificationPermission();
    const prefs = loadNotificationPrefs();

    if (perm === 'granted') {
      saveNotificationPrefs({
        ...prefs,
        enabled: true,
        onboardingDismissed: true,
      });
      await registerPeriodicSyncIfSupported();
      setRequesting(false);
      onToast?.(t('notifications.enabledToast'));
      onEnabled?.();
      onClose();
      return;
    }

    // Never re-ask users who declined or whose browser blocks notifications
    saveNotificationPrefs({
      ...prefs,
      enabled: false,
      onboardingDismissed: true,
    });
    setRequesting(false);
    onToast?.(
      perm === 'unsupported'
        ? t('notifications.unsupportedToast')
        : t('notifications.deniedToast')
    );
    onClose();
  };

  return (
    <ModalSheet
      open={open}
      onClose={handleDecline}
      ariaLabel={t('notifications.onboardingAria')}
    >
      <div className="p-5 flex flex-col items-center text-center">
        <div className="w-full flex justify-end -mb-2">
          <button
            type="button"
            onClick={handleDecline}
            aria-label={t('common.close')}
            className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer active:scale-92"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#FFE7B3] to-[#FFC8CC] border-2 border-white shadow-sm flex items-center justify-center text-[#3A312C] mb-3">
          <Bell className="w-8 h-8 text-[#D85A6A]" strokeWidth={2.3} />
        </div>

        <h2 className="text-[20px] font-black text-[#3A312C] tracking-tight">
          {t('notifications.onboardingTitle')}
        </h2>
        <p className="text-[12.5px] font-bold text-[#7E7067] mt-1 leading-snug max-w-[285px]">
          {t('notifications.onboardingDesc')}
        </p>

        <div className="w-full flex flex-col gap-2 mt-3.5 text-left">
          <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] px-3 py-2 flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-[#E59C1E] shrink-0" />
            <span className="text-[11.5px] font-bold text-[#4D423B]">
              {t('notifications.benefitDaily')}
            </span>
          </div>
          <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] px-3 py-2 flex items-center gap-2.5">
            <Moon className="w-4 h-4 text-[#8366CC] shrink-0" />
            <span className="text-[11.5px] font-bold text-[#4D423B]">
              {t('notifications.benefitQuiet')}
            </span>
          </div>
          <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] px-3 py-2 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#4CA676] shrink-0" />
            <span className="text-[11.5px] font-bold text-[#4D423B]">
              {t('notifications.benefitLocalOnly')}
            </span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2 mt-4">
          <TactileButton
            id="btn-notif-enable-onboarding"
            variant="primary"
            fullWidth
            disabled={requesting}
            onClick={handleEnable}
          >
            <Bell className="w-4 h-4" />
            {t('notifications.enableBtn')}
          </TactileButton>
          <TactileButton
            id="btn-notif-decline-onboarding"
            variant="ghost"
            size="sm"
            fullWidth
            onClick={handleDecline}
          >
            {t('notifications.notNowBtn')}
          </TactileButton>
        </div>
      </div>
    </ModalSheet>
  );
};
