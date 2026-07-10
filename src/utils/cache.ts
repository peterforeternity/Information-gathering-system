/**
 * 轻量级前端数据缓存：基于 sessionStorage，带 TTL 过期机制。
 * 用于缓存接口返回，减少重复请求、优化二次进入页面的加载速度。
 */
const PREFIX = 'gms_cache:'

interface CacheEntry<T> {
  value: T
  expireAt: number
}

/** 读取缓存；不存在或已过期返回 null（并清除过期项）。 */
export function getCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() > entry.expireAt) {
      sessionStorage.removeItem(PREFIX + key)
      return null
    }
    return entry.value
  } catch {
    return null
  }
}

/** 写入缓存，ttlMs 为存活毫秒数（默认 60 秒）。 */
export function setCache<T>(key: string, value: T, ttlMs = 60_000): void {
  try {
    const entry: CacheEntry<T> = { value, expireAt: Date.now() + ttlMs }
    sessionStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    // 存储超限等异常忽略，缓存仅为优化手段
  }
}

/** 清除指定缓存项。 */
export function clearCache(key: string): void {
  sessionStorage.removeItem(PREFIX + key)
}
