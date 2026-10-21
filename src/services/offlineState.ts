import type { SavedTour } from './offline'; import type { Variant } from '../types';
export type MapState = 'online' | 'ready' | 'no-map' | 'not-downloaded';
export const findTour = (saved: SavedTour[], routeId: string, v: Variant) => saved.find(s => s.key === `${routeId}:${v}`);
/** Состояние подложки зависит от конкретного выбранного маршрута и варианта, а не от любых сохранённых туров. */
export const mapState = (online: boolean, tour?: SavedTour): MapState => online ? 'online' : !tour ? 'not-downloaded' : tour.withMap ? 'ready' : 'no-map';
