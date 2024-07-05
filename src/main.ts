import { NestFactory, PartialGraphHost } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
    abortOnError: false
  });

  await app.listen(3000);
}
bootstrap().catch((error) => {
  fs.writeFileSync('graph.json', PartialGraphHost.toString() ?? '')
  process.exit(1)
});
