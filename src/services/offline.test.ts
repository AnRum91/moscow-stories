import { describe, it, expect } from 'vitest';
import { assetsOf, deleteTour, downloadTour, verify, type AssetCache, type Deps, type SavedTour } from './offline';
import { findTour, mapState } from './offlineState'; import { isQuotaError } from './storage';
import { places } from '../data/places'; import { routes } from '../data/routes';
const img = (u: string) => ({ url: u, author: 't', license: 'CC0' });
const P1 = { ...places[0], image: img('https://x/a.jpg'), audio: 'https://x/a.mp3' }, P2 = { ...places[1], image: img('https://x/b.jpg') };
const mem = (): AssetCache & { m: Map<string, Response> } => { const m = new Map<string, Response>(); return { m, put: async (u, r) => { m.set(u, r); }, match: async u => m.get(u)?.clone(), delete: async u => m.delete(u) }; };
const mk = (f: Deps['fetch'], over: Partial<Deps> = {}) => { const recs = new Map<string, SavedTour>(), assets = mem(), tiles = mem();
  const d: Deps = { store: { put: async t => { recs.set(t.key, t); }, list: async () => [...recs.values()], remove: async k => { recs.delete(k); } }, assets, tiles, fetch: f, ...over }; return { d, recs, assets, tiles }; };
const ok: Deps['fetch'] = async () => new Response('data');
const err = async (p: Promise<unknown>) => { try { await p; return null; } catch (e) { return e; } };
const run = (d: Deps, v: 'short' | 'full' = 'short', pl = [P1, P2], tiles: string[] = [], sig = new AbortController().signal) => downloadTour(routes[0], v, pl, tiles, () => {}, sig, d);
describe('скачивание', () => {
  it('успех: запись, файлы, проверка', async () => { const t = mk(ok); const r = await run(t.d); expect(t.recs.size).toBe(1); expect(t.assets.m.size).toBe(3); expect(r.bytes).toBeGreaterThan(0); expect(await verify(r, t.d)).toBe(true); });
  it('повтор после одной сетевой ошибки', async () => { let n = 0; const t = mk(async () => { if (n++ === 0) throw new Error('net'); return new Response('x'); }); await run(t.d); expect(t.recs.size).toBe(1); });
  it('ошибка на втором файле: записи нет, временные файлы удалены', async () => { const t = mk(async u => u.endsWith('.mp3') ? new Response('', { status: 500 }) : new Response('x')); const e = await err(run(t.d)); expect(e !== null).toBe(true); expect(t.recs.size).toBe(0); expect(t.assets.m.size).toBe(0); });
  it('отмена: записи нет, файлы удалены', async () => { const c = new AbortController(); const t = mk(async u => { if (u.endsWith('.mp3')) c.abort(); return new Response('x'); }); const e = await err(run(t.d, 'short', [P1, P2], [], c.signal)); expect((e as DOMException).name).toBe('AbortError'); expect(t.recs.size).toBe(0); expect(t.assets.m.size).toBe(0); });
  it('нехватка места: понятная ошибка квоты, мусора нет', async () => { const a = mem(); let n = 0; a.put = async (u, r) => { if (n++ === 1) throw new DOMException('full', 'QuotaExceededError'); a.m.set(u, r); };
    const t = mk(ok, { assets: a }); const e = await err(run(t.d)); expect(isQuotaError(e)).toBe(true); expect(t.recs.size).toBe(0); expect(a.m.size).toBe(0); });
  it('неудачное обновление не ломает старую версию', async () => { const t = mk(ok); await run(t.d); t.d.fetch = async () => new Response('', { status: 500 }); const e = await err(run(t.d)); expect(e !== null).toBe(true); expect(t.recs.size).toBe(1); expect(t.assets.m.size).toBe(3); });
  it('тайлы: withMap выставляется только при наличии тайлов', async () => { const t = mk(ok); expect((await run(t.d, 'short', [P1], ['https://t/1.png'])).withMap).toBe(true); const u = mk(ok); expect((await run(u.d)).withMap).toBe(false); });
});
describe('удаление и проверка', () => {
  it('общие файлы остаются, пока нужны другому туру', async () => { const t = mk(ok); await run(t.d, 'short', [P1]); await run(t.d, 'full', [P1, P2]); expect(t.assets.m.size).toBe(3);
    await deleteTour('heart:full', t.d); expect(t.assets.m.size).toBe(2); expect(t.recs.size).toBe(1); await deleteTour('heart:short', t.d); expect(t.assets.m.size).toBe(0); expect(t.recs.size).toBe(0); });
  it('verify = false, если файл пропал из кэша', async () => { const t = mk(ok); const r = await run(t.d); t.assets.m.delete('https://x/a.jpg'); expect(await verify(r, t.d)).toBe(false); });
  it('assetsOf без фото и аудио пуст', () => expect(assetsOf(places.slice(0, 2), routes[0]).length).toBe(0));
});
describe('офлайн-состояние', () => {
  it('подложка зависит от выбранного тура, а не от любого сохранённого', async () => { const t = mk(ok); await run(t.d, 'short', [P1], ['https://t/1.png']); await run(t.d, 'full', [P1]);
    const saved = [...t.recs.values()]; expect(mapState(false, findTour(saved, 'heart', 'short'))).toBe('ready'); expect(mapState(false, findTour(saved, 'heart', 'full'))).toBe('no-map');
    expect(mapState(false, findTour(saved, 'arbat', 'short'))).toBe('not-downloaded'); expect(mapState(true, undefined)).toBe('online'); });
  it('нескачанный вариант не находится', () => expect(findTour([], 'heart', 'short')).toBeUndefined());
});
