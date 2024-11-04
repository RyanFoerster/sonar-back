import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { INestApplication, Logger } from '@nestjs/common';

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

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.enableCors({
    origin: ['https://sonarartists.fr', 'http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
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
