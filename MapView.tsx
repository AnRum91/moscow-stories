import { useEffect, useRef } from 'react';
import L from 'leaflet'; import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css'; import 'leaflet.markercluster/dist/MarkerCluster.css'; import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Place } from '../types'; import type { LatLng } from '../services/geo'; import { TILE } from '../services/tiles';
export const CAT_COLOR: Record<string, string> = { historic: '#c4623f', architecture: '#d9a441', literary: '#5b8fb9', estates: '#9a6fb0', temples: '#e0b04a', museums: '#4f8a8b', parks: '#5f9c6b', soviet: '#b5483a', legends: '#7a6f9b', unusual: '#8a8a6a' };
export interface Line { id: string; pts: LatLng[]; active: boolean; }
interface P { places: Place[]; selectedId?: string; lines: Line[]; user?: LatLng; focusUser: number; visited: string[]; onSelect: (id: string) => void; onRoute: (id: string) => void; }
export default function MapView({ places, selectedId, lines, user, focusUser, visited, onSelect, onRoute }: P) {
  const el = useRef<HTMLDivElement>(null); const map = useRef<L.Map>(); const cl = useRef<L.MarkerClusterGroup>(); const lg = useRef<L.LayerGroup>(); const me = useRef<L.CircleMarker>();
  useEffect(() => {
    const m = L.map(el.current!).setView([55.7512, 37.6184], 11); map.current = m;
    L.tileLayer(TILE.url, { maxZoom: 18, attribution: TILE.attribution }).addTo(m);
    cl.current = L.markerClusterGroup().addTo(m); lg.current = L.layerGroup().addTo(m);
    return () => { m.remove(); };
  }, []);
  useEffect(() => {
    cl.current?.clearLayers();
    places.forEach(p => { const col = CAT_COLOR[p.categories[0]] ?? '#c4623f', v = visited.includes(p.id);
      L.marker([p.latitude, p.longitude], { title: p.name, alt: p.name, icon: L.divIcon({ className: '', html: `<span class="pin" style="background:${v ? '#5f9c6b' : col}"></span>`, iconSize: [18, 18] }) })
        .on('click', () => onSelect(p.id)).addTo(cl.current!); });
  }, [places, visited, onSelect]);
  useEffect(() => {
    lg.current?.clearLayers(); let act: L.Polyline | undefined;
    lines.forEach(l => { const pl = L.polyline(l.pts, { color: l.active ? '#c4623f' : '#5b8fb9', weight: l.active ? 6 : 4, opacity: l.active ? 0.95 : 0.6 }).on('click', () => onRoute(l.id)).addTo(lg.current!); if (l.active) act = pl; });
    if (act) map.current!.fitBounds(act.getBounds(), { padding: [50, 50] });
  }, [lines, onRoute]);
  useEffect(() => { const p = places.find(x => x.id === selectedId); if (p) map.current?.flyTo([p.latitude, p.longitude], Math.max(map.current.getZoom(), 16)); }, [selectedId]);
  useEffect(() => { me.current?.remove(); if (user) me.current = L.circleMarker(user, { radius: 9, color: '#fff', weight: 3, fillColor: '#1b6ef3', fillOpacity: 1 }).addTo(map.current!); }, [user]);
  useEffect(() => { if (user && focusUser) map.current?.flyTo(user, 16); }, [focusUser]);
  return <div ref={el} className="map" role="application" aria-label="Карта Москвы" />;
}
