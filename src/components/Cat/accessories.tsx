import React from 'react';
import type { AccessoryId } from '../../game/accessories';

const OUTLINE = '#3A312C';

/**
 * Renders a procedural flat-fill SVG accessory group in CatIllustration's 0..100 viewBox.
 * - head items: between ears, centred at x=50, y=14..30
 * - neck items: on chin line, centred at x=50, y=83..96
 * - face items: eye level, y=54 (left eye x=35, right eye x=65)
 */
export function renderAccessory(id: AccessoryId): React.ReactElement {
  switch (id) {
    case 'scarf':
      return (
        <g data-accessory="scarf">
          {/* Hanging scarf tail */}
          <path
            d="M55 85 L65 85 L68 97 L58 97 Z"
            fill="#E85A5A"
            stroke={OUTLINE}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <path d="M57 92 L66.5 92" stroke="#FFD97D" strokeWidth="2" />
          {/* Main wrapped neck band */}
          <path
            d="M27 81 Q50 91 73 81 Q75 87 71 89 Q50 96 29 89 Q25 87 27 81 Z"
            fill="#FF7272"
            stroke={OUTLINE}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M36 86 Q50 91 64 86"
            fill="none"
            stroke="#FFD97D"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </g>
      );

    case 'flowerCrown':
      return (
        <g data-accessory="flowerCrown">
          {/* Leafy band */}
          <path
            d="M32 28 Q50 22 68 28"
            fill="none"
            stroke="#5BA87D"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <ellipse cx="43.5" cy="24" rx="4.2" ry="2.2" transform="rotate(-18 43.5 24)" fill="#6EB58E" stroke={OUTLINE} strokeWidth="1.4" />
          <ellipse cx="56.5" cy="24" rx="4.2" ry="2.2" transform="rotate(18 56.5 24)" fill="#6EB58E" stroke={OUTLINE} strokeWidth="1.4" />
          {/* Left flower */}
          <circle cx="37" cy="27.5" r="4.8" fill="#FF9EB5" stroke={OUTLINE} strokeWidth="1.8" />
          <circle cx="37" cy="27.5" r="2" fill="#FFD166" />
          {/* Center flower */}
          <circle cx="50" cy="24" r="5.6" fill="#FFF2A6" stroke={OUTLINE} strokeWidth="1.9" />
          <circle cx="50" cy="24" r="2.3" fill="#FF8C69" />
          {/* Right flower */}
          <circle cx="63" cy="27.5" r="4.8" fill="#C7B2F5" stroke={OUTLINE} strokeWidth="1.8" />
          <circle cx="63" cy="27.5" r="2" fill="#FFD166" />
        </g>
      );

    case 'starCrown':
      return (
        <g data-accessory="starCrown">
          <path
            d="M37 28 L39 17 L45 22.5 L50 13.5 L55 22.5 L61 17 L63 28 Q50 30 37 28 Z"
            fill="#F9C74F"
            stroke={OUTLINE}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="23" r="2.3" fill="#FFFDF4" stroke={OUTLINE} strokeWidth="1.2" />
          <circle cx="42.5" cy="24.5" r="1.5" fill="#90E0EF" />
          <circle cx="57.5" cy="24.5" r="1.5" fill="#FF9EB5" />
        </g>
      );

    case 'winterBeanie':
      return (
        <g data-accessory="winterBeanie">
          {/* Pom-pom */}
          <circle cx="50" cy="11.5" r="4.5" fill="#FFF8EE" stroke={OUTLINE} strokeWidth="2.1" />
          {/* Knit dome */}
          <path
            d="M34 27 Q35 14 50 14 Q65 14 66 27 Z"
            fill="#6DA9D9"
            stroke={OUTLINE}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M43 16 L41.5 25 M50 15 L50 25 M57 16 L58.5 25" stroke="#4D86B8" strokeWidth="1.7" strokeLinecap="round" />
          {/* Ribbed cuff */}
          <rect
            x="32"
            y="24"
            width="36"
            height="6.2"
            rx="3.1"
            fill="#FFF8EE"
            stroke={OUTLINE}
            strokeWidth="2.1"
          />
        </g>
      );

    case 'snowflakeCollar':
      return (
        <g data-accessory="snowflakeCollar">
          <path
            d="M30 83 Q50 91 70 83 Q71 87.5 68 89 Q50 95 32 89 Q29 87.5 30 83 Z"
            fill="#7CC4E8"
            stroke={OUTLINE}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          {/* Snowflake medallion */}
          <circle cx="50" cy="91.5" r="5.4" fill="#EAF7FF" stroke={OUTLINE} strokeWidth="1.9" />
          <g stroke="#4D91B5" strokeWidth="1.5" strokeLinecap="round">
            <path d="M50 87.8 L50 95.2" />
            <path d="M46.8 89.6 L53.2 93.4" />
            <path d="M53.2 89.6 L46.8 93.4" />
          </g>
        </g>
      );

    case 'blossomCrown':
      return (
        <g data-accessory="blossomCrown">
          <path
            d="M33 28 Q50 21.5 67 28"
            fill="none"
            stroke="#8EC99C"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Left sakura */}
          <g transform="translate(38 27)">
            <circle cx="0" cy="-2.8" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="2.7" cy="-0.8" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="1.6" cy="2.3" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="-1.6" cy="2.3" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="-2.7" cy="-0.8" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="0" cy="0" r="1.7" fill="#FFE082" />
          </g>
          {/* Center sakura */}
          <g transform="translate(50 23.5)">
            <circle cx="0" cy="-3.2" r="3" fill="#FFD1E1" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="3.1" cy="-1" r="3" fill="#FFD1E1" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="1.9" cy="2.6" r="3" fill="#FFD1E1" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="-1.9" cy="2.6" r="3" fill="#FFD1E1" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="-3.1" cy="-1" r="3" fill="#FFD1E1" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="0" cy="0" r="2" fill="#FFCA58" />
          </g>
          {/* Right sakura */}
          <g transform="translate(62 27)">
            <circle cx="0" cy="-2.8" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="2.7" cy="-0.8" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="1.6" cy="2.3" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="-1.6" cy="2.3" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="-2.7" cy="-0.8" r="2.6" fill="#FFB7CE" stroke={OUTLINE} strokeWidth="1.2" />
            <circle cx="0" cy="0" r="1.7" fill="#FFE082" />
          </g>
        </g>
      );

    case 'butterflyBow':
      return (
        <g data-accessory="butterflyBow">
          {/* Upper wings */}
          <ellipse cx="42" cy="21" rx="7.2" ry="5" transform="rotate(-18 42 21)" fill="#C5A3F5" stroke={OUTLINE} strokeWidth="2.1" />
          <ellipse cx="58" cy="21" rx="7.2" ry="5" transform="rotate(18 58 21)" fill="#C5A3F5" stroke={OUTLINE} strokeWidth="2.1" />
          {/* Lower wings */}
          <ellipse cx="43.5" cy="26.8" rx="5.2" ry="3.4" transform="rotate(14 43.5 26.8)" fill="#FFA8C5" stroke={OUTLINE} strokeWidth="1.9" />
          <ellipse cx="56.5" cy="26.8" rx="5.2" ry="3.4" transform="rotate(-14 56.5 26.8)" fill="#FFA8C5" stroke={OUTLINE} strokeWidth="1.9" />
          {/* Center body */}
          <rect x="47.8" y="18.5" width="4.4" height="10" rx="2.2" fill="#FFD166" stroke={OUTLINE} strokeWidth="1.8" />
        </g>
      );

    case 'sunHat':
      return (
        <g data-accessory="sunHat">
          {/* Wide straw brim */}
          <ellipse cx="50" cy="27.5" rx="24" ry="5.8" fill="#F5D78E" stroke={OUTLINE} strokeWidth="2.2" />
          {/* Hat crown */}
          <path
            d="M36 26.5 Q37 14.5 50 14.5 Q63 14.5 64 26.5 Z"
            fill="#F9E3A6"
            stroke={OUTLINE}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Coral ribbon */}
          <path
            d="M36 24.5 Q50 28 64 24.5 L64 27 Q50 30.2 36 27 Z"
            fill="#FF7D7D"
            stroke={OUTLINE}
            strokeWidth="1.6"
          />
        </g>
      );

    case 'shellNecklace':
      return (
        <g data-accessory="shellNecklace">
          <path
            d="M30 83 Q50 93 70 83"
            fill="none"
            stroke="#59B7B0"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="40.5" cy="87.5" r="2.3" fill="#FFF8EE" stroke={OUTLINE} strokeWidth="1.5" />
          <circle cx="59.5" cy="87.5" r="2.3" fill="#FFF8EE" stroke={OUTLINE} strokeWidth="1.5" />
          {/* Scalloped shell */}
          <path
            d="M44 90 Q50 85 56 90 L53 96 L47 96 Z"
            fill="#FFB997"
            stroke={OUTLINE}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M50 88 L50 95" stroke={OUTLINE} strokeWidth="1.3" strokeLinecap="round" />
        </g>
      );

    case 'leafScarf':
      return (
        <g data-accessory="leafScarf">
          <path
            d="M28 82 Q50 91.5 72 82 Q74 87.5 70 89.5 Q50 96 30 89.5 Q26 87.5 28 82 Z"
            fill="#E07A3F"
            stroke={OUTLINE}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Golden autumn leaf clasp */}
          <path
            d="M55 86 Q63 85 65 92 Q59 97 54 93 Z"
            fill="#F4B942"
            stroke={OUTLINE}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M55.5 87.5 L62 93" stroke={OUTLINE} strokeWidth="1.3" strokeLinecap="round" />
        </g>
      );

    case 'acornCharm':
      return (
        <g data-accessory="acornCharm">
          <path
            d="M30 83 Q50 91 70 83 Q71 87.5 68 89 Q50 95 32 89 Q29 87.5 30 83 Z"
            fill="#5E9E6E"
            stroke={OUTLINE}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          {/* Acorn nut */}
          <path
            d="M46 90 Q46 97 50 97.5 Q54 97 54 90 Z"
            fill="#C78A52"
            stroke={OUTLINE}
            strokeWidth="1.8"
          />
          {/* Acorn cap */}
          <path
            d="M44.5 90 Q50 85.5 55.5 90 Z"
            fill="#7B4B2A"
            stroke={OUTLINE}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'goldBell':
      return (
        <g data-accessory="goldBell">
          <path
            d="M30 83 Q50 91 70 83 Q71 87.5 68 89 Q50 95 32 89 Q29 87.5 30 83 Z"
            fill="#E65C6B"
            stroke={OUTLINE}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="92" r="5.2" fill="#FFD166" stroke={OUTLINE} strokeWidth="2.1" />
          <path d="M46 92 L54 92" stroke={OUTLINE} strokeWidth="1.5" />
          <circle cx="50" cy="94" r="1.4" fill={OUTLINE} />
        </g>
      );

    case 'pawCharm':
      return (
        <g data-accessory="pawCharm">
          <path
            d="M30 83 Q50 91 70 83 Q71 87.5 68 89 Q50 95 32 89 Q29 87.5 30 83 Z"
            fill="#9B86D4"
            stroke={OUTLINE}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="92" r="5.5" fill="#FFF3D1" stroke={OUTLINE} strokeWidth="2" />
          {/* Tiny paw print */}
          <circle cx="50" cy="93.2" r="1.8" fill="#FF8DA1" />
          <circle cx="47.6" cy="90.6" r="1" fill="#FF8DA1" />
          <circle cx="50" cy="89.7" r="1" fill="#FF8DA1" />
          <circle cx="52.4" cy="90.6" r="1" fill="#FF8DA1" />
        </g>
      );

    case 'roundGlasses':
      return (
        <g data-accessory="roundGlasses">
          {/* Lens tint */}
          <circle cx="35" cy="54" r="10.2" fill="#FFFFFF" opacity="0.22" />
          <circle cx="65" cy="54" r="10.2" fill="#FFFFFF" opacity="0.22" />
          {/* Frames */}
          <circle cx="35" cy="54" r="10.2" fill="none" stroke={OUTLINE} strokeWidth="2.3" />
          <circle cx="65" cy="54" r="10.2" fill="none" stroke={OUTLINE} strokeWidth="2.3" />
          {/* Bridge & temples */}
          <path d="M45.2 53.5 Q50 51 54.8 53.5" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M24.8 53 L16 51 M75.2 53 L84 51" fill="none" stroke={OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
        </g>
      );

    default: {
      const _exhaustive: never = id;
      throw new Error(`Unhandled accessory: ${String(_exhaustive)}`);
    }
  }
}
