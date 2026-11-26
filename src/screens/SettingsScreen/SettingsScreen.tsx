import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Contrast,
  Download,
  Eye,
  Gamepad2,
  Globe,
  Grid,
  Hand,
  Heart,
  Layers,
  Music,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Type,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import { ModalSheet } from '../../components/Modals/ModalSheet';
import { TactileButton } from '../../components/Buttons/TactileButton';
import { ControlMode, GameMode, PlayerSettings } from '../../game/gameTypes';
import { AppLanguage, changeAppLanguage, getCurrentLanguage } from '../../i18n';
import { soundManager } from '../../utils/sound';

interface SettingsScreenProps {
  open: boolean;
  settings: PlayerSettings;
  isPwaInstalled?: boolean;
  onOpenNotifications?: () => void;
  onOpenInstall?: () => void;
  onReplayTutorial?: () => void;
  onUpdateSetting: <K extends keyof PlayerSettings>(
    key: K,
    value: PlayerSettings[K]
  ) => void;
  onResetProgress: () => void;
  onResetSkillProfile: () => void;
  onClose: () => void;
}

interface ToggleRowProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  id,
  icon,
  label,
  description,
  checked,
  onToggle,
}) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onToggle}
    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#FAF5EC] hover:bg-[#F5EEE2] transition-colors text-left cursor-pointer"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8.5 h-8.5 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center text-[#5A4E47] shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-extrabold text-[#3A312C] leading-tight">
          {label}
        </div>
        <div className="text-[10.5px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
          {description}
        </div>
      </div>
    </div>

    <div
      className={`w-11 h-6.5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
        checked ? 'bg-[#6EB58E] justify-end' : 'bg-[#DDD2C2] justify-start'
      }`}
    >
      <span className="w-5.5 h-5.5 rounded-full bg-white shadow-sm block" />
    </div>
  </button>
);

const SectionLabel: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-[10.5px] font-black uppercase tracking-wider text-[#9A8B7E] px-1 pt-2.5 pb-1">
    {title}
  </div>
);

const LANGUAGE_OPTIONS: readonly { code: AppLanguage; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

const CONTROL_MODES: readonly { id: ControlMode; labelKey: string }[] = [
  { id: 'tap-confirm', labelKey: 'settings.ctrlTapConfirm' },
  { id: 'double-tap', labelKey: 'settings.ctrlDoubleTap' },
  { id: 'long-press', labelKey: 'settings.ctrlLongPress' },
];

const GAME_MODES: readonly { id: GameMode; labelKey: string }[] = [
  { id: 'classic', labelKey: 'settings.modeClassic' },
  { id: 'practice', labelKey: 'settings.modePractice' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  open,
  settings,
  isPwaInstalled = false,
  onOpenNotifications,
  onOpenInstall,
  onReplayTutorial,
  onUpdateSetting,
  onResetProgress,
  onResetSkillProfile,
  onClose,
}) => {
  const { t } = useTranslation();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSkillReset, setConfirmSkillReset] = useState(false);
  const currentLang = getCurrentLanguage();

  const handleClose = () => {
    setConfirmReset(false);
    setConfirmSkillReset(false);
    onClose();
  };

  const handleSelectLanguage = (code: AppLanguage) => {
    soundManager.play('button', settings.soundEnabled);
    changeAppLanguage(code);
  };

  return (
    <ModalSheet open={open} onClose={handleClose} ariaLabel={t('settings.dialogAria')}>
      <div className="p-5 flex flex-col max-h-[86dvh] soft-scroll">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[20px] font-black text-[#3A312C] tracking-tight">
            {t('settings.title')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('settings.closeAria')}
            className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer active:scale-92"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Selector */}
        <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3 mb-2">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center text-[#8366CC] shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-[#3A312C] leading-tight">
                {t('settings.languageLabel')}
              </div>
              <div className="text-[10.5px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
                {t('settings.languageDesc')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-[#EFE6D8]/90 p-1 rounded-xl">
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = currentLang === opt.code;
              return (
                <button
                  key={opt.code}
                  id={`btn-lang-${opt.code}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleSelectLanguage(opt.code)}
                  className={`py-2 px-2.5 rounded-lg text-[12.5px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-[#3A312C] shadow-[0_2px_8px_rgba(92,69,52,0.12)] ring-1 ring-[#FF8585]/40'
                      : 'text-[#7E7067] hover:text-[#3A312C]'
                  }`}
                >
                  <span aria-hidden="true">{opt.flag}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* App & Local Daily Reminders */}
        {(onOpenNotifications || onOpenInstall || onReplayTutorial) && (
          <div className="flex flex-col gap-1.5 mb-2">
            {onOpenNotifications && (
              <button
                id="btn-settings-notifications"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNotifications();
                }}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#FAF5EC] hover:bg-[#F5EEE2] border border-[#EDE3D4] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8.5 h-8.5 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center text-[#E86A7B] shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold text-[#3A312C] leading-tight">
                      {t('notifications.settingsTitle')}
                    </div>
                    <div className="text-[10.5px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
                      {t('notifications.settingsEntryDesc')}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#A99B90] shrink-0" />
              </button>
            )}

            {onOpenInstall && (
              <button
                id="btn-settings-install"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInstall();
                }}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#FAF5EC] hover:bg-[#F5EEE2] border border-[#EDE3D4] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8.5 h-8.5 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center text-[#6EB58E] shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold text-[#3A312C] leading-tight">
                      {isPwaInstalled ? t('pwa.installedTitle') : t('pwa.installTitle')}
                    </div>
                    <div className="text-[10.5px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
                      {isPwaInstalled ? t('pwa.alreadyInstalledBadge') : t('pwa.settingsEntryDesc')}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#A99B90] shrink-0" />
              </button>
            )}

            {onReplayTutorial && (
              <button
                id="btn-settings-replay-tutorial"
                type="button"
                onClick={onReplayTutorial}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#FAF5EC] hover:bg-[#F5EEE2] border border-[#EDE3D4] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8.5 h-8.5 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center text-[#8366CC] shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold text-[#3A312C] leading-tight">
                      {t('onboarding.settingsReplay')}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#A99B90] shrink-0" />
              </button>
            )}
          </div>
        )}

        {/* Controls & Play Mode */}
        <SectionLabel title={t('settings.sectionControls')} />

        <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3 mb-2">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center text-[#E86A7B] shrink-0">
              <Hand className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-[#3A312C] leading-tight">
                {t('settings.controlModeLabel')}
              </div>
              <div className="text-[10.5px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
                {t('settings.controlModeDesc')}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-[#EFE6D8]/90 p-1 rounded-xl">
            {CONTROL_MODES.map((m) => {
              const active = settings.controlMode === m.id;
              return (
                <button
                  key={m.id}
                  id={`btn-ctrl-${m.id}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onUpdateSetting('controlMode', m.id)}
                  className={`py-1.5 px-1 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer leading-tight ${
                    active
                      ? 'bg-white text-[#3A312C] shadow-xs ring-1 ring-[#FF8585]/40'
                      : 'text-[#7E7067]'
                  }`}
                >
                  {t(m.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3 mb-2">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center text-[#F05A66] shrink-0">
              <Heart className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-[#3A312C] leading-tight">
                {t('settings.gameModeLabel')}
              </div>
              <div className="text-[10.5px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
                {t('settings.gameModeDesc')}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-[#EFE6D8]/90 p-1 rounded-xl">
            {GAME_MODES.map((m) => {
              const active = settings.gameMode === m.id;
              return (
                <button
                  key={m.id}
                  id={`btn-mode-${m.id}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onUpdateSetting('gameMode', m.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11.5px] font-extrabold transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-[#3A312C] shadow-xs ring-1 ring-[#6EB58E]/50'
                      : 'text-[#7E7067]'
                  }`}
                >
                  {t(m.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Visuals & Marks */}
        <SectionLabel title={t('settings.sectionVisuals')} />
        <div className="flex flex-col gap-1.5">
          <ToggleRow
            id="toggle-auto-x"
            icon={<Wand2 className="w-4 h-4 text-[#E59C1E]" />}
            label={t('settings.autoXLabel')}
            description={t('settings.autoXDesc')}
            checked={settings.autoMarkX}
            onToggle={() => onUpdateSetting('autoMarkX', !settings.autoMarkX)}
          />
          <ToggleRow
            id="toggle-candidates"
            icon={<Star className="w-4 h-4 text-[#E59C1E]" />}
            label={t('settings.showCandidatesLabel')}
            description={t('settings.showCandidatesDesc')}
            checked={settings.showCandidates}
            onToggle={() => onUpdateSetting('showCandidates', !settings.showCandidates)}
          />
          <ToggleRow
            id="toggle-highlight-rowcol"
            icon={<Grid className="w-4 h-4" />}
            label={t('settings.highlightRowColLabel')}
            description={t('settings.highlightRowColDesc')}
            checked={settings.highlightRowCol}
            onToggle={() => onUpdateSetting('highlightRowCol', !settings.highlightRowCol)}
          />
          <ToggleRow
            id="toggle-highlight-neighbors"
            icon={<Gamepad2 className="w-4 h-4" />}
            label={t('settings.highlightNeighborsLabel')}
            description={t('settings.highlightNeighborsDesc')}
            checked={settings.highlightNeighbors}
            onToggle={() =>
              onUpdateSetting('highlightNeighbors', !settings.highlightNeighbors)
            }
          />
          <ToggleRow
            id="toggle-highlight-region"
            icon={<Layers className="w-4 h-4" />}
            label={t('settings.highlightRegionLabel')}
            description={t('settings.highlightRegionDesc')}
            checked={settings.highlightRegion}
            onToggle={() => onUpdateSetting('highlightRegion', !settings.highlightRegion)}
          />
          <ToggleRow
            id="toggle-highlight-completed"
            icon={<CheckCircle2 className="w-4 h-4 text-[#4CA676]" />}
            label={t('settings.highlightCompletedLabel')}
            description={t('settings.highlightCompletedDesc')}
            checked={settings.highlightCompletedRegions}
            onToggle={() =>
              onUpdateSetting(
                'highlightCompletedRegions',
                !settings.highlightCompletedRegions
              )
            }
          />
          <ToggleRow
            id="toggle-fade-completed"
            icon={<Eye className="w-4 h-4" />}
            label={t('settings.fadeCompletedLabel')}
            description={t('settings.fadeCompletedDesc')}
            checked={settings.fadeCompletedRegions}
            onToggle={() =>
              onUpdateSetting('fadeCompletedRegions', !settings.fadeCompletedRegions)
            }
          />
        </div>

        {/* Accessibility & Audio */}
        <SectionLabel title={t('settings.sectionAccessibility')} />
        <div className="flex flex-col gap-1.5">
          <ToggleRow
            id="toggle-symbols"
            icon={<Eye className="w-4 h-4" />}
            label={t('settings.symbolsLabel')}
            description={t('settings.symbolsDesc')}
            checked={settings.showRegionSymbols}
            onToggle={() =>
              onUpdateSetting('showRegionSymbols', !settings.showRegionSymbols)
            }
          />
          <ToggleRow
            id="toggle-high-contrast"
            icon={<Contrast className="w-4 h-4" />}
            label={t('settings.highContrastLabel')}
            description={t('settings.highContrastDesc')}
            checked={settings.highContrast}
            onToggle={() => onUpdateSetting('highContrast', !settings.highContrast)}
          />
          <ToggleRow
            id="toggle-large-text"
            icon={<Type className="w-4 h-4" />}
            label={t('settings.largeTextLabel')}
            description={t('settings.largeTextDesc')}
            checked={settings.largeText}
            onToggle={() => onUpdateSetting('largeText', !settings.largeText)}
          />
          <ToggleRow
            id="toggle-reduced-motion"
            icon={<Sparkles className="w-4 h-4" />}
            label={t('settings.reducedMotionLabel')}
            description={t('settings.reducedMotionDesc')}
            checked={settings.reducedMotion}
            onToggle={() =>
              onUpdateSetting('reducedMotion', !settings.reducedMotion)
            }
          />
          <ToggleRow
            id="toggle-sound"
            icon={<Volume2 className="w-4 h-4" />}
            label={t('settings.soundLabel')}
            description={t('settings.soundDesc')}
            checked={settings.soundEnabled}
            onToggle={() => onUpdateSetting('soundEnabled', !settings.soundEnabled)}
          />
          <ToggleRow
            id="toggle-music"
            icon={<Music className="w-4 h-4" />}
            label={t('settings.musicLabel')}
            description={t('settings.musicDesc')}
            checked={settings.musicEnabled}
            onToggle={() => onUpdateSetting('musicEnabled', !settings.musicEnabled)}
          />
          <ToggleRow
            id="toggle-haptics"
            icon={<Smartphone className="w-4 h-4" />}
            label={t('settings.hapticsLabel')}
            description={t('settings.hapticsDesc')}
            checked={settings.hapticsEnabled}
            onToggle={() =>
              onUpdateSetting('hapticsEnabled', !settings.hapticsEnabled)
            }
          />
          <div className="px-3.5 py-3 flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FAF2E4] text-[#6B5A4E] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-extrabold text-[#3A312C] leading-tight">
                  {t('settings.breakTitle')}
                </p>
                <p className="text-[11px] font-semibold text-[#8A7B70] leading-snug mt-0.5">
                  {t('settings.breakDesc')}
                </p>
              </div>
            </div>
            <div
              role="radiogroup"
              aria-label={t('settings.breakTitle')}
              className="grid grid-cols-4 gap-1.5 bg-[#EFE6D8] p-1 rounded-2xl"
            >
              {([0, 30, 45, 60] as const).map((mins) => {
                const selected = settings.breakReminderMinutes === mins;
                return (
                  <button
                    key={mins}
                    id={`btn-break-reminder-${mins}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onUpdateSetting('breakReminderMinutes', mins)}
                    className={`py-1.5 px-1 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer ${
                      selected
                        ? 'bg-white text-[#3A312C] shadow-xs'
                        : 'text-[#7E7067] hover:text-[#4F433B]'
                    }`}
                  >
                    {mins === 0
                      ? t('settings.breakOff')
                      : t('settings.breakMinutes', { count: mins })}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reset Skill Profile (#23): clears only the on-device suggestion model */}
        <div className="mt-4 pt-3.5 border-t border-[#EFE6D8]">
          <p className="text-[12.5px] font-black text-[#3A312C] flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-[#8B6CD6]" />
            {t('settings.skillResetTitle')}
          </p>
          <p className="text-[11px] font-bold text-[#8A7B70] mt-0.5 mb-2">
            {t('settings.skillResetDesc')}
          </p>
          {!confirmSkillReset ? (
            <button
              id="btn-reset-skill-profile"
              type="button"
              onClick={() => setConfirmSkillReset(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[13px] font-extrabold text-[#6B4EB5] bg-[#F3ECFD] hover:bg-[#E9DEFB] transition-colors cursor-pointer"
            >
              {t('settings.skillResetTitle')}
            </button>
          ) : (
            <div className="flex gap-2">
              <TactileButton
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setConfirmSkillReset(false)}
              >
                {t('common.cancel')}
              </TactileButton>
              <TactileButton
                id="btn-reset-skill-profile-confirm"
                variant="danger"
                size="sm"
                fullWidth
                onClick={() => {
                  setConfirmSkillReset(false);
                  onResetSkillProfile();
                }}
              >
                {t('settings.skillResetConfirm')}
              </TactileButton>
            </div>
          )}
        </div>

        {/* Reset Progress Section */}
        <div className="mt-4 pt-3.5 border-t border-[#EFE6D8]">
          {!confirmReset ? (
            <button
              id="btn-reset-progress"
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[13px] font-extrabold text-[#C84E4E] bg-[#FFF0F0] hover:bg-[#FFE3E3] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {t('settings.resetProgress')}
            </button>
          ) : (
            <div className="rounded-2xl bg-[#FFF0F0] p-3 text-center">
              <p className="text-[12px] font-extrabold text-[#B23B3B] mb-2.5">
                {t('settings.resetConfirmTitle')}
              </p>
              <div className="flex gap-2">
                <TactileButton
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setConfirmReset(false)}
                >
                  {t('common.cancel')}
                </TactileButton>
                <TactileButton
                  id="btn-confirm-reset"
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setConfirmReset(false);
                    onResetProgress();
                  }}
                >
                  {t('settings.resetConfirmYes')}
                </TactileButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalSheet>
  );
};
