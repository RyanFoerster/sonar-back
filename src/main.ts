import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

const server = express();

export const createNestServer = async (expressInstance: express.Express) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      snapshot: true,
      abortOnError: false,
    },
  );

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
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
