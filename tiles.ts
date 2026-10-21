// Поставщик тайлов настраивается через .env. Без VITE_TILE_OFFLINE_OK=true офлайн-карта НЕ скачивается.
const env = import.meta.env as Record<string, string | undefined>;
export const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE = { url: env.VITE_TILE_URL || OSM, attribution: env.VITE_TILE_ATTR || '© участники OpenStreetMap',
  offlineAllowed: !!env.VITE_TILE_URL && env.VITE_TILE_OFFLINE_OK === 'true' };
const x = (lng: number, z: number) => Math.floor((lng + 180) / 360 * 2 ** z);
const y = (lat: number, z: number) => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };
export const fill = (t: string, z: number, a: number, b: number) => t.replace('{z}', `${z}`).replace('{x}', `${a}`).replace('{y}', `${b}`);
/** Тайлы вокруг маршрута: bbox + запас, зумы 13–16, не более maxTiles. */
export function tilesFor(pts: [number, number][], margin = 0.004, zooms = [13, 14, 15, 16], maxTiles = 800): string[] {
  const la = pts.map(p => p[0]), ln = pts.map(p => p[1]);
  const out: string[] = [];
  for (const z of zooms) {
    const x0 = x(Math.min(...ln) - margin, z), x1 = x(Math.max(...ln) + margin, z), y0 = y(Math.max(...la) + margin, z), y1 = y(Math.min(...la) - margin, z);
    for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) out.push(fill(TILE.url, z, a, b));
  }
  return out.slice(0, maxTiles);
}
export const EST_TILE_KB = 15; // допущение для оценки, не измеренное значение
