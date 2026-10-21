import type { Place, Route, Variant } from '../types';
export interface RouteLine { pts: [number, number][]; straight: boolean; status: 'verified' | 'preliminary'; }
/** Берёт проверенную пешеходную геометрию, иначе — прямые между остановками (предварительно). */
export function routeLine(r: Route, v: Variant, stops: Place[]): RouteLine {
  const g = r.geometry?.[v];
  if (g && g.length > 1) return { pts: g, straight: false, status: r.geometryStatus ?? 'preliminary' };
  return { pts: stops.map(s => [s.latitude, s.longitude] as [number, number]), straight: true, status: 'preliminary' };
}
