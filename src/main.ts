import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';

import express from 'express';
import { INestApplication, Logger } from '@nestjs/common';

import { AppModule } from './app.module';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import helmet from 'helmet';

const server = express();

export const createNestServer = async (expressInstance: express.Express) => {
  const app: INestApplication = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      snapshot: true,
      abortOnError: false,
    },
  );

  // Configuration de la sécurité et de l'optimisation
  app.use(helmet());
  app.use(compression());

  // Rate limiting - limite à 100 requêtes par IP sur 15 minutes
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limite chaque IP à 100 requêtes par fenêtre
      message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard',
    }),
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: ['https://sonarartists.fr', 'http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.init();
  return app;
};

let app: any;

export default async (req: express.Request, res: express.Response) => {
  if (!app) {
    app = await createNestServer(server);
    await app.init();
  }
  server(req, res);
};

// Pour le développement local
if (process.env.NODE_ENV !== 'production') {
  createNestServer(server)
    .then((app) => app.listen(process.env.PORT || 3000))
    .then(() => console.log('Server is running on http://localhost:3000'))
    .catch((err) => console.error('Error starting server', err));
}
