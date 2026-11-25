import React, { useState } from 'react';
import {
  Eye,
  Music,
  Smartphone,
  Sparkles,
  Trash2,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import { ModalSheet } from '../../components/Modals/ModalSheet';
import { TactileButton } from '../../components/Buttons/TactileButton';
import { PlayerSettings } from '../../game/gameTypes';

interface SettingsScreenProps {
  open: boolean;
  settings: PlayerSettings;
  onUpdateSetting: <K extends keyof PlayerSettings>(
    key: K,
    value: PlayerSettings[K]
  ) => void;
  onResetProgress: () => void;
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
      <div className="w-9 h-9 rounded-xl bg-white border border-[#EAE0D2] flex items-center justify-center text-[#5A4E47] shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[14px] font-extrabold text-[#3A312C] leading-tight">
          {label}
        </div>
        <div className="text-[11px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
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

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  open,
  settings,
  onUpdateSetting,
  onResetProgress,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleClose = () => {
    setConfirmReset(false);
    onClose();
  };

  return (
    <ModalSheet open={open} onClose={handleClose} ariaLabel="Game settings">
      <div className="p-5 flex flex-col max-h-[85dvh] soft-scroll">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[20px] font-black text-[#3A312C] tracking-tight">
            Settings
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer active:scale-92"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <ToggleRow
            id="toggle-auto-x"
            icon={<Wand2 className="w-4.5 h-4.5 text-[#E59C1E]" />}
            label="Smart Auto-×"
            description="Auto-mark × around valid cats"
            checked={settings.autoMarkX}
            onToggle={() => onUpdateSetting('autoMarkX', !settings.autoMarkX)}
          />
          <ToggleRow
            id="toggle-sound"
            icon={<Volume2 className="w-4.5 h-4.5" />}
            label="Sound Effects"
            description="Soft chimes, taps & purrs"
            checked={settings.soundEnabled}
            onToggle={() => onUpdateSetting('soundEnabled', !settings.soundEnabled)}
          />
          <ToggleRow
            id="toggle-music"
            icon={<Music className="w-4.5 h-4.5" />}
            label="Cozy Music"
            description="Gentle ambient lullaby"
            checked={settings.musicEnabled}
            onToggle={() => onUpdateSetting('musicEnabled', !settings.musicEnabled)}
          />
          <ToggleRow
            id="toggle-haptics"
            icon={<Smartphone className="w-4.5 h-4.5" />}
            label="Haptic Feedback"
            description="Subtle vibration on tap"
            checked={settings.hapticsEnabled}
            onToggle={() =>
              onUpdateSetting('hapticsEnabled', !settings.hapticsEnabled)
            }
          />
          <ToggleRow
            id="toggle-reduced-motion"
            icon={<Sparkles className="w-4.5 h-4.5" />}
            label="Reduced Motion"
            description="Minimize bounce & particles"
            checked={settings.reducedMotion}
            onToggle={() =>
              onUpdateSetting('reducedMotion', !settings.reducedMotion)
            }
          />
          <ToggleRow
            id="toggle-symbols"
            icon={<Eye className="w-4.5 h-4.5" />}
            label="Region Symbols"
            description="Add subtle icons to colors"
            checked={settings.showRegionSymbols}
            onToggle={() =>
              onUpdateSetting('showRegionSymbols', !settings.showRegionSymbols)
            }
          />
        </div>

        {/* Reset Progress Section */}
        <div className="mt-5 pt-4 border-t border-[#EFE6D8]">
          {!confirmReset ? (
            <button
              id="btn-reset-progress"
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[13px] font-extrabold text-[#C84E4E] bg-[#FFF0F0] hover:bg-[#FFE3E3] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Reset All Progress
            </button>
          ) : (
            <div className="rounded-2xl bg-[#FFF0F0] p-3 text-center">
              <p className="text-[12.5px] font-extrabold text-[#B23B3B] mb-2.5">
                Clear all solved levels, stars, and best times?
              </p>
              <div className="flex gap-2">
                <TactileButton
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
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
                  Yes, Reset
                </TactileButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalSheet>
  );
};
