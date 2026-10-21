import type { LatLng } from './geo'; import { haversine } from './geo'; import type { Prog } from './offline';
export const MAX_ACCURACY_M = 50, BASE_RADIUS_M = 25;
type Stop = { id: string; latitude: number; longitude: number };
/** Остановка отмечается пройденной, если точность GPS не хуже 50 м и расстояние ≤ 25 м + точность. Повторно не срабатывает. */
export function markVisited(p: Prog, stops: Stop[], pos: LatLng, accuracyM: number): Prog {
  if (!(accuracyM <= MAX_ACCURACY_M)) return p;
  const r = BASE_RADIUS_M + accuracyM;
  const hit = stops.filter(s => !p.visited.includes(s.id) && haversine(pos, [s.latitude, s.longitude]) <= r).map(s => s.id);
  return hit.length ? { ...p, visited: [...p.visited, ...hit] } : p;
}
