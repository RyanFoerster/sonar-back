import { CacheModuleOptions } from '@nestjs/cache-manager';

export const cacheConfig: CacheModuleOptions = {
  isGlobal: true,
  ttl: 300, // 5 minutes en secondes
  max: 100, // nombre maximum d'éléments en cache
};
