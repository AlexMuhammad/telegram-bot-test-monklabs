import NodeCache from "node-cache";

// Create cache with 10 minute TTL by default
const cache = new NodeCache({ stdTTL: 600, checkperiod: 60 });

/**
 * Get data from cache
 * @param key Cache key
 * @returns Cached data or undefined if not found
 */
export function getCachedData<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

/**
 * Set data in cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in seconds (optional, defaults to 600s/10min)
 */
export function setCachedData<T>(key: string, data: T, ttl?: any): void {
  cache.set(key, data, ttl);
}

/**
 * Delete item from cache
 * @param key Cache key
 * @returns true if deleted, false if not found
 */
export function deleteCachedData(key: string): boolean {
  return cache.del(key) > 0;
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.flushAll();
}

/**
 * Get cache stats
 * @returns Cache statistics
 */
export function getCacheStats(): NodeCache.Stats {
  return cache.getStats();
}

/**
 * Get all cache keys
 * @returns Array of cache keys
 */
export function getCacheKeys(): string[] {
  return cache.keys();
}

/**
 * Check if key exists in cache
 * @param key Cache key
 * @returns true if exists, false otherwise
 */
export function hasCachedData(key: string): boolean {
  return cache.has(key);
}
