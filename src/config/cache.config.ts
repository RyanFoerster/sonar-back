import { CacheModuleOptions } from '@nestjs/cache-manager';
import { RedisStore } from 'cache-manager-redis-store';
import { redisStore } from 'cache-manager-redis-store';

export const cacheConfig = {
  isGlobal: true,
  store: redisStore,
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },
  ttl: 300, // 5 minutes en secondes
  max: 100,
} as CacheModuleOptions;
