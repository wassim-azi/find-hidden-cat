import React, { useId } from 'react';
import { CatBreed } from '../../styles/theme';
import { AccessoryId, getAccessoryDef } from '../../game/accessories';
import { renderAccessory } from './accessories';

export type CatMood = 'idle' | 'happy' | 'conflict' | 'celebrate';

interface CatIllustrationProps {
  breed?: CatBreed;
  mood?: CatMood;
  className?: string;
  size?: number;
  alive?: boolean;
  blinkDelaySec?: number;
  accessory?: AccessoryId | null;
}

interface BreedPalette {
  baseLight: string;
  base: string;
  baseShadow: string;
  innerEar: string;
  muzzle?: string;
  stripe?: string;
  patchA?: string;
  patchB?: string;
  eyeIris: string;
  eyeAccent: string;
  nose: string;
  cheek: string;
  outline: string;
  pattern: 'tuxedo' | 'tabby' | 'solid' | 'siamese' | 'calico' | 'ragdoll';
  hasBow?: boolean;
}

const BREED_PALETTES: Record<CatBreed, BreedPalette> = {
  tuxedo: {
    baseLight: '#423B48',
    base: '#2C2731',
    baseShadow: '#1D1921',
    innerEar: '#F9B2C3',
    muzzle: '#FFFDF9',
    eyeIris: '#231E26',
    eyeAccent: '#4C4354',
    nose: '#FF8DA1',
    cheek: '#FF9EB2',
    outline: '#1F1B22',
    pattern: 'tuxedo',
  },
  ginger: {
    baseLight: '#FFBC75',
    base: '#F3964B',
    baseShadow: '#D9742B',
    innerEar: '#FFD2C6',
    muzzle: '#FFF6E8',
    stripe: '#CE6B22',
    eyeIris: '#2C211C',
    eyeAccent: '#69462B',
    nose: '#F07D82',
    cheek: '#FF969A',
    outline: '#B95E1D',
    pattern: 'tabby',
  },
  gray: {
    baseLight: '#ABB4C2',
    base: '#8A93A3',
    baseShadow: '#6E7787',
    innerEar: '#F5BDC9',
    muzzle: '#EEF1F6',
    stripe: '#646D7D',
    eyeIris: '#26232B',
    eyeAccent: '#54667A',
    nose: '#F091A1',
    cheek: '#F8A8B8',
    outline: '#5B6372',
    pattern: 'tabby',
  },
  cream: {
    baseLight: '#FFF6E6',
    base: '#F5E4C8',
    baseShadow: '#DEC6A2',
    innerEar: '#E9B9A9',
    muzzle: '#6E5347',
    patchA: '#785A4D',
    eyeIris: '#2D6BA8',
    eyeAccent: '#68B2F0',
    nose: '#513B32',
    cheek: '#F5A5A5',
    outline: '#BDA382',
    pattern: 'siamese',
  },
  calico: {
    baseLight: '#FFFFFF',
    base: '#FFF9F0',
    baseShadow: '#F0E4D4',
    innerEar: '#F9B8C6',
    patchA: '#F2964F',
    patchB: '#3A333A',
    eyeIris: '#2B2326',
    eyeAccent: '#5A4A42',
    nose: '#FF8FA3',
    cheek: '#FFA3B4',
    outline: '#CEBCA8',
    pattern: 'calico',
  },
  lilac: {
    baseLight: '#DCD0F2',
    base: '#C1B0DE',
    baseShadow: '#9F8BC4',
    innerEar: '#FBD2E0',
    muzzle: '#FCF9FF',
    stripe: '#927EC0',
    eyeIris: '#312548',
    eyeAccent: '#7C62B0',
    nose: '#F38BA8',
    cheek: '#FFACC7',
    outline: '#8672B2',
    pattern: 'solid',
    hasBow: true,
  },
  honey: {
    baseLight: '#FFE48E',
    base: '#F7C95B',
    baseShadow: '#DDA42E',
    innerEar: '#FBC6C6',
    muzzle: '#FFFBEF',
    stripe: '#D2921F',
    eyeIris: '#2A221A',
    eyeAccent: '#69532A',
    nose: '#F3868B',
    cheek: '#FFA2A6',
    outline: '#C0881D',
    pattern: 'tabby',
  },
  ragdoll: {
    baseLight: '#FFFFFF',
    base: '#FBF9F6',
    baseShadow: '#E7EDF2',
    innerEar: '#F7BDC9',
    patchA: '#7A99B5',
    eyeIris: '#2F6FA8',
    eyeAccent: '#75C0FA',
    nose: '#F48DA1',
    cheek: '#FFA8B8',
    outline: '#B8C5D2',
    pattern: 'ragdoll',
  },
};

export const CatIllustration: React.FC<CatIllustrationProps> = React.memo(
  ({
    breed = 'tuxedo',
    mood = 'idle',
    className = '',
    size,
    alive = true,
    blinkDelaySec = 0,
    accessory = null,
  }) => {
    const uid = useId().replace(/:/g, '');
    const p = BREED_PALETTES[breed];
    const headClipId = `ch-${uid}`;
    const furGradId = `fg-${uid}`;
    const accessorySlot = accessory ? getAccessoryDef(accessory).slot : null;

    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <clipPath id={headClipId}>
            <ellipse cx="50" cy="57" rx="36" ry="31" />
          </clipPath>
          <radialGradient id={furGradId} cx="42%" cy="32%" r="68%">
            <stop offset="0%" stopColor={p.baseLight} />
            <stop offset="58%" stopColor={p.base} />
            <stop offset="100%" stopColor={p.baseShadow} />
          </radialGradient>
        </defs>

        {/* Soft ambient shadow */}
        <ellipse cx="50" cy="89.5" rx="26" ry="5" fill="#3A312C" opacity="0.16" />

        {/* Left Ear */}
        <path
          d="M21 46 L15.5 17 Q15 11.5 21.5 14.5 L42 29 Z"
          fill={p.pattern === 'siamese' || p.pattern === 'ragdoll' ? p.patchA : `url(#${furGradId})`}
          stroke={p.outline}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <path d="M23 40 L20.5 21.5 L36 31 Z" fill={p.innerEar} />

        {/* Right Ear */}
        <path
          d="M79 46 L84.5 17 Q85 11.5 78.5 14.5 L58 29 Z"
          fill={
            p.pattern === 'calico'
              ? p.patchB
              : p.pattern === 'siamese' || p.pattern === 'ragdoll'
                ? p.patchA
                : `url(#${furGradId})`
          }
          stroke={p.outline}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <path d="M77 40 L79.5 21.5 L64 31 Z" fill={p.innerEar} />

        {/* Main Head Base with 3D Fur Gradient */}
        <ellipse
          cx="50"
          cy="57"
          rx="36"
          ry="31"
          fill={`url(#${furGradId})`}
          stroke={p.outline}
          strokeWidth="2.3"
        />

        {/* Coat Patterns clipped cleanly to head */}
        <g clipPath={`url(#${headClipId})`}>
          {p.pattern === 'tuxedo' && (
            <path
              d="M12 61 Q16 89 50 90 Q84 89 88 61 Q76 57 64 61 Q56 53 50 44 Q44 53 36 61 Q24 57 12 61 Z"
              fill={p.muzzle}
            />
          )}

          {p.pattern === 'tabby' && (
            <>
              <ellipse cx="50" cy="70.5" rx="22" ry="15" fill={p.muzzle} opacity="0.94" />
              <path
                d="M42 28 Q44 37 42 42 M50 25.5 Q50 37 50 43 M58 28 Q56 37 58 42"
                stroke={p.stripe}
                strokeWidth="3.3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M14 55 L24 57.5 M15 63 L23 64 M86 55 L76 57.5 M85 63 L77 64"
                stroke={p.stripe}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </>
          )}

          {p.pattern === 'solid' && (
            <ellipse cx="50" cy="71" rx="21.5" ry="14" fill={p.muzzle} opacity="0.9" />
          )}

          {p.pattern === 'siamese' && (
            <ellipse cx="50" cy="62.5" rx="20.5" ry="13.5" fill={p.muzzle} opacity="0.76" />
          )}

          {p.pattern === 'calico' && (
            <>
              <circle cx="24" cy="40" r="19" fill={p.patchA} />
              <circle cx="77" cy="41" r="18" fill={p.patchB} />
              <circle cx="78" cy="75" r="11" fill={p.patchA} opacity="0.88" />
            </>
          )}

          {p.pattern === 'ragdoll' && (
            <>
              <path d="M12 30 Q30 34 38 56 L12 58 Z" fill={p.patchA} opacity="0.86" />
              <path d="M88 30 Q70 34 62 56 L88 58 Z" fill={p.patchA} opacity="0.86" />
            </>
          )}

          {/* Soft glossy specular crown highlight */}
          <ellipse
            cx="48"
            cy="34"
            rx="19"
            ry="6.5"
            fill="#FFFFFF"
            opacity="0.16"
          />
        </g>

        {/* Crisp head rim re-stroke */}
        <ellipse
          cx="50"
          cy="57"
          rx="36"
          ry="31"
          fill="none"
          stroke={p.outline}
          strokeWidth="2.3"
        />

        {/* Cute tiny ribbon bow accessory for Lilac kitty */}
        {p.hasBow && (
          <g transform="translate(71, 29) rotate(22)">
            <ellipse cx="-5.5" cy="0" rx="5.5" ry="3.8" fill="#FF8BA7" />
            <ellipse cx="5.5" cy="0" rx="5.5" ry="3.8" fill="#FF8BA7" />
            <circle cx="0" cy="0" r="2.6" fill="#FFD166" />
          </g>
        )}

        {/* Cosmetic head/neck accessory (after head rim, before eyes) */}
        {accessory && (accessorySlot === 'head' || accessorySlot === 'neck') &&
          renderAccessory(accessory)}

        {/* Eyes */}
        {mood === 'celebrate' || mood === 'happy' ? (
          <g
            fill="none"
            stroke={p.pattern === 'siamese' ? '#FFFDF9' : '#2C2422'}
            strokeWidth="3.4"
            strokeLinecap="round"
          >
            <path d="M29 56 Q35 48.5 41 56" />
            <path d="M59 56 Q65 48.5 71 56" />
          </g>
        ) : mood === 'conflict' ? (
          <g fill="none" stroke="#E04444" strokeWidth="3.4" strokeLinecap="round">
            <path d="M31 50.5 L40 59.5 M40 50.5 L31 59.5" />
            <path d="M60 50.5 L69 59.5 M69 50.5 L60 59.5" />
          </g>
        ) : (
          <g
            className={alive ? 'cat-eyes-alive' : undefined}
            style={alive && blinkDelaySec ? { animationDelay: `${blinkDelaySec}s` } : undefined}
          >
            {/* Left Eye */}
            <circle cx="35" cy="54" r="7.2" fill="#FFFDF9" />
            <circle cx="35.8" cy="54.2" r="4.8" fill={p.eyeIris} />
            <circle cx="36.5" cy="55.8" r="2.1" fill={p.eyeAccent} opacity="0.65" />
            <circle cx="33.8" cy="51.7" r="2" fill="#FFFFFF" />
            <circle cx="37.8" cy="56.3" r="0.95" fill="#FFFFFF" opacity="0.8" />
            {/* Right Eye */}
            <circle cx="65" cy="54" r="7.2" fill="#FFFDF9" />
            <circle cx="64.2" cy="54.2" r="4.8" fill={p.eyeIris} />
            <circle cx="63.5" cy="55.8" r="2.1" fill={p.eyeAccent} opacity="0.65" />
            <circle cx="62.2" cy="51.7" r="2" fill="#FFFFFF" />
            <circle cx="66.2" cy="56.3" r="0.95" fill="#FFFFFF" opacity="0.8" />
          </g>
        )}

        {/* Cosmetic face accessory (after eyes) */}
        {accessory && accessorySlot === 'face' && renderAccessory(accessory)}

        {/* Rosy Cheeks */}
        <ellipse cx="24" cy="64.5" rx="6" ry="3.4" fill={p.cheek} opacity="0.72" />
        <ellipse cx="76" cy="64.5" rx="6" ry="3.4" fill={p.cheek} opacity="0.72" />

        {/* Nose */}
        <path
          d="M46.2 61.2 Q50 59 53.8 61.2 Q50 66.2 46.2 61.2 Z"
          fill={p.nose}
        />

        {/* Mouth */}
        {mood === 'conflict' ? (
          <path
            d="M44 71 Q50 66.5 56 71"
            fill="none"
            stroke={p.pattern === 'siamese' ? '#FFFDF9' : '#3A312C'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M50 64.5 Q46.5 70.5 42.2 67.8 M50 64.5 Q53.5 70.5 57.8 67.8"
            fill="none"
            stroke={p.pattern === 'siamese' ? '#FFFDF9' : '#3A312C'}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}

        {/* Delicate Whiskers */}
        <g stroke="#3A312C" strokeWidth="1.55" strokeLinecap="round" opacity="0.34">
          <path d="M11 59.5 L19.5 61.2 M10.5 65.8 L19.5 65.8" />
          <path d="M89 59.5 L80.5 61.2 M89.5 65.8 L80.5 65.8" />
        </g>
      </svg>
    );
  }
);

CatIllustration.displayName = 'CatIllustration';

/**
 * Pastel cat head silhouette used in the progress tracker for unfound regions.
 */
export const CatSilhouette: React.FC<{ color: string; className?: string }> = React.memo(
  ({ color, className = '' }) => (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M21 47 L16 18 Q16 12 22 15 L42 29 Q50 26 58 29 L78 15 Q84 12 84 18 L79 47 Q86 53 86 60 C86 78 70 89 50 89 C30 89 14 78 14 60 Q14 53 21 47 Z"
        fill={color}
        opacity="0.9"
      />
    </svg>
  )
);

CatSilhouette.displayName = 'CatSilhouette';
