import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import {
  generateParentGate,
  hashFamilyPin,
  isValidParentGateAnswer,
  ParentGateChallenge,
  verifyFamilyPin,
} from '../../game/familyMode';
import { useGameStore } from '../../store/gameStore';

export const FamilyModals: React.FC = () => {
  const { t } = useTranslation();
  const mode = useGameStore((s) => s.familyModalMode);
  const familyPinHash = useGameStore((s) => s.settings.familyPinHash);
  const saveFamilyPin = useGameStore((s) => s.saveFamilyPin);
  const disableFamilyMode = useGameStore((s) => s.disableFamilyMode);
  const closeFamilyModal = useGameStore((s) => s.closeFamilyModal);

  const [pinInput, setPinInput] = useState('');
  const [pinCheckInput, setPinCheckInput] = useState('');
  const [gateInput, setGateInput] = useState('');
  const [useMathGate, setUseMathGate] = useState(false);
  const [challenge, setChallenge] = useState<ParentGateChallenge>(() => generateParentGate());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === 'set-pin') {
      setPinInput('');
      setErrorMsg(null);
      setBusy(false);
    } else if (mode === 'turn-off') {
      setPinCheckInput('');
      setGateInput('');
      setUseMathGate(familyPinHash === null);
      setChallenge(generateParentGate());
      setErrorMsg(null);
      setBusy(false);
    }
  }, [mode, familyPinHash]);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput) || busy) return;
    setBusy(true);
    const hash = await hashFamilyPin(pinInput);
    setBusy(false);
    saveFamilyPin(hash);
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyPinHash || busy) return;
    setBusy(true);
    const ok = await verifyFamilyPin(pinCheckInput, familyPinHash);
    setBusy(false);
    if (ok) {
      disableFamilyMode();
    } else {
      setPinCheckInput('');
      setErrorMsg(t('family.pinWrong'));
    }
  };

  const handleSubmitGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidParentGateAnswer(challenge, gateInput)) {
      disableFamilyMode();
    } else {
      setChallenge(generateParentGate());
      setGateInput('');
      setErrorMsg(t('family.gateWrong'));
    }
  };

  return (
    <>
      <ModalSheet
        id="family-pin-sheet"
        open={mode === 'set-pin'}
        onClose={() => saveFamilyPin(null)}
        ariaLabel={t('family.pinTitle')}
      >
        <form onSubmit={(e) => void handleSavePin(e)} className="p-5 flex flex-col text-center">
          <div className="flex justify-end -mb-2">
            <button
              type="button"
              onClick={() => saveFamilyPin(null)}
              aria-label={t('common.close')}
              className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="w-13 h-13 mx-auto rounded-2xl bg-[#EBF7F0] text-[#3B8B61] flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h2 className="text-[19px] font-black text-[#3A312C] tracking-tight">
            {t('family.pinTitle')}
          </h2>
          <p className="text-[12.5px] font-bold text-[#7E7067] mt-1 mb-4">
            {t('family.pinDesc')}
          </p>

          <input
            id="input-family-pin"
            type="text"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            aria-label={t('family.pinTitle')}
            className="w-full text-center tracking-[0.45em] text-[22px] font-black py-2.5 px-3 rounded-2xl bg-[#FAF5EC] border border-[#E5DACB] text-[#3A312C] tabular-nums mb-4"
          />

          <div className="flex flex-col gap-2">
            <TactileButton
              id="btn-family-pin-save"
              type="submit"
              variant="primary"
              fullWidth
              disabled={!/^\d{4}$/.test(pinInput) || busy}
            >
              {t('family.pinSave')}
            </TactileButton>
            <TactileButton
              id="btn-family-pin-skip"
              type="button"
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => saveFamilyPin(null)}
            >
              {t('family.pinSkip')}
            </TactileButton>
          </div>
        </form>
      </ModalSheet>

      <ModalSheet
        id="family-gate-sheet"
        open={mode === 'turn-off'}
        onClose={closeFamilyModal}
        ariaLabel={
          !useMathGate && familyPinHash ? t('family.pinCheckTitle') : t('family.gateTitle')
        }
      >
        {!useMathGate && familyPinHash ? (
          <form onSubmit={(e) => void handleVerifyPin(e)} className="p-5 flex flex-col text-center">
            <div className="flex justify-end -mb-2">
              <button
                type="button"
                onClick={closeFamilyModal}
                aria-label={t('common.close')}
                className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-13 h-13 mx-auto rounded-2xl bg-[#FAF2E4] text-[#9A6514] flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>

            <h2 className="text-[19px] font-black text-[#3A312C] tracking-tight">
              {t('family.pinCheckTitle')}
            </h2>

            <input
              id="input-family-pin-check"
              type="text"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={pinCheckInput}
              onChange={(e) => setPinCheckInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              aria-label={t('family.pinCheckTitle')}
              className="w-full mt-3 text-center tracking-[0.45em] text-[22px] font-black py-2.5 px-3 rounded-2xl bg-[#FAF5EC] border border-[#E5DACB] text-[#3A312C] tabular-nums"
            />

            {errorMsg && (
              <p role="status" className="text-[12px] font-extrabold text-[#C84E4E] mt-2">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-col gap-2 mt-4">
              <TactileButton
                id="btn-family-pin-verify"
                type="submit"
                variant="primary"
                fullWidth
                disabled={!/^\d{4}$/.test(pinCheckInput) || busy}
              >
                {t('family.gateSubmit')}
              </TactileButton>
              <TactileButton
                id="btn-family-forgot"
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => {
                  setUseMathGate(true);
                  setErrorMsg(null);
                  setGateInput('');
                  setChallenge(generateParentGate());
                }}
              >
                {t('family.forgot')}
              </TactileButton>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitGate} className="p-5 flex flex-col text-center">
            <div className="flex justify-end -mb-2">
              <button
                type="button"
                onClick={closeFamilyModal}
                aria-label={t('common.close')}
                className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-13 h-13 mx-auto rounded-2xl bg-[#FAF2E4] text-[#9A6514] flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>

            <h2 className="text-[19px] font-black text-[#3A312C] tracking-tight">
              {t('family.gateTitle')}
            </h2>
            <p
              id="family-gate-question"
              className="text-[16px] font-black text-[#4B367E] mt-2 mb-3"
            >
              {t('family.gateQuestion', { a: challenge.a, b: challenge.b })}
            </p>

            <input
              id="input-family-gate"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={gateInput}
              onChange={(e) => setGateInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
              aria-label={t('family.gateTitle')}
              className="w-full text-center text-[20px] font-black py-2.5 px-3 rounded-2xl bg-[#FAF5EC] border border-[#E5DACB] text-[#3A312C] tabular-nums"
            />

            {errorMsg && (
              <p role="status" className="text-[12px] font-extrabold text-[#C84E4E] mt-2">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-col gap-2 mt-4">
              <TactileButton
                id="btn-family-gate-submit"
                type="submit"
                variant="primary"
                fullWidth
                disabled={gateInput.trim().length === 0}
              >
                {t('family.gateSubmit')}
              </TactileButton>
            </div>
          </form>
        )}
      </ModalSheet>
    </>
  );
};
