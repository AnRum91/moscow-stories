import type { Place, Route, Variant } from '../types'; import { isQuotaError } from './storage';
export interface SavedTour { key: string; route: Route; variant: Variant; places: Place[]; assets: string[]; tiles: string[]; withMap: boolean; bytes: number; checksum: string; savedAt: number; }
export interface Progress { done: number; total: number; label: string; }
export interface Prog { i: number; visited: string[]; }
/** Зависимости вынесены, чтобы логику скачивания можно было тестировать без браузера. */
export interface TourStore { put(t: SavedTour): Promise<void>; list(): Promise<SavedTour[]>; remove(key: string): Promise<void>; }
export interface AssetCache { put(url: string, res: Response): Promise<void>; match(url: string): Promise<Response | undefined>; delete(url: string): Promise<boolean>; }
export interface Deps { store: TourStore; assets: AssetCache; tiles: AssetCache; fetch: (url: string, init?: RequestInit) => Promise<Response>; }
export const keyOf = (r: Route, v: Variant) => `${r.id}:${v}`;
const open = () => new Promise<IDBDatabase>((res, rej) => { const q = indexedDB.open('moscow-stories', 1); q.onupgradeneeded = () => q.result.createObjectStore('tours', { keyPath: 'key' }); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
const tx = async <T,>(m: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => { const db = await open(); return new Promise<T>((res, rej) => { const r = f(db.transaction('tours', m).objectStore('tours')); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); };
const idb: TourStore = { put: async t => { await tx('readwrite', s => s.put(t)); }, list: () => tx<SavedTour[]>('readonly', s => s.getAll()), remove: async k => { await tx('readwrite', s => s.delete(k)); } };
const cacheOf = (n: string): AssetCache => ({ put: async (u, r) => (await caches.open(n)).put(u, r), match: async u => (await caches.open(n)).match(u), delete: async u => (await caches.open(n)).delete(u) });
export const browserDeps = (): Deps => ({ store: idb, assets: cacheOf('tour-assets'), tiles: cacheOf('tour-tiles'), fetch: (u, i) => fetch(u, i) });
export const listTours = (d: Deps = browserDeps()) => d.store.list();
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
export const assetsOf = (places: Place[], route: Route) => [...new Set([route.coverImage?.url, ...places.flatMap(p => [p.image?.url, p.audio, ...(p.gallery ?? []).map(g => g.url)])].filter(Boolean) as string[])];
async function grab(url: string, cache: AssetCache, signal: AbortSignal, f: Deps['fetch']): Promise<number> {
  let err: unknown;
  for (let i = 0; i < 2; i++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    try { const r = await f(url, { signal }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const size = (await r.clone().blob()).size; await cache.put(url, r); return size; }
    catch (e) { err = e; if (signal.aborted || isQuotaError(e)) throw e; }
  }
  throw err;
}
/** Файлы, которые больше не нужны ни одной сохранённой экскурсии. */
async function discard(got: { url: string; c: AssetCache }[], d: Deps) {
  let keep: Set<string>; try { keep = new Set((await d.store.list()).flatMap(t => [...t.assets, ...t.tiles])); } catch { return; }
  await Promise.allSettled(got.filter(g => !keep.has(g.url)).map(g => g.c.delete(g.url)));
}
/** Запись о туре создаётся только после загрузки ВСЕХ файлов и проверки целостности. При любой ошибке/отмене временные файлы удаляются. */
export async function downloadTour(route: Route, variant: Variant, places: Place[], tiles: string[], on: (p: Progress) => void, signal: AbortSignal, d: Deps = browserDeps()): Promise<SavedTour> {
  const assets = assetsOf(places, route), data = JSON.stringify({ route, places }), got: { url: string; c: AssetCache }[] = [];
  let bytes = new Blob([data]).size, done = 0; const total = assets.length + tiles.length;
  try {
    for (const u of assets) { on({ done, total, label: 'Фото и аудио' }); bytes += await grab(u, d.assets, signal, d.fetch); got.push({ url: u, c: d.assets }); done++; }
    for (const u of tiles) { on({ done, total, label: 'Карта' }); bytes += await grab(u, d.tiles, signal, d.fetch); got.push({ url: u, c: d.tiles }); done++; }
    on({ done: total, total, label: 'Проверка' });
    const t: SavedTour = { key: keyOf(route, variant), route, variant, places, assets, tiles, withMap: tiles.length > 0, bytes, checksum: await sha(data), savedAt: Date.now() };
    if (!(await verify(t, d))) throw new Error('Проверка целостности не пройдена');
    await d.store.put(t); return t;
  } catch (e) { await discard(got, d); throw e; }
}
/** Контрольная сумма данных + наличие всех файлов в кэше. */
export async function verify(t: SavedTour, d: Deps = browserDeps()): Promise<boolean> {
  if (await sha(JSON.stringify({ route: t.route, places: t.places })) !== t.checksum) return false;
  return (await Promise.all([...t.assets.map(u => d.assets.match(u)), ...t.tiles.map(u => d.tiles.match(u))])).every(Boolean);
}
/** Сначала удаляется запись (интерфейс не показывает «скачано»), затем файлы, не нужные другим турам. */
export async function deleteTour(key: string, d: Deps = browserDeps()) {
  const all = await d.store.list(), me = all.find(t => t.key === key); if (!me) return;
  const keep = new Set(all.filter(t => t.key !== key).flatMap(t => [...t.assets, ...t.tiles]));
  await d.store.remove(key);
  await Promise.allSettled([...me.assets.filter(u => !keep.has(u)).map(u => d.assets.delete(u)), ...me.tiles.filter(u => !keep.has(u)).map(u => d.tiles.delete(u))]);
}
/** Аудио: из кэша (офлайн) либо по сети; null — недоступно. */
export async function audioSrc(url?: string): Promise<string | null> {
  if (!url) return null; const m = await cacheOf('tour-assets').match(url);
  return m ? URL.createObjectURL(await m.blob()) : navigator.onLine ? url : null;
}
export const getProg = (k: string): Prog => { try { return JSON.parse(localStorage.getItem('prog:' + k) ?? '') as Prog; } catch { return { i: 0, visited: [] }; } };
export const setProg = (k: string, p: Prog) => localStorage.setItem('prog:' + k, JSON.stringify(p));
