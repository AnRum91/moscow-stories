import { useState } from 'react';
import type { Place } from '../types'; import { adapters, copyAddress } from '../services/mapLinks';
import { CAT_COLOR } from './MapView'; import VoiceGuide from './VoiceGuide';
const kind = { fact: 'Факт', interpretation: 'Интерпретация', legend: 'Городская легенда', disputed: 'Спорные сведения' };
interface P { p: Place; fav: boolean; unavailable?: boolean; nearby: Place[]; onPick: (id: string) => void; onFav: () => void; onClose: () => void; }
export default function PlaceCard({ p, fav, unavailable, nearby, onPick, onFav, onClose }: P) {
  const [full, setFull] = useState(false); const [voice, setVoice] = useState(false);
  const t = { lat: p.latitude, lng: p.longitude, address: p.address, name: p.name };
  return <article className="card" aria-label={p.name}><button className="x" onClick={onClose} aria-label="Закрыть">×</button>
    {p.image ? <figure><img src={p.image.url} alt={p.name} loading="lazy" /><figcaption className="muted">{p.image.author}, {p.image.license}{p.image.illustrative ? ' · иллюстрация' : ''}</figcaption></figure>
      : <div className="ph" style={{ background: CAT_COLOR[p.categories[0]] }}>Фото пока не добавлено</div>}
    <h2>{p.name}</h2><p className="muted">{p.address} · {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</p>
    {unavailable ? <><p className="badge">Полная история этого объекта не скачана и недоступна офлайн.</p>{nearby.length > 0 && <><p>Сохранённые объекты рядом:</p><div className="row">{nearby.map(n => <button key={n.id} onClick={() => onPick(n.id)}>{n.name}</button>)}</div></>}</> : <>
      {p.contentStatus === 'demo' && <p className="badge">Демонстрационный материал — требуется проверка</p>}
      <p>{full ? p.historyFull : p.descriptionShort}</p>
      <dl>{p.constructionYear && <><dt>Год</dt><dd>{p.constructionYear}</dd></>}{p.architect && <><dt>Архитектор</dt><dd>{p.architect}</dd></>}{p.architectureStyle && <><dt>Стиль</dt><dd>{p.architectureStyle}</dd></>}</dl>
      {p.facts.map((f, i) => <p key={i}><b>{kind[f.kind]}:</b> {f.text}</p>)}
      <p className="muted">{p.sources.length ? p.sources.map(s => s.title).join('; ') : 'Источники ещё не подключены.'}</p>
      <div className="row"><button onClick={() => setFull(!full)}>{full ? 'Кратко' : 'Вся история'}</button><button onClick={() => setVoice(!voice)}>🎧 Голосовой гид</button><button onClick={onFav}>{fav ? '★' : '☆'} Избранное</button></div>
      {voice && <VoiceGuide place={p} full={full} />}</>}
    <details><summary>Построить маршрут</summary><div className="row">{adapters.map(a => <a key={a.id} href={a.point(t)} target="_blank" rel="noopener noreferrer">{a.label}</a>)}<button onClick={() => copyAddress(t)}>Скопировать адрес</button></div></details></article>;
}
