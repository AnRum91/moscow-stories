// Адаптеры внешних карт. Форматы взяты из публичной документации/справки сервисов,
// но НЕ проверены на реальных устройствах. Всегда есть веб-fallback и «точки по очереди».
export interface Target { lat: number; lng: number; address: string; name: string; }
export interface MapAdapter { id: string; label: string; point(t: Target): string; route?(ts: Target[]): string; }
const c = (t: Target) => `${t.lat},${t.lng}`;
export const adapters: MapAdapter[] = [
  { id: 'yandex', label: 'Яндекс Карты', point: t => `https://yandex.ru/maps/?rtext=~${c(t)}&rtt=pd`, route: ts => `https://yandex.ru/maps/?rtext=${ts.map(c).join('~')}&rtt=pd` },
  { id: '2gis', label: '2ГИС', point: t => `https://2gis.ru/moscow/directions/points/%7C${t.lng}%2C${t.lat}` },
  { id: 'google', label: 'Google Maps', point: t => `https://www.google.com/maps/dir/?api=1&destination=${c(t)}&travelmode=walking`,
    route: ts => `https://www.google.com/maps/dir/?api=1&destination=${c(ts[ts.length - 1])}&travelmode=walking&waypoints=${ts.slice(0, -1).slice(0, 9).map(c).join('%7C')}` },
  { id: 'mapsme', label: 'MAPS.ME', point: t => `mapsme://map?ll=${c(t)}&n=${encodeURIComponent(t.name)}` },
  { id: 'organic', label: 'Organic Maps', point: t => `https://omaps.app/${t.lat},${t.lng}/${encodeURIComponent(t.name)}` },
];
export const copyAddress = (t: Target) => navigator.clipboard?.writeText(`${t.name}, ${t.address} (${c(t)})`);
