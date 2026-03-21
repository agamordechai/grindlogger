const STORAGE_KEY = 'weight_unit';

export type WeightUnit = 'kg' | 'lbs';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

export function getWeightUnit(): WeightUnit {
  const val = localStorage.getItem(STORAGE_KEY);
  return val === 'lbs' ? 'lbs' : 'kg';
}

export function setWeightUnit(unit: WeightUnit): void {
  localStorage.setItem(STORAGE_KEY, unit);
  window.dispatchEvent(new Event('unit-change'));
}

/** Convert a kg value to the display unit. */
export function toDisplayWeight(kg: number | null | undefined, unit?: WeightUnit): number | null {
  if (kg == null) return null;
  const u = unit ?? getWeightUnit();
  if (u === 'lbs') return Math.round(kg * KG_TO_LBS * 10) / 10;
  return kg;
}

/** Convert a display-unit value back to kg for storage. */
export function toKg(value: number, unit?: WeightUnit): number {
  const u = unit ?? getWeightUnit();
  if (u === 'lbs') return Math.round(value * LBS_TO_KG * 10) / 10;
  return value;
}

/** Format a weight value with its unit label. */
export function formatWeight(kg: number | null | undefined, unit?: WeightUnit): string {
  const u = unit ?? getWeightUnit();
  const display = toDisplayWeight(kg, u);
  if (display == null) return '';
  return `${display} ${u}`;
}
