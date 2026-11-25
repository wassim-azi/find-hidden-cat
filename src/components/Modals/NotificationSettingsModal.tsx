import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BellOff,
  Calendar,
  Clock,
  Compass,
  Flame,
  Info,
  Moon,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { getCurrentLanguage } from '../../i18n';
import {
  BrowserPermissionState,
  computeReminderPlan,
  deliverLocalNotification,
  getBrowserNotificationPermission,
  getReminderTimeInfo,
  loadEngagement,
  loadNotificationPrefs,
  makeReminderCopy,
  NotificationCategory,
  NotificationPreferences,
  PeriodicSyncStatus,
  registerPeriodicSyncIfSupported,
  requestBrowserNotificationPermission,
  saveNotificationPrefs,
  subscribeNotificationPrefs,
  unregisterPeriodicSync,
} from '../../services/localNotifications';

interface NotificationSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onToast?: (msg: string) => void;
}

export const NotificationSettingsModal: React.FC<
  NotificationSettingsModalProps
> = ({ open, onClose, onToast }) => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPreferences>(() =>
    loadNotificationPrefs()
  );
  const [permission, setPermission] = useState<BrowserPermissionState>(() =>
    getBrowserNotificationPermission()
  );
  const [syncStatus, setSyncStatus] = useState<PeriodicSyncStatus | null>(null);

  useEffect(() => {
    if (open) {
      setPermission(getBrowserNotificationPermission());
    }
    return subscribeNotificationPrefs(setPrefs);
  }, [open]);

  const updatePrefs = (next: NotificationPreferences) => {
    setPrefs(next);
    saveNotificationPrefs(next);
  };

  const handleToggleMaster = async () => {
    if (prefs.enabled) {
      updatePrefs({ ...prefs, enabled: false });
      await unregisterPeriodicSync();
      onToast?.(t('notifications.disabledToast'));
      return;
    }

    const currentPerm = getBrowserNotificationPermission();
    let finalPerm = currentPerm;
    if (currentPerm === 'default') {
      finalPerm = await requestBrowserNotificationPermission();
    }
    setPermission(finalPerm);

    if (finalPerm === 'granted') {
      updatePrefs({ ...prefs, enabled: true, onboardingDismissed: true });
      const status = await registerPeriodicSyncIfSupported();
      setSyncStatus(status);
      onToast?.(t('notifications.enabledToast'));
    } else if (finalPerm === 'unsupported') {
      onToast?.(t('notifications.unsupportedToast'));
    } else {
      onToast?.(t('notifications.deniedToast'));
    }
  };

  const handleToggleCategory = (cat: NotificationCategory) => {
    updatePrefs({
      ...prefs,
      categories: {
        ...prefs.categories,
        [cat]: !prefs.categories[cat],
      },
    });
  };

  const timeInfo = getReminderTimeInfo(prefs);

  const handleSendTest = async () => {
    // Preview the next reminder this player would really get (or a Daily Kitty example)
    const lang = getCurrentLanguage();
    const next = computeReminderPlan({ ...prefs, enabled: true }, loadEngagement())[0];
    const fallback = makeReminderCopy(lang)('dailyPuzzle', { variant: new Date().getDate() });
    const copy = next
      ? { title: next.title, body: next.body, route: next.route, category: next.kind }
      : { ...fallback, route: 'daily' as const, category: 'dailyPuzzle' as const };
    const sent = await deliverLocalNotification(copy, { isTest: true });
    if (sent) {
      onToast?.(t('notifications.testSentToast'));
    } else {
      // Graceful in-app preview fallback when OS/browser blocks system notification
      onToast?.(copy.body);
    }
  };

  const permBadgeStyle =
    permission === 'granted'
      ? 'bg-[#E8F7EE] text-[#2D754E]'
      : permission === 'denied'
        ? 'bg-[#FFF0F0] text-[#C84E4E]'
        : 'bg-[#FAF2E4] text-[#8E6520]';

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      ariaLabel={t('notifications.settingsAria')}
    >
      <div className="p-5 flex flex-col max-h-[86dvh] soft-scroll">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#FFF0F2] text-[#E86A7B] flex items-center justify-center">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-[19px] font-black text-[#3A312C] leading-tight">
                {t('notifications.settingsTitle')}
              </h2>
              <span
                className={`inline-block text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full mt-0.5 ${permBadgeStyle}`}
              >
                {t(`notifications.perm_${permission}`)}
              </span>
            </div>
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

        {/* Master Enable/Disable Switch */}
        <button
          id="toggle-notifications-master"
          type="button"
          role="switch"
          aria-checked={prefs.enabled}
          onClick={handleToggleMaster}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] text-left cursor-pointer mb-2.5"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center text-[#E86A7B] shrink-0">
              {prefs.enabled ? (
                <Bell className="w-4.5 h-4.5" />
              ) : (
                <BellOff className="w-4.5 h-4.5 text-[#A99B90]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[13.5px] font-extrabold text-[#3A312C] leading-tight">
                {t('notifications.masterLabel')}
              </div>
              <div className="text-[10.5px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
                {t('notifications.masterDesc')}
              </div>
            </div>
          </div>
          <div
            className={`w-11 h-6.5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
              prefs.enabled ? 'bg-[#6EB58E] justify-end' : 'bg-[#DDD2C2] justify-start'
            }`}
          >
            <span className="w-5.5 h-5.5 rounded-full bg-white shadow-sm block" />
          </div>
        </button>

        {/* Reminder Time & Quiet Hours */}
        <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3 mb-2.5 flex flex-col gap-2.5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-extrabold text-[#3A312C] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#E59C1E]" />
                {t('notifications.reminderTimeLabel')}
              </span>
              <div
                role="radiogroup"
                aria-label={t('notifications.reminderTimeLabel')}
                className="grid grid-cols-2 gap-1 bg-[#EFE6D8] p-0.5 rounded-xl"
              >
                {(['auto', 'manual'] as const).map((mode) => (
                  <button
                    key={mode}
                    id={`btn-notif-timing-${mode}`}
                    type="button"
                    role="radio"
                    aria-checked={prefs.timingMode === mode}
                    onClick={() => updatePrefs({ ...prefs, timingMode: mode })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all ${
                      prefs.timingMode === mode
                        ? 'bg-white text-[#3A312C] shadow-xs'
                        : 'text-[#7E7067]'
                    }`}
                  >
                    {t(mode === 'auto' ? 'notifications.timingAuto' : 'notifications.timingCustom')}
                  </button>
                ))}
              </div>
            </div>
            {prefs.timingMode === 'auto' ? (
              <p
                id="notif-auto-time-info"
                className="text-[10.5px] font-bold text-[#7E7067] leading-snug"
              >
                {t(timeInfo.learned ? 'notifications.autoLearned' : 'notifications.autoLearning', {
                  time: timeInfo.time,
                })}
              </p>
            ) : (
              <input
                id="input-reminder-time"
                type="time"
                aria-label={t('notifications.reminderTimeLabel')}
                value={prefs.reminderTime}
                onChange={(e) =>
                  updatePrefs({ ...prefs, reminderTime: e.target.value || '19:00' })
                }
                className="self-end px-2.5 py-1 rounded-xl bg-white border border-[#E5DACB] text-[13px] font-black text-[#3A312C] tabular-nums"
              />
            )}
          </div>

          <div className="border-t border-[#EAE0D2] pt-2.5">
            <button
              id="toggle-quiet-hours"
              type="button"
              role="switch"
              aria-checked={prefs.quietHoursEnabled}
              onClick={() =>
                updatePrefs({ ...prefs, quietHoursEnabled: !prefs.quietHoursEnabled })
              }
              className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-[#8366CC]" />
                <div>
                  <div className="text-[12.5px] font-extrabold text-[#3A312C] leading-tight">
                    {t('notifications.quietHoursLabel')}
                  </div>
                  <div className="text-[10px] font-semibold text-[#8A7B70]">
                    {t('notifications.quietHoursDesc')}
                  </div>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                  prefs.quietHoursEnabled
                    ? 'bg-[#8366CC] justify-end'
                    : 'bg-[#DDD2C2] justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
              </div>
            </button>

            {prefs.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <label className="flex flex-col gap-0.5 text-[10px] font-extrabold text-[#7E7067]">
                  {t('notifications.quietFrom')}
                  <input
                    id="input-quiet-start"
                    type="time"
                    value={prefs.quietStart}
                    onChange={(e) =>
                      updatePrefs({ ...prefs, quietStart: e.target.value || '22:00' })
                    }
                    className="px-2 py-1 rounded-xl bg-white border border-[#E5DACB] text-[12px] font-black text-[#3A312C] tabular-nums"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] font-extrabold text-[#7E7067]">
                  {t('notifications.quietUntil')}
                  <input
                    id="input-quiet-end"
                    type="time"
                    value={prefs.quietEnd}
                    onChange={(e) =>
                      updatePrefs({ ...prefs, quietEnd: e.target.value || '08:00' })
                    }
                    className="px-2 py-1 rounded-xl bg-white border border-[#E5DACB] text-[12px] font-black text-[#3A312C] tabular-nums"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Notification Categories */}
        <div className="text-[10.5px] font-black uppercase tracking-wider text-[#9A8B7E] px-1 pb-1">
          {t('notifications.categoriesTitle')}
        </div>
        <div className="flex flex-col gap-1.5 mb-3">
          {(
            [
              {
                id: 'streak' as NotificationCategory,
                icon: <Flame className="w-4 h-4 text-[#E86A3B]" />,
                labelKey: 'notifications.catStreakLabel',
                descKey: 'notifications.catStreakDesc',
              },
              {
                id: 'dailyPuzzle' as NotificationCategory,
                icon: <Calendar className="w-4 h-4 text-[#E59C1E]" />,
                labelKey: 'notifications.catDailyLabel',
                descKey: 'notifications.catDailyDesc',
              },
              {
                id: 'continueAdventure' as NotificationCategory,
                icon: <Compass className="w-4 h-4 text-[#6EB58E]" />,
                labelKey: 'notifications.catAdventureLabel',
                descKey: 'notifications.catAdventureDesc',
              },
              {
                id: 'specialChallenges' as NotificationCategory,
                icon: <Sparkles className="w-4 h-4 text-[#8366CC]" />,
                labelKey: 'notifications.catSpecialLabel',
                descKey: 'notifications.catSpecialDesc',
              },
            ] as const
          ).map((cat) => {
            const active = prefs.categories[cat.id];
            return (
              <button
                key={cat.id}
                id={`toggle-notif-cat-${cat.id}`}
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => handleToggleCategory(cat.id)}
                className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl bg-[#FAF5EC] text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center shrink-0">
                    {cat.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-extrabold text-[#3A312C] leading-tight">
                      {t(cat.labelKey)}
                    </div>
                    <div className="text-[10px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
                      {t(cat.descKey)}
                    </div>
                  </div>
                </div>
                <div
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                    active ? 'bg-[#6EB58E] justify-end' : 'bg-[#DDD2C2] justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview Button */}
        <TactileButton
          id="btn-notif-preview"
          variant="secondary"
          size="sm"
          fullWidth
          onClick={handleSendTest}
          className="mb-3"
        >
          <Send className="w-3.5 h-3.5 text-[#FF7A7A]" />
          {t('notifications.previewBtn')}
        </TactileButton>

        {/* Honest Browser-Only Limitation Notice */}
        <div className="rounded-2xl bg-[#F4EEFD] border border-[#DFD2F8] p-3 flex items-start gap-2 text-left">
          <Info className="w-4 h-4 text-[#7859C4] shrink-0 mt-0.5" />
          <p className="text-[10.5px] font-bold text-[#5E4B8E] leading-snug">
            {t('notifications.smartRulesNote')} {t('notifications.browserOnlyNote')}
            {syncStatus === 'registered' && ` ${t('notifications.periodicSyncActive')}`}
          </p>
        </div>
      </div>
    </ModalSheet>
  );
};
