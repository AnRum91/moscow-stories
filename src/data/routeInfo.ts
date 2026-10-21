import type { Place, Variant } from '../types'; import { estimateMinutes, routeDistance } from '../services/geo';
export const TARGET_MIN: Record<Variant, [number, number]> = { short: [30, 45], full: [90, 180] };
export interface VariantInfo { minutes: number; km: number; inTarget: boolean; note: string | null; }
/** Оценка варианта + явная пометка, если он не укладывается в целевой формат ТЗ (молча «хороший» маршрут не показываем). */
export function variantInfo(stops: Place[], v: Variant, distanceM = routeDistance(stops.map(s => [s.latitude, s.longitude] as [number, number]))): VariantInfo {
  const minutes = estimateMinutes(distanceM, stops.length), [lo, hi] = TARGET_MIN[v], inTarget = minutes >= lo && minutes <= hi;
  return { minutes, km: distanceM / 1000, inTarget, note: inTarget ? null : `Предварительный вариант: по оценке ≈${minutes} мин — ${minutes < lo ? 'меньше' : 'больше'} целевых ${lo}–${hi} мин.` };
}
