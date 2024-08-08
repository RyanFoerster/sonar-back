import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getConnection } from "typeorm";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
    abortOnError: false,
  });

  app.enableCors({
    origin: ['sonarartists.fr', 'https://www.sonarartists.fr'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });


  console.log(process.env.PORT)
  console.log(process.env.DB_URL)

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
