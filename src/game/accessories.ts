export type AccessoryId =
  | 'scarf'
  | 'flowerCrown'
  | 'starCrown'
  | 'winterBeanie'
  | 'snowflakeCollar'
  | 'blossomCrown'
  | 'butterflyBow'
  | 'sunHat'
  | 'shellNecklace'
  | 'leafScarf'
  | 'acornCharm'
  | 'goldBell'
  | 'pawCharm'
  | 'roundGlasses';

export type AccessorySlot = 'head' | 'neck' | 'face';
export type AccessorySource = 'set' | 'season' | 'chest';

export interface AccessoryDef {
  readonly id: AccessoryId;
  readonly slot: AccessorySlot;
  readonly source: AccessorySource;
}

export const ACCESSORIES: readonly AccessoryDef[] = [
  // Cat set rewards (#19)
  { id: 'scarf', slot: 'neck', source: 'set' },
  { id: 'flowerCrown', slot: 'head', source: 'set' },
  { id: 'starCrown', slot: 'head', source: 'set' },
  // Seasonal collections (#20)
  { id: 'winterBeanie', slot: 'head', source: 'season' },
  { id: 'snowflakeCollar', slot: 'neck', source: 'season' },
  { id: 'blossomCrown', slot: 'head', source: 'season' },
  { id: 'butterflyBow', slot: 'head', source: 'season' },
  { id: 'sunHat', slot: 'head', source: 'season' },
  { id: 'shellNecklace', slot: 'neck', source: 'season' },
  { id: 'leafScarf', slot: 'neck', source: 'season' },
  { id: 'acornCharm', slot: 'neck', source: 'season' },
  // Treasure chest cosmetics (#21)
  { id: 'goldBell', slot: 'neck', source: 'chest' },
  { id: 'pawCharm', slot: 'neck', source: 'chest' },
  { id: 'roundGlasses', slot: 'face', source: 'chest' },
] as const;

export const VALID_ACCESSORY_IDS: ReadonlySet<string> = new Set(
  ACCESSORIES.map((a) => a.id)
);

export function getAccessoryDef(id: AccessoryId): AccessoryDef {
  return ACCESSORIES.find((a) => a.id === id) ?? ACCESSORIES[0]!;
}
