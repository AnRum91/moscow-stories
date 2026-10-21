import { useEffect, useRef, useState } from 'react';
import type { Place } from '../types'; import { audioSrc } from '../services/offline';
/** Только по нажатию. Приоритет: скачанная/доступная аудиозапись; запасной вариант — TTS системы. */
export default function VoiceGuide({ place, full, onNext }: { place: Place; full: boolean; onNext?: () => void }) {
  const a = useRef<HTMLAudioElement>(null); const [src, setSrc] = useState<string | null>(null); const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false); const [text, setText] = useState(false); const [note, setNote] = useState('');
  const body = full ? place.historyFull : place.descriptionShort; const tts = 'speechSynthesis' in window;
  useEffect(() => { setPlaying(false); window.speechSynthesis?.cancel(); audioSrc(place.audio).then(setSrc); }, [place.id]);
  useEffect(() => { if (a.current) a.current.playbackRate = rate; }, [rate, src]);
  const play = () => {
    setNote('');
    if (src) { a.current?.play().then(() => setPlaying(true)).catch(() => setNote('Не удалось воспроизвести аудио.')); return; }
    if (!tts) { setNote('Аудио не скачано, а озвучка устройства недоступна. Текст можно прочитать.'); setText(true); return; }
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(body); u.lang = 'ru-RU'; u.rate = rate; u.onend = () => setPlaying(false); u.onerror = () => { setPlaying(false); setNote('Системная озвучка недоступна (возможно, нет русского голоса офлайн).'); };
    speechSynthesis.speak(u); setPlaying(true); setNote(place.audio ? 'Аудиозапись не скачана — используется озвучка устройства.' : 'Записи нет — озвучка устройства; офлайн она может не работать.');
  };
  const pause = () => { src ? a.current?.pause() : speechSynthesis.pause(); setPlaying(false); };
  const resume = () => { src ? a.current?.play() : speechSynthesis.resume(); setPlaying(true); };
  return <div className="voice" aria-label="Голосовой гид"><b>🎧 {place.name}</b>
    {src && <audio ref={a} src={src} onEnded={() => setPlaying(false)} />}
    <div className="row"><button onClick={play}>▶ Слушать</button><button onClick={playing ? pause : resume}>{playing ? '⏸ Пауза' : '⏯ Продолжить'}</button>
      <button onClick={() => { window.speechSynthesis?.cancel(); if (a.current) a.current.currentTime = 0; play(); }}>↺ Повтор</button>{onNext && <button onClick={onNext}>⏭ Далее</button>}
      <select aria-label="Скорость" value={rate} onChange={e => setRate(+e.target.value)}>{[0.8, 1, 1.25, 1.5].map(r => <option key={r} value={r}>{r}×</option>)}</select>
      <button onClick={() => setText(!text)}>{text ? 'Скрыть текст' : 'Читать'}</button></div>
    {note && <p className="muted" role="status">{note}</p>}{text && <p>{body}</p>}</div>;
}
