export type LatLng = [number, number];
export const haversine = (a: LatLng, b: LatLng): number => {
  const R = 6371000, r = (x: number) => x * Math.PI / 180;
  const dLat = r(b[0]-a[0]), dLng = r(b[1]-a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
/** Ориентировочно: по прямым между точками (не по улицам). */
export const routeDistance = (pts: LatLng[]) => pts.slice(1).reduce((s, p, i) => s + haversine(pts[i], p), 0);
/** Ходьба 4,5 км/ч + 5 минут на остановку. Оценка, не точное значение. */
export const estimateMinutes = (m: number, stops: number) => Math.round(m / 75 + stops * 5);
export const watchPosition = (ok: (p: LatLng, accuracyM: number) => void, err: (m: string) => void) => {
  if (!navigator.geolocation) { err('Геолокация недоступна в этом браузере.'); return () => {}; }
  const id = navigator.geolocation.watchPosition(p => ok([p.coords.latitude, p.coords.longitude], p.coords.accuracy),
    e => err(e.code === 1 ? 'Доступ к геолокации запрещён. Карта и поиск работают без неё.' : 'Не удалось определить местоположение.'),
    { enableHighAccuracy: true, maximumAge: 10000 });
  return () => navigator.geolocation.clearWatch(id);
};
