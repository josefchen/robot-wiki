/**
 * Demonstrations recorded per hour on UMI's cup-arrangement task, as the
 * UMI project site prints them (umi-gripper.github.io, "Comparison with
 * Other Methods", read 2026-10-26): "111/h UMI Gripper", "231/h Human Hand",
 * "35/h Teleoperation via Space Mouse", with "UMI gripper is over 3x faster
 * than teleoperation, reaching 48% of human hand speed". The paper states
 * the ratios but not the hourly rates.
 */

export interface CollectionRate {
  id: string;
  label: string;
  perHour: number;
}

export const UMI_COLLECTION_RATES: readonly CollectionRate[] = [
  { id: 'bare-hand', label: 'Bare hand, no robot', perHour: 231 },
  { id: 'umi', label: 'UMI handheld gripper', perHour: 111 },
  { id: 'spacemouse', label: 'Spacemouse teleoperation of a robot', perHour: 35 },
];

export const UMI_RATE_ID = 'umi';
export const UMI_RATES_CITATION_ID = 'umi-gripper-site-2024';

export function rateOf(id: string): number {
  const rate = UMI_COLLECTION_RATES.find((r) => r.id === id);
  if (!rate) throw new Error(`umi-collection-rates: no rate "${id}"`);
  return rate.perHour;
}
