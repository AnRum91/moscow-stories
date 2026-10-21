import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView, { CAT_COLOR, type Line } from './components/MapView'; import PlaceCard from './components/PlaceCard';
import DownloadDialog from './components/DownloadDialog'; import VoiceGuide from './components/VoiceGuide';
import { places } from './data/places'; import { routes } from './data/routes';
import { estimateMinutes, haversine, routeDistance, watchPosition, type LatLng } from './services/geo';
import { deleteTour, getProg, keyOf, listTours, setProg, verify, type SavedTour } from './services/offline';
import { adapters, copyAddress } from './services/mapLinks'; import { markVisited } from './services/progress'; import { routeLine } from './services/routeGeometry';
import type { Category, Place, Route, Variant } from './types';
const CATS: [Category, string][] = [['historic','Исторические здания'],['architecture','Архитектура'],['literary','Литературная Москва'],['estates','Усадьбы и дворцы'],['temples','Монастыри и храмы'],['museums','Музеи'],['parks','Парки и сады'],['soviet','Советская Москва'],['legends','Городские легенды'],['unusual','Необычные места']];
const byId = new Map<string, Place>(places.map(p => [p.id, p] as [string, Place]));
const stopsOf = (r: Route, v: Variant) => (v === 'short' && r.shortVersion ? r.shortVersion : r.fullVersion).stopIds.map(i => byId.get(i)!).filter(Boolean);
const pts = (s: Place[]) => s.map(p => [p.latitude, p.longitude] as LatLng);
const LS = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T; } catch { return d; } };
export default function App() {
  const [q, setQ] = useState(''); const [cat, setCat] = useState<Category | ''>(''); const [tab, setTab] = useState<'routes' | 'places' | 'saved'>('routes');
  const [sel, setSel] = useState<string>(); const [route, setRoute] = useState<Route>(); const [variant, setVariant] = useState<Variant>('short');
  const [activeKey, setActiveKey] = useState<string | null>(() => LS('active', null)); const [prog, setP] = useState(() => ({ i: 0, visited: [] as string[] }));
  const [user, setUser] = useState<LatLng>(); const [acc, setAcc] = useState<number>(); const [msg, setMsg] = useState(''); const [focus, setFocus] = useState(0); const [track, setTrack] = useState(false);
  const [online, setOnline] = useState(navigator.onLine); const [favs, setFavs] = useState<string[]>(() => LS('favs', []));
  const [saved, setSaved] = useState<SavedTour[]>([]); const [dl, setDl] = useState(false); const [voice, setVoice] = useState(false); const [nav, setNav] = useState(false);
  const [health, setHealth] = useState<Record<string, boolean>>({});
  const refresh = useCallback(() => listTours().then(setSaved).catch(() => setMsg('Не удалось прочитать офлайн-хранилище.')), []);
  useEffect(() => { refresh(); const f = () => setOnline(navigator.onLine); addEventListener('online', f); addEventListener('offline', f); return () => { removeEventListener('online', f); removeEventListener('offline', f); }; }, [refresh]);
  useEffect(() => { localStorage.setItem('favs', JSON.stringify(favs)); }, [favs]);
  useEffect(() => { localStorage.setItem('active', JSON.stringify(activeKey)); }, [activeKey]);
  // восстановление экскурсии после перезагрузки
  useEffect(() => { if (!activeKey) return; const [id, v] = activeKey.split(':'); const r = routes.find(x => x.id === id); if (r) { setRoute(r); setVariant(v as Variant); setP(getProg(activeKey)); setTrack(true); } }, []);
  const key = route ? keyOf(route, variant) : ''; const active = !!route && activeKey === key;
  const stops = useMemo(() => route ? stopsOf(route, variant) : [], [route, variant]);
  const geo = useMemo(() => route ? routeLine(route, variant, stops) : null, [route, variant, stops]); const dist = geo ? routeDistance(geo.pts) : 0; const next = active ? stops[prog.i] : undefined;
  const upd = (p: typeof prog) => { setP(p); setProg(key, p); };
  useEffect(() => { if (!active || !track) return; return watchPosition((p, a) => { setUser(p); setAcc(a); }, setMsg); }, [active, track]);
  useEffect(() => { if (!active || !user || acc === undefined) return; const n = markVisited(prog, stops, user, acc); if (n !== prog) upd(n); }, [user, acc]);
  const savedPlaces = useMemo(() => new Map<string, Place>(saved.flatMap(s => s.places).map(p => [p.id, p] as [string, Place])), [saved]);
  const inCatalog = useMemo(() => !online ? [...savedPlaces.values()] : places, [online, savedPlaces]);
  const shown = useMemo(() => inCatalog.filter(p => (!cat || p.categories.includes(cat)) && (!q || (p.name + p.address).toLowerCase().includes(q.toLowerCase()))), [q, cat, inCatalog]);
  const lines = useMemo<Line[]>(() => route ? [{ id: route.id, pts: geo!.pts, active: true }] : routes.filter(r => !q || r.title.toLowerCase().includes(q.toLowerCase())).map(r => ({ id: r.id, pts: routeLine(r, 'full', stopsOf(r, 'full')).pts, active: false })), [route, geo, q]);
  const pickRoute = useCallback((id: string) => { setRoute(routes.find(r => r.id === id)); setSel(undefined); }, []);
  const select = useCallback((id: string) => setSel(id), []);
  const selP = sel ? byId.get(sel) : undefined; const unavailable = !!selP && !online && !savedPlaces.has(selP.id);
  const nearby = selP ? [...savedPlaces.values()].filter(p => p.id !== selP.id).sort((a, b) => haversine([selP.latitude, selP.longitude], [a.latitude, a.longitude]) - haversine([selP.latitude, selP.longitude], [b.latitude, b.longitude])).slice(0, 3) : [];
  const locate = () => { setMsg(''); const stop = watchPosition(p => { setUser(p); setFocus(n => n + 1); stop(); }, setMsg); };
  const tgt = (p: Place) => ({ lat: p.latitude, lng: p.longitude, address: p.address, name: p.name });
  const isSaved = (r: Route, v: Variant) => saved.some(s => s.key === keyOf(r, v));
  const mapSaved = saved.some(s => s.withMap);
  return <div className="app">
    <aside className="side"><header><h1>🏛 Москва. Истории вокруг</h1>{!online && <span className="off">Нет сети</span>}</header>
      <input type="search" aria-label="Поиск" placeholder="Здание, адрес, маршрут…" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Категория" value={cat} onChange={e => setCat(e.target.value as Category | '')}><option value="">Все категории</option>{CATS.map(([k, l]) => { const n = places.filter(p => p.categories.includes(k)).length; return <option key={k} value={k} disabled={n === 0}>{l} ({n})</option>; })}</select>
      <nav className="tabs" role="tablist">{(['routes', 'places', 'saved'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{{ routes: 'Маршруты', places: 'Места', saved: 'Мои загрузки' }[t]}</button>)}</nav>
      <button onClick={locate}>📍 Где я</button>{user && acc !== undefined && <p className="muted">Точность GPS ≈ {Math.round(acc)} м</p>}{msg && <p role="status" className="muted">{msg}</p>}
      <div className="list">
        {tab === 'routes' && routes.filter(r => !q || r.title.toLowerCase().includes(q.toLowerCase())).map(r => <div key={r.id} className="item"><div className="cover" style={{ background: CAT_COLOR[r.category] }} /><b>{r.title}</b><p className="muted">{r.description}</p>
          <div className="row">{(['short', 'full'] as Variant[]).map(v => { const s = stopsOf(r, v); const d = routeDistance(pts(s)); return <button key={v} onClick={() => { setRoute(r); setVariant(v); setSel(undefined); }}>{v === 'short' ? 'Короткий' : 'Полный'} · ≈{estimateMinutes(d, s.length)} мин · ≈{(d / 1000).toFixed(1)} км{isSaved(r, v) ? ' ✓' : ''}</button>; })}</div></div>)}
        {tab === 'places' && shown.map(p => <button key={p.id} className="item" onClick={() => setSel(p.id)}><i className="dot" style={{ background: CAT_COLOR[p.categories[0]] }} />{favs.includes(p.id) ? '★ ' : ''}{p.name}<span className="muted"> {p.address}</span></button>)}
        {tab === 'places' && !shown.length && <p>{online ? <>В базе ничего не найдено. Попробуйте поиск адреса в <a target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(q + ' Москва')}`}>OpenStreetMap</a>.</> : 'Офлайн доступны только скачанные объекты.'}</p>}
        {tab === 'saved' && (saved.length ? <><p className="muted">Занято: {(saved.reduce((s, t) => s + t.bytes, 0) / 1024).toFixed(0)} КБ</p>{saved.map(s => <div key={s.key} className="item"><b>{s.route.title}</b> ({s.variant === 'short' ? 'короткий' : 'полный'})<p className="muted">Доступно офлайн · {(s.bytes / 1024).toFixed(0)} КБ · {s.withMap ? 'с картой' : 'без карты'}{health[s.key] === false ? ' · ⚠ повреждено' : health[s.key] ? ' · ✓ целостность' : ''}</p>
          <div className="row"><button onClick={() => { setRoute(s.route); setVariant(s.variant); }}>Открыть</button><button onClick={async () => setHealth({ ...health, [s.key]: await verify(s) })}>Проверить</button><button onClick={() => { setRoute(s.route); setVariant(s.variant); setDl(true); }}>Обновить</button><button onClick={() => deleteTour(s.key).then(refresh)}>Удалить</button></div></div>)}</> : <p className="muted">Пока ничего не скачано.</p>)}
      </div></aside>
    <main>{!online && !mapSaved && <p className="banner" role="alert">Подложка карты офлайн недоступна: офлайн-карта не скачана. Видны только маршрут и точки.</p>}
      <MapView places={route ? stops : shown} selectedId={sel} lines={lines} user={user} focusUser={focus} visited={prog.visited} onSelect={select} onRoute={pickRoute} />
      {selP && <PlaceCard p={selP} fav={favs.includes(selP.id)} unavailable={unavailable} nearby={nearby} onPick={select} onFav={() => setFavs(f => f.includes(selP.id) ? f.filter(x => x !== selP.id) : [...f, selP.id])} onClose={() => setSel(undefined)} />}
      {dl && route && <DownloadDialog route={route} variant={variant} stops={stops} onClose={() => setDl(false)} onDone={m => { setMsg(m); setDl(false); refresh(); }} />}
      {route && !selP && !dl && <section className="card"><button className="x" onClick={() => { setRoute(undefined); setActiveKey(null); setVoice(false); }} aria-label="Закрыть маршрут">×</button>
        <div className="cover" style={{ background: CAT_COLOR[route.category] }} /><h2>{route.title}</h2>
        <div className="row">{(['short', 'full'] as Variant[]).map(v => <button key={v} aria-pressed={variant === v} onClick={() => setVariant(v)}>{v === 'short' ? 'Короткий' : 'Полный'}</button>)}</div>
        <p className="muted">≈{(dist / 1000).toFixed(1)} км · ≈{estimateMinutes(dist, stops.length)} мин (оценка) · {stops.length} остановок · {isSaved(route, variant) ? '✓ Доступно офлайн' : 'не скачано'}</p>
        <p className="badge">Демонстрационный материал — требуется проверка</p>
        {geo?.status !== 'verified' && <p className="badge">Предварительный маршрут{geo?.straight ? ': линия проведена по прямым между точками, реальный путь пешком длиннее' : ''}</p>}
        <ol>{stops.map(s => <li key={s.id} className={next?.id === s.id ? 'now' : ''}>{prog.visited.includes(s.id) ? '✓ (пройдена) ' : ''}<button className="link" onClick={() => setSel(s.id)}>{s.name}</button></li>)}</ol>
        <div className="row">{!active ? <button className="primary" onClick={() => { setActiveKey(key); setTrack(true); upd(getProg(key)); }}>▶ Начать</button> : <><button onClick={() => next && upd({ i: prog.i, visited: [...new Set([...prog.visited, next.id])] })}>✓ Пройдена</button><button onClick={() => upd({ ...prog, i: Math.min(prog.i + 1, stops.length - 1) })}>Следующая</button><button onClick={() => { setActiveKey(null); setTrack(false); }}>■ Завершить</button></>}
          <button className="primary" onClick={() => setDl(true)}>⬇ Скачать экскурсию</button><button onClick={() => setNav(!nav)}>🧭 Проложить маршрут</button></div>
        {nav && <div className="row">{adapters.map(a => a.route ? <a key={a.id} target="_blank" rel="noopener noreferrer" href={a.route(stops.map(tgt))}>{a.label} (весь маршрут)</a> : <a key={a.id} target="_blank" rel="noopener noreferrer" href={a.point(tgt(next ?? stops[0]))}>{a.label} (к «{(next ?? stops[0]).name}»)</a>)}<button onClick={() => copyAddress(tgt(next ?? stops[0]))}>Скопировать адрес</button><p className="muted">Не все сервисы принимают маршрут целиком; для них открывается ближайшая точка.</p></div>}
        <label className="sw"><input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)} /> Голосовой гид</label>
        {voice && (next ?? stops[0]) && <VoiceGuide place={next ?? stops[0]} full={variant === 'full'} onNext={() => upd({ ...prog, i: Math.min(prog.i + 1, stops.length - 1) })} />}</section>}
    </main></div>;
}
