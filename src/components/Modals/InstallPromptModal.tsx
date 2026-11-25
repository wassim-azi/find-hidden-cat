import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Download,
  PlusSquare,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import {
  getPwaInstallState,
  markInstallDismissed,
  PwaInstallState,
  subscribePwaInstall,
  triggerNativeInstall,
} from '../../services/pwaInstall';

interface InstallPromptModalProps {
  open: boolean;
  onClose: () => void;
  onInstalledToast?: (msg: string) => void;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({
  open,
  onClose,
  onInstalledToast,
}) => {
  const { t } = useTranslation();
  const [installState, setInstallState] = useState<PwaInstallState>(() =>
    getPwaInstallState()
  );
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    return subscribePwaInstall(setInstallState);
  }, []);

  const handleDismiss = () => {
    markInstallDismissed();
    onClose();
  };

  const handleNativeInstall = async () => {
    setInstalling(true);
    const outcome = await triggerNativeInstall();
    setInstalling(false);
    if (outcome === 'accepted') {
      onInstalledToast?.(t('pwa.installSuccessToast'));
      onClose();
    }
  };

  return (
    <ModalSheet open={open} onClose={handleDismiss} ariaLabel={t('pwa.installAria')}>
      <div className="p-5 flex flex-col items-center text-center max-h-[86dvh] soft-scroll">
        <div className="w-full flex justify-end -mb-2">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('common.close')}
            className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer active:scale-92"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <img
          src="/icons/icon-192.png"
          alt="Meowdoku App Icon"
          width={76}
          height={76}
          className="w-19 h-19 rounded-[22px] shadow-[0_10px_24px_rgba(92,69,52,0.18)] border-2 border-white mb-3"
        />

        <h2 className="text-[20px] font-black text-[#3A312C] tracking-tight">
          {installState.isInstalled
            ? t('pwa.installedTitle')
            : t('pwa.installTitle')}
        </h2>
        <p className="text-[12.5px] font-bold text-[#7E7067] mt-1 leading-snug max-w-[290px]">
          {installState.isInstalled
            ? t('pwa.installedDesc')
            : t('pwa.installDesc')}
        </p>

        {/* Key Benefits */}
        <div className="w-full grid grid-cols-2 gap-2 mt-3.5 text-left">
          <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-2.5 flex items-start gap-2">
            <WifiOff className="w-4 h-4 text-[#6EB58E] shrink-0 mt-0.5" />
            <div>
              <div className="text-[11.5px] font-black text-[#3A312C] leading-tight">
                {t('pwa.benefitOfflineTitle')}
              </div>
              <div className="text-[10px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
                {t('pwa.benefitOfflineDesc')}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-2.5 flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-[#FF7A7A] shrink-0 mt-0.5" />
            <div>
              <div className="text-[11.5px] font-black text-[#3A312C] leading-tight">
                {t('pwa.benefitFullscreenTitle')}
              </div>
              <div className="text-[10px] font-semibold text-[#8A7B70] leading-tight mt-0.5">
                {t('pwa.benefitFullscreenDesc')}
              </div>
            </div>
          </div>
        </div>

        {/* Platform-tailored Installation Action */}
        {installState.isInstalled ? (
          <div className="w-full mt-4 rounded-2xl bg-[#E8F7EE] border border-[#BBE2CB] px-3.5 py-2.5 flex items-center justify-center gap-2 text-[#2D754E] text-[12.5px] font-extrabold">
            <CheckCircle2 className="w-4.5 h-4.5" />
            {t('pwa.alreadyInstalledBadge')}
          </div>
        ) : installState.canPromptNative ? (
          <div className="w-full flex flex-col gap-2 mt-4">
            <TactileButton
              id="btn-pwa-install-confirm"
              variant="primary"
              fullWidth
              disabled={installing}
              onClick={handleNativeInstall}
            >
              <Download className="w-4.5 h-4.5" />
              {installing ? t('pwa.installingBtn') : t('pwa.installNowBtn')}
            </TactileButton>
            <TactileButton variant="ghost" size="sm" fullWidth onClick={handleDismiss}>
              {t('pwa.maybeLater')}
            </TactileButton>
          </div>
        ) : installState.isIosSafari ? (
          <div className="w-full mt-4 rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3.5 text-left">
            <div className="text-[11.5px] font-black uppercase tracking-wider text-[#9A6818] mb-2">
              {t('pwa.iosStepsTitle')}
            </div>
            <ol className="flex flex-col gap-2 text-[12px] font-bold text-[#4D423B]">
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-white border border-[#E5DACB] flex items-center justify-center text-[#3C7FE6] shrink-0">
                  <Share className="w-3.5 h-3.5" />
                </span>
                <span>{t('pwa.iosStep1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-white border border-[#E5DACB] flex items-center justify-center text-[#3A312C] shrink-0">
                  <PlusSquare className="w-3.5 h-3.5" />
                </span>
                <span>{t('pwa.iosStep2')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#E8F7EE] border border-[#BBE2CB] flex items-center justify-center text-[#2D754E] font-black text-[11px] shrink-0">
                  3
                </span>
                <span>{t('pwa.iosStep3')}</span>
              </li>
            </ol>
            <TactileButton
              variant="primary"
              size="sm"
              fullWidth
              onClick={handleDismiss}
              className="mt-3"
            >
              {t('common.awesome')}
            </TactileButton>
          </div>
        ) : (
          <div className="w-full mt-4 rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3 text-left">
            <p className="text-[11.5px] font-bold text-[#6E6056] leading-snug">
              {t('pwa.browserMenuHint')}
            </p>
            <TactileButton
              variant="secondary"
              size="sm"
              fullWidth
              onClick={handleDismiss}
              className="mt-3"
            >
              {t('common.close')}
            </TactileButton>
          </div>
        )}
      </div>
    </ModalSheet>
  );
};
