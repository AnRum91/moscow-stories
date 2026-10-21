import type { Place, Route } from '../types'; import { routeDistance, estimateMinutes } from '../services/geo';
export const MOSCOW = { minLat: 55.48, maxLat: 56.03, minLng: 37.30, maxLng: 37.95 };
export function validate(places: Place[], routes: Route[]): string[] {
  const e: string[] = [], ids = new Set<string>();
  for (const p of places) {
    if (ids.has(p.id)) e.push(`дубликат id ${p.id}`); ids.add(p.id);
    if (!p.name || !p.address) e.push(`${p.id}: нет названия или адреса`);
    if (!(p.latitude >= MOSCOW.minLat && p.latitude <= MOSCOW.maxLat && p.longitude >= MOSCOW.minLng && p.longitude <= MOSCOW.maxLng)) e.push(`${p.id}: координаты вне Москвы`);
    if (!p.categories.length) e.push(`${p.id}: нет категорий`);
    if (p.contentStatus === 'verified' && (!p.sources.length || p.sources.some(s => !s.checkedAt))) e.push(`${p.id}: «проверено» без источников/даты проверки`);
  }
  for (const r of routes) {
    for (const i of [...r.fullVersion.stopIds, ...(r.shortVersion?.stopIds ?? [])]) if (!ids.has(i)) e.push(`${r.id}: нет остановки ${i}`);
    const f = r.fullVersion.stopIds, s = r.shortVersion?.stopIds;
    if (s && s.join() === f.join()) e.push(`${r.id}: короткий и полный совпадают`);
    if (r.contentStatus === 'verified' && !r.sources.length) e.push(`${r.id}: «проверено» без источников`);
  }
  return e;
}
/** Соответствие целям ТЗ: короткий 30–45 мин, полный 90–180 мин (по оценке). */
export function durationWarnings(places: Place[], routes: Route[]): string[] {
  const by = new Map(places.map(p => [p.id, p] as [string, Place])), w: string[] = [];
  for (const r of routes) for (const [v, lo, hi] of [['short', 30, 45], ['full', 90, 180]] as const) {
    const ids = v === 'short' ? r.shortVersion?.stopIds : r.fullVersion.stopIds; if (!ids) continue;
    const s = ids.map(i => by.get(i)!).filter(Boolean), m = estimateMinutes(routeDistance(s.map(x => [x.latitude, x.longitude] as [number, number])), s.length);
    if (m < lo || m > hi) w.push(`${r.id}/${v}: ≈${m} мин, цель ${lo}–${hi}`);
  }
  return w;
}
