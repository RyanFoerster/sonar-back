import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';

import { INestApplication, Logger } from '@nestjs/common';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { join } from 'path';

import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

const server = express();
const configService = new ConfigService();

export const createNestServer = async (expressInstance: express.Express) => {
  const app: INestApplication = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      snapshot: true,
      abortOnError: false,
    },
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configuration de la session (AVANT Passport)
  app.use(
    session({
      secret:
        configService.get<string>('JWT_SECRET') || 'default-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: configService.get('isProd') },
    }),
  );

  // Initialisation de Passport (APRES session)
  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware de logging global TRES basique pour débogage
  app.use((req, res, next) => {
    console.log(
      `[GLOBAL MIDDLEWARE] Received request: ${req.method} ${req.originalUrl}`,
    );
    next();
  });

  // Configuration pour servir les fichiers statiques
  app.use('/assets', express.static(join(__dirname, 'assets')));

  app.enableCors({
    origin: [
      'https://sonarartists.fr',
      'http://localhost:4200',
      'https://sonarartists.be',
      'https://staging.sonarartists.be',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  Logger.log(`Stage: ${configService.get('stage')}`);
  Logger.log(`isProd: ${configService.get('isProd')}`);
  Logger.log(`isDev: ${configService.get('isDev')}`);
  Logger.log(`isTest: ${configService.get('isTest')}`);

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
