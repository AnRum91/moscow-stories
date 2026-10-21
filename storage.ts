export async function freeBytes(): Promise<number | null> {
  try { const e = await navigator.storage?.estimate?.(); return e && e.quota != null && e.usage != null ? e.quota - e.usage : null; } catch { return null; }
}
/** null — квота неизвестна: загрузку не блокируем, но ошибку нехватки места обработаем при записи. */
export const enoughSpace = (free: number | null, need: number) => free === null || free >= need * 1.2;
export const requestPersist = () => navigator.storage?.persist?.().catch(() => false);
export const isQuotaError = (e: unknown) => e instanceof DOMException && e.name === 'QuotaExceededError';
