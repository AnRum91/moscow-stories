import { describe, it, expect } from 'vitest';
import { markVisited } from './progress'; import { routeLine } from './routeGeometry'; import { enoughSpace } from './storage';
import { validate, durationWarnings } from '../data/validate'; import { places } from '../data/places'; import { routes } from '../data/routes';
const stop = { id: 'a', latitude: 55.75, longitude: 37.62 };
describe('progress', () => {
  it('отмечает рядом и не дублирует', () => { const p1 = markVisited({ i: 0, visited: [] }, [stop], [55.75, 37.62], 10); expect(p1.visited).toEqual(['a']); expect(markVisited(p1, [stop], [55.75, 37.62], 10)).toBe(p1); });
  it('игнорирует плохую точность и дальние точки', () => { expect(markVisited({ i: 0, visited: [] }, [stop], [55.75, 37.62], 200).visited).toEqual([]); expect(markVisited({ i: 0, visited: [] }, [stop], [55.76, 37.62], 5).visited).toEqual([]); });
});
describe('geometry', () => {
  it('без геометрии — прямые и «предварительно»', () => { const l = routeLine(routes[0], 'short', []); expect(l.straight).toBe(true); expect(l.status).toBe('preliminary'); });
  it('с геометрией — берёт её', () => { const l = routeLine({ ...routes[0], geometry: { short: [[55.7, 37.6], [55.8, 37.7]] }, geometryStatus: 'verified' }, 'short', []); expect(l.straight).toBe(false); expect(l.status).toBe('verified'); });
});
describe('storage', () => { it('нехватка места', () => { expect(enoughSpace(100, 1000)).toBe(false); expect(enoughSpace(null, 1000)).toBe(true); expect(enoughSpace(5000, 1000)).toBe(true); }); });
describe('data', () => {
  it('данные согласованы', () => expect(validate(places, routes)).toEqual([]));
  it.fails('длительности маршрутов соответствуют целям ТЗ (известная проблема данных)', () => expect(durationWarnings(places, routes)).toEqual([]));
});
