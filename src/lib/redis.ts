import { Redis } from '@upstash/redis'

// Configuração do Redis Upstash
export const redis = new Redis({
  url: 'https://popular-peacock-23884.upstash.io',
  token: 'AV1MAAIjcDEyYzE0Y2UyZjNiZWI0NjU5YTU2Y2U5OGUzZTBmNmYzMXAxMA',
})

// Chaves do Redis
export const REDIS_KEYS = {
  TOKENS_MM: 'tokens_mm',
  LAST_SYNC: 'last_sync',
} as const 