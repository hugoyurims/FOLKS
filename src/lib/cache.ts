export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getFromCache(key: string) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

export function setInCache(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}
