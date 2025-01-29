import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class CustomCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;

    // Ne pas mettre en cache les requêtes POST, PUT, PATCH ou DELETE
    if (!this.isRequestCacheable(context)) {
      return undefined;
    }

    // Créer une clé de cache unique basée sur l'URL et les paramètres de requête
    return `${httpAdapter.getRequestUrl(request)}-${JSON.stringify(request.query)}`;
  }

  isRequestCacheable(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.method === 'GET';
  }
}
