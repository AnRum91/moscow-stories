import { useRef, useState } from 'react';
import type { Place, Route, Variant } from '../types';
import { assetsOf, downloadTour, type Progress } from '../services/offline';
import { EST_TILE_KB, TILE, tilesFor } from '../services/tiles'; import { enoughSpace, freeBytes, isQuotaError, requestPersist } from '../services/storage'; import { estimateMinutes, routeDistance } from '../services/geo';
interface P { route: Route; variant: Variant; stops: Place[]; onClose: () => void; onDone: (msg: string) => void; }
export default function DownloadDialog({ route, variant, stops, onClose, onDone }: P) {
  const [withMap, setMap] = useState(false); const [pr, setPr] = useState<Progress>(); const [err, setErr] = useState(''); const ac = useRef<AbortController>();
  const pts = stops.map(s => [s.latitude, s.longitude] as [number, number]); const d = routeDistance(pts);
  const assets = assetsOf(stops, route), textKB = (new Blob([JSON.stringify(stops)]).size / 1024);
  const tiles = TILE.offlineAllowed ? tilesFor(pts) : [];
  const go = async () => {
    setErr(''); ac.current = new AbortController();
    const need = textKB * 1024 + (withMap ? tiles.length * EST_TILE_KB * 1024 : 0), free = await freeBytes();
    if (!enoughSpace(free, need)) { setErr(`Недостаточно места: нужно ≈${(need / 1048576).toFixed(1)} МБ, свободно ≈${((free ?? 0) / 1048576).toFixed(1)} МБ.`); return; }
    requestPersist();
    try { const t = await downloadTour(route, variant, stops, withMap ? tiles : [], setPr, ac.current.signal); onDone(`Доступно офлайн: ${(t.bytes / 1024).toFixed(0)} КБ${t.withMap ? ' (с картой)' : ', без карты'}.`); }
    catch (e) { setPr(undefined); setErr(ac.current.signal.aborted ? 'Загрузка отменена.' : isQuotaError(e) ? 'Не хватило места на устройстве. Освободите место или удалите другие загрузки.' : 'Загрузка не удалась. Проверьте соединение и повторите.'); }
  };
  return <div className="card dialog" role="dialog" aria-label="Скачать экскурсию"><h2>{route.title}</h2>
    <p className="muted">{variant === 'short' ? 'Короткий' : 'Полный'} · {stops.length} остановок · ≈{(d / 1000).toFixed(1)} км · ≈{estimateMinutes(d, stops.length)} мин</p>
    <ul><li>Тексты, источники, координаты, линия маршрута: ≈{textKB.toFixed(1)} КБ</li><li>Фото и аудио: {assets.length} файл(ов){assets.length ? ' (размер узнаем при загрузке)' : ' — в этой версии данных их ещё нет'}</li></ul>
    {TILE.offlineAllowed ? <label><input type="checkbox" checked={withMap} onChange={e => setMap(e.target.checked)} /> Офлайн-карта: {tiles.length} тайлов, ≈{(tiles.length * EST_TILE_KB / 1024).toFixed(1)} МБ (оценка)</label>
      : <p className="badge">Офлайн-карта недоступна: не настроен поставщик тайлов с разрешением на загрузку (см. README). Без неё офлайн покажутся маршрут и точки, но не подложка.</p>}
    {pr && <progress max={pr.total || 1} value={pr.done} aria-label="Прогресс">{pr.done}</progress>}{pr && <p className="muted">{pr.label}: {pr.done}/{pr.total}</p>}
    {err && <p role="alert" className="err">{err}</p>}
    <div className="row">{!pr ? <button className="primary" onClick={go}>{err ? 'Повторить' : '⬇ Скачать'}</button> : <button onClick={() => ac.current?.abort()}>Отменить</button>}<button onClick={onClose}>Закрыть</button></div></div>;
}
