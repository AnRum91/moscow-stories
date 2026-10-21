import { describe, it, expect } from 'vitest';
import { adapters } from './mapLinks';
import { haversine, routeDistance, estimateMinutes } from './geo';
import { tilesFor } from './tiles';
import { places } from '../data/places';
import { routes } from '../data/routes';
const t = { lat: 55.75, lng: 37.62, address: 'a', name: 'n' };
describe('adapters', () => { it('содержат координаты', () => adapters.forEach(a => expect(a.point(t)).toMatch(/55\.75/))); });
describe('geo', () => {
  it('haversine ~0 для одной точки', () => expect(haversine([1,1],[1,1])).toBe(0));
  it('distance растёт', () => expect(routeDistance([[55.75,37.6],[55.76,37.6]])).toBeGreaterThan(1000));
  it('minutes > 0', () => expect(estimateMinutes(1000, 2)).toBeGreaterThan(0));
});
describe('data', () => {
  it('все stopIds существуют, а short ⊂ full и отличается', () => routes.forEach(r => {
    const ids = new Set(places.map(p => p.id));
    r.fullVersion.stopIds.forEach(i => expect(ids.has(i)).toBe(true));
    expect(r.shortVersion!.stopIds.length).toBeLessThan(r.fullVersion.stopIds.length);
  }));
});

describe('tiles', () => { it('тайлы вокруг точки, не более лимита', () => { const t = tilesFor([[55.75,37.62],[55.76,37.63]]); expect(t.length).toBeGreaterThan(4); expect(t.length).toBeLessThanOrEqual(800); }); });
describe('adapters route', () => { it('yandex/google принимают несколько точек', () => { const ts=[t,{...t,lat:55.76},{...t,lat:55.77}]; expect(adapters.find(a=>a.id==='yandex')!.route!(ts).split('~').length).toBe(3); expect(adapters.find(a=>a.id==='google')!.route!(ts)).toContain('waypoints'); }); });
