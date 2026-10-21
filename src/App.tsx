import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView, { CAT_COLOR, type Line } from './components/MapView'; import PlaceCard from './components/PlaceCard';
import DownloadDialog from './components/DownloadDialog'; import VoiceGuide from './components/VoiceGuide';
import { places } from './data/places'; import { routes } from './data/routes'; import { variantInfo } from './data/routeInfo';
import { haversine, routeDistance, watchPosition, type LatLng } from './services/geo';
import { deleteTour, getProg, keyOf, listTours, setProg, verify, type SavedTour } from './services/offline';
import { findTour, mapState } from './services/offlineState';
import { adapters, copyAddress } from './services/mapLinks'; import { markVisited } from './services/progress'; import { routeLine } from './services/routeGeometry';
import type { Category, Place, Route, Variant } from './types';
const CATS: [Category, string][] = [['historic','Исторические здания'],['architecture','Архитектура'],['literary','Литературная Москва'],['estates','Усадьбы и дворцы'],['temples','Монастыри и храмы'],['museums','Музеи'],['parks','Парки и сады'],['soviet','Советская Москва'],['legends','Городские легенды'],['unusual','Необычные места']];
const byId = new Map<string, Place>(places.map(p => [p.id, p] as [string, Place]));
const stopsOf = (r: Route, v: Variant) => (v === 'short' && r.shortVersion ? r.shortVersion : r.fullVersion).stopIds.map(i => byId.get(i)!).filter(Boolean);
const LS = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T; } catch { return d; } };
export default function App() {
  const [q, setQ] = useState(''); const [cat, setCat] = useState<Category | ''>(''); const [tab, setTab] = useState<'routes' | 'places' | 'saved'>('routes');
  const [sel, setSel] = useState<string>(); const [route, setRoute] = useState<Route>(); const [variant, setVariant] = useState<Variant>('short');
  const [activeKey, setActiveKey] = useState<string | null>(() => LS('active', null)); const [prog, setP] = useState(() => ({ i: 0, visited: [] as string[] }));
  const [user, setUser] = useState<LatLng>(); const [acc, setAcc] = useState<number>(); const [msg, setMsg] = useState(''); const [focus, setFocus] = useState(0); const [track, setTrack] = useState(false);
  const [online, setOnline] = useState(navigator.onLine); const [favs, setFavs] = useState<string[]>(() => LS('favs', []));
  const [saved, setSaved] = useState<SavedTour[]>([]); const [loaded, setLoaded] = useState(false); const [dl, setDl] = useState(false); const [voice, setVoice] = useState(false); const [nav, setNav] = useState(false);
  const [health, setHealth] = useState<Record<string, boolean>>({});
  const refresh = useCallback(() => listTours().then(t => { setSaved(t); setLoaded(true); }).catch(() => { setLoaded(true); setMsg('Не удалось прочитать офлайн-хранилище.'); }), []);
  useEffect(() => { refresh(); const f = () => setOnline(navigator.onLine); addEventListener('online', f); addEventListener('offline', f); return () => { removeEventListener('online', f); removeEventListener('offline', f); }; }, [refresh]);
  useEffect(() => { localStorage.setItem('favs', JSON.stringify(favs)); }, [favs]);
  useEffect(() => { localStorage.setItem('active', JSON.stringify(activeKey)); }, [activeKey]);
  useEffect(() => { if (!activeKey) return; const [id, v] = activeKey.split(':'); const r = routes.find(x => x.id === id); if (r) { setRoute(r); setVariant(v as Variant); setP(getProg(activeKey)); setTrack(true); } }, []);
  const key = route ? keyOf(route, variant) : ''; const active = !!route && activeKey === key;
  const tour = route ? findTour(saved, route.id, variant) : undefined;
  const blocked = !!route && !online && loaded && !tour; // офлайн и тур не скачан: остановок не показываем
  const stops = useMemo<Place[]>(() => !route || blocked ? [] : !online ? (tour?.places ?? []) : stopsOf(route, variant), [route, variant, online, tour, blocked]);
  const geo = useMemo(() => route && stops.length ? routeLine(route, variant, stops) : null, [route, variant, stops]);
  const info = geo ? variantInfo(stops, variant, routeDistance(geo.pts)) : null; const next = active && route ? stops[prog.i] : undefined;
  const upd = (p: typeof prog) => { setP(p); setProg(key, p); };
  useEffect(() => { if (!active || !track) return; return watchPosition((p, a) => { setUser(p); setAcc(a); }, setMsg); }, [active, track]);
  useEffect(() => { if (!active || !user || acc === undefined) return; const n = markVisited(prog, stops, user, acc); if (n !== prog) upd(n); }, [user, acc]);
  const savedPlaces = useMemo(() => new Map<string, Place>(saved.flatMap(s => s.places).map(p => [p.id, p] as [string, Place])), [saved]);
  const inCatalog = useMemo(() => !online ? [...savedPlaces.values()] : places, [online, savedPlaces]);
  const shown = useMemo(() => inCatalog.filter(p => (!cat || p.categories.includes(cat)) && (!q || (p.name + p.address).toLowerCase().includes(q.toLowerCase()))), [q, cat, inCatalog]);
  const match = (t: string) => !q || t.toLowerCase().includes(q.toLowerCase());
  const lines = useMemo<Line[]>(() => route ? (geo ? [{ id: route.id, pts: geo.pts, active: true }] : [])
    : online ? routes.filter(r => match(r.title)).map(r => ({ id: r.id, pts: routeLine(r, 'full', stopsOf(r, 'full')).pts, active: false }))
    : saved.filter(s => match(s.route.title)).map(s => ({ id: s.route.id, pts: routeLine(s.route, s.variant, s.places).pts, active: false })), [route, geo, q, online, saved]);
  const pickRoute = useCallback((id: string) => {
    const r = routes.find(x => x.id === id); if (!r) return;
    if (!online) { const t = saved.find(s => s.route.id === id); if (!t) { setMsg('Эта экскурсия не скачана — офлайн она недоступна.'); return; } setVariant(t.variant); }
    setRoute(r); setSel(undefined);
  }, [online, saved]);
  const select = useCallback((id: string) => setSel(id), []);
  const selP = sel ? byId.get(sel) : undefined; const unavailable = !!selP && !online && !savedPlaces.has(selP.id);
  const nearby = selP ? [...savedPlaces.values()].filter(p => p.id !== selP.id).sort((a, b) => haversine([selP.latitude, selP.longitude], [a.latitude, a.longitude]) - haversine([selP.latitude, selP.longitude], [b.latitude, b.longitude])).slice(0, 3) : [];
  const locate = () => { setMsg(''); const stop = watchPosition((p, a) => { setUser(p); setAcc(a); setFocus(n => n + 1); stop(); }, setMsg); };
  const tgt = (p: Place) => ({ lat: p.latitude, lng: p.longitude, address: p.address, name: p.name });
  const ms = route ? mapState(online, tour) : null;
  return <div className="app">
    <aside className="side"><header><h1>🏛 Москва. Истории вокруг</h1>{!online && <span className="off">Нет сети</span>}</header>
      <input type="search" aria-label="Поиск" placeholder="Здание, адрес, маршрут…" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Категория" value={cat} onChange={e => setCat(e.target.value as Category | '')}><option value="">Все категории</option>{CATS.map(([k, l]) => { const n = inCatalog.filter(p => p.categories.includes(k)).length; return <option key={k} value={k} disabled={n === 0}>{l} ({n})</option>; })}</select>
      <nav className="tabs" role="tablist">{(['routes', 'places', 'saved'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{{ routes: 'Маршруты', places: 'Места', saved: 'Мои загрузки' }[t]}</button>)}</nav>
      <button onClick={locate}>📍 Где я</button>{user && acc !== undefined && <p className="muted">Точность GPS ≈ {Math.round(acc)} м</p>}{msg && <p role="status" className="muted">{msg}</p>}
      <div className="list">
        {tab === 'routes' && routes.filter(r => match(r.title)).map(r => <div key={r.id} className="item"><div className="cover" style={{ background: CAT_COLOR[r.category] }} /><b>{r.title}</b><p className="muted">{r.description}</p>
          <div className="row">{(['short', 'full'] as Variant[]).map(v => { const t = findTour(saved, r.id, v), i = variantInfo(stopsOf(r, v), v), off = !online && !t;
            return <button key={v} disabled={off} onClick={() => { setRoute(r); setVariant(v); setSel(undefined); }}>{v === 'short' ? 'Короткий' : 'Полный'} · ≈{i.minutes} мин · ≈{i.km.toFixed(1)} км{t ? ' ✓' : ''}{off ? ' · не скачан' : ''}</button>; })}</div></div>)}
        {tab === 'places' && shown.map(p => <button key={p.id} className="item" onClick={() => setSel(p.id)}><i className="dot" style={{ background: CAT_COLOR[p.categories[0]] }} />{favs.includes(p.id) ? '★ ' : ''}{p.name}<span className="muted"> {p.address}</span></button>)}
        {tab === 'places' && !shown.length && <p>{online ? <>В базе ничего не найдено. Попробуйте поиск адреса в <a target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(q + ' Москва')}`}>OpenStreetMap</a>.</> : 'Офлайн доступны только скачанные объекты.'}</p>}
        {tab === 'saved' && (saved.length ? <><p className="muted">Занято: {(saved.reduce((s, t) => s + t.bytes, 0) / 1024).toFixed(0)} КБ</p>{saved.map(s => <div key={s.key} className="item"><b>{s.route.title}</b> ({s.variant === 'short' ? 'короткий' : 'полный'})<p className="muted">Скачано · {(s.bytes / 1024).toFixed(0)} КБ · {s.withMap ? 'с картой' : 'без карты'}{health[s.key] === false ? ' · ⚠ повреждено' : health[s.key] ? ' · ✓ целостность' : ''}</p>
          <div className="row"><button onClick={() => { setRoute(s.route); setVariant(s.variant); }}>Открыть</button><button onClick={async () => setHealth({ ...health, [s.key]: await verify(s) })}>Проверить</button><button disabled={!online} onClick={() => { setRoute(s.route); setVariant(s.variant); setDl(true); }}>Обновить</button>
            <button onClick={() => deleteTour(s.key).then(refresh).catch(() => setMsg('Не удалось удалить загрузку.'))}>Удалить</button></div></div>)}</> : <p className="muted">Пока ничего не скачано.</p>)}
      </div></aside>
    <main>{!online && !route && <p className="banner" role="status">Офлайн: доступны только скачанные экскурсии.</p>}
      {ms === 'no-map' && <p className="banner" role="alert">Подложка карты для этой экскурсии не скачана: видны только маршрут и точки.</p>}
      <MapView places={route ? stops : shown} selectedId={sel} lines={lines} user={user} focusUser={focus} visited={prog.visited} onSelect={select} onRoute={pickRoute} />
      {selP && <PlaceCard p={selP} fav={favs.includes(selP.id)} unavailable={unavailable} nearby={nearby} onPick={select} onFav={() => setFavs(f => f.includes(selP.id) ? f.filter(x => x !== selP.id) : [...f, selP.id])} onClose={() => setSel(undefined)} />}
      {dl && route && online && <DownloadDialog route={route} variant={variant} stops={stops} onClose={() => setDl(false)} onDone={m => { setMsg(m); setDl(false); refresh(); }} />}
      {blocked && route && !selP && <section className="card" role="alert"><button className="x" onClick={() => { setRoute(undefined); setActiveKey(null); }} aria-label="Закрыть">×</button><h2>{route.title}</h2><p>Эта экскурсия не скачана и недоступна без интернета. Подключитесь к сети и скачайте её заранее.</p></section>}
      {route && !blocked && !selP && !dl && <section className="card"><button className="x" onClick={() => { setRoute(undefined); setActiveKey(null); setVoice(false); }} aria-label="Закрыть маршрут">×</button>
        <div className="cover" style={{ background: CAT_COLOR[route.category] }} /><h2>{route.title}</h2>
        <div className="row">{(['short', 'full'] as Variant[]).map(v => <button key={v} aria-pressed={variant === v} disabled={!online && !findTour(saved, route.id, v)} onClick={() => setVariant(v)}>{v === 'short' ? 'Короткий' : 'Полный'}</button>)}</div>
        {info && <p className="muted">≈{info.km.toFixed(2)} км · ≈{info.minutes} мин (оценка: ходьба 4,5 км/ч + 5 мин на остановку) · {stops.length} остановок · {tour ? (tour.withMap ? '✓ скачано, с картой' : '✓ скачано, без карты') : 'не скачано'}</p>}
        <p className="badge">Демонстрационный материал — требуется проверка</p>
        {info?.note && <p className="badge">{info.note}</p>}
        {geo?.status !== 'verified' && <p className="badge">Предварительный маршрут{geo?.straight ? ': линия проведена по прямым между точками, реальный путь пешком длиннее' : ''}</p>}
        <ol>{stops.map(s => <li key={s.id} className={next?.id === s.id ? 'now' : ''}>{prog.visited.includes(s.id) ? '✓ (пройдена) ' : ''}<button className="link" onClick={() => setSel(s.id)}>{s.name}</button></li>)}</ol>
        <div className="row">{!active ? <button className="primary" onClick={() => { setActiveKey(key); setTrack(true); upd(getProg(key)); }}>▶ Начать</button> : <><button onClick={() => next && upd({ i: prog.i, visited: [...new Set([...prog.visited, next.id])] })}>✓ Пройдена</button><button onClick={() => upd({ ...prog, i: Math.min(prog.i + 1, stops.length - 1) })}>Следующая</button><button onClick={() => { setActiveKey(null); setTrack(false); }}>■ Завершить</button></>}
          <button className="primary" disabled={!online} title={online ? '' : 'Скачивание требует интернета'} onClick={() => setDl(true)}>⬇ Скачать экскурсию</button><button onClick={() => setNav(!nav)}>🧭 Проложить маршрут</button></div>
        {nav && stops.length > 0 && <div className="row">{adapters.map(a => a.route ? <a key={a.id} target="_blank" rel="noopener noreferrer" href={a.route(stops.map(tgt))}>{a.label} (весь маршрут)</a> : <a key={a.id} target="_blank" rel="noopener noreferrer" href={a.point(tgt(next ?? stops[0]))}>{a.label} (к «{(next ?? stops[0]).name}»)</a>)}<button onClick={() => copyAddress(tgt(next ?? stops[0]))}>Скопировать адрес</button><p className="muted">Не все сервисы принимают маршрут целиком; для них открывается ближайшая точка. Работа ссылок не проверена на устройствах.</p></div>}
        <label className="sw"><input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)} /> Голосовой гид</label>
        {voice && (next ?? stops[0]) && <VoiceGuide place={next ?? stops[0]} full={variant === 'full'} onNext={() => upd({ ...prog, i: Math.min(prog.i + 1, stops.length - 1) })} />}</section>}
    </main></div>;
}
