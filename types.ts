export type ContentStatus = 'verified' | 'demo';
export type ClaimKind = 'fact' | 'interpretation' | 'legend' | 'disputed';
export type Category = 'historic'|'architecture'|'literary'|'estates'|'temples'|'museums'|'parks'|'soviet'|'legends'|'unusual';
export interface Source { title: string; publisher: string; url?: string; publicationDate?: string; checkedAt?: string; supportedClaims: string[]; }
export interface Img { url: string; author: string; license: string; sourceUrl?: string; illustrative?: boolean; }
export interface Fact { text: string; kind: ClaimKind; }
export interface Place {
  id: string; name: string; address: string; latitude: number; longitude: number;
  categories: Category[]; descriptionShort: string; historyFull: string;
  architectureStyle?: string; constructionYear?: string; architect?: string;
  facts: Fact[]; sources: Source[]; image?: Img; gallery?: Img[]; audio?: string; contentStatus: ContentStatus;
}
export interface RouteVariant { stopIds: string[]; }
export interface Route {
  id: string; slug: string; title: string; description: string; category: Category;
  coverImage?: Img; shortVersion?: RouteVariant; fullVersion: RouteVariant;
  orderedStopIds: string[]; sources: Source[]; contentStatus: ContentStatus;
  /** Пешеходная геометрия хранится отдельно от остановок; пока её нет, линия строится по прямым. */
  geometry?: Partial<Record<Variant, [number, number][]>>; geometryStatus?: 'verified' | 'preliminary';
}
export type Variant = 'short' | 'full';
