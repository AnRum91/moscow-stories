import type { Place, Route, Variant } from '../types';
export interface SavedTour { key: string; route: Route; variant: Variant; places: Place[]; assets: string[]; tiles: string[]; withMap: boolean; bytes: number; checksum: string; savedAt: number; }
export interface Progress { done: number; total: number; label: string; }
export const keyOf = (r: Route, v: Variant) => `${r.id}:${v}`;
const open = () => new Promise<IDBDatabase>((res, rej) => { const q = indexedDB.open('moscow-stories', 1); q.onupgradeneeded = () => q.result.createObjectStore('tours', { keyPath: 'key' }); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
const tx = async <T,>(m: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => { const db = await open(); return new Promise<T>((res, rej) => { const r = f(db.transaction('tours', m).objectStore('tours')); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); };
export const listTours = () => tx<SavedTour[]>('readonly', s => s.getAll());
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
export const assetsOf = (places: Place[], route: Route) => [...new Set([route.coverImage?.url, ...places.flatMap(p => [p.image?.url, p.audio, ...(p.gallery ?? []).map(g => g.url)])].filter(Boolean) as string[])];
async function grab(url: string, cache: Cache, signal: AbortSignal): Promise<number> {
  let err: unknown;
  for (let i = 0; i < 2; i++) { try { const r = await fetch(url, { signal }); if (!r.ok) throw new Error(`${r.status}`); const b = await r.clone().blob(); await cache.put(url, r); return b.size; } catch (e) { err = e; if (signal.aborted) throw e; } }
  throw err;
}
export async function downloadTour(route: Route, variant: Variant, places: Place[], tiles: string[], on: (p: Progress) => void, signal: AbortSignal): Promise<SavedTour> {
  const assets = assetsOf(places, route), data = JSON.stringify({ route, places });
  let bytes = new Blob([data]).size, done = 0; const total = assets.length + tiles.length;
  const ca = await caches.open('tour-assets'), ct = await caches.open('tour-tiles');
  for (const u of assets) { on({ done, total, label: 'Фото и аудио' }); bytes += await grab(u, ca, signal); done++; }
  for (const u of tiles) { on({ done, total, label: 'Карта' }); bytes += await grab(u, ct, signal); done++; }
  on({ done: total, total, label: 'Проверка' });
  const t: SavedTour = { key: keyOf(route, variant), route, variant, places, assets, tiles, withMap: tiles.length > 0, bytes, checksum: await sha(data), savedAt: Date.now() };
  await tx('readwrite', s => s.put(t)); return t;
}
/** Проверка целостности: контрольная сумма данных + наличие всех файлов в кэше. */
export async function verify(t: SavedTour): Promise<boolean> {
  if (await sha(JSON.stringify({ route: t.route, places: t.places })) !== t.checksum) return false;
  const ca = await caches.open('tour-assets'), ct = await caches.open('tour-tiles');
  return (await Promise.all([...t.assets.map(u => ca.match(u)), ...t.tiles.map(u => ct.match(u))])).every(Boolean);
}
export async function deleteTour(key: string) {
  const all = await listTours(), me = all.find(t => t.key === key); if (!me) return;
  const keep = new Set(all.filter(t => t.key !== key).flatMap(t => [...t.assets, ...t.tiles]));
  const ca = await caches.open('tour-assets'), ct = await caches.open('tour-tiles');
  await Promise.all([...me.assets.filter(u => !keep.has(u)).map(u => ca.delete(u)), ...me.tiles.filter(u => !keep.has(u)).map(u => ct.delete(u))]);
  await tx('readwrite', s => s.delete(key));
}
/** Аудио: из кэша (офлайн) либо по сети; null — недоступно. */
export async function audioSrc(url?: string): Promise<string | null> {
  if (!url) return null; const m = await (await caches.open('tour-assets')).match(url);
  return m ? URL.createObjectURL(await m.blob()) : navigator.onLine ? url : null;
}
export interface Prog { i: number; visited: string[]; }
export const getProg = (k: string): Prog => { try { return JSON.parse(localStorage.getItem('prog:' + k) ?? '') as Prog; } catch { return { i: 0, visited: [] }; } };
export const setProg = (k: string, p: Prog) => localStorage.setItem('prog:' + k, JSON.stringify(p));
