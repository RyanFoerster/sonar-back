import * as path from 'path';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
// Charger explicitement le .env depuis la racine du projet
const result = config({ path: path.join(__dirname, '../../.env') });

// if (result.error) {
//   console.error('Erreur lors du chargement du .env:', result.error);
//   process.exit(1);
// }

// Afficher les variables pour debug
console.log("Variables d'environnement chargées:", {
  DATABASE_DATABASE: process.env.DATABASE_DATABASE,
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_PORT: process.env.DATABASE_PORT,
  DATABASE_USERNAME: process.env.DATABASE_USERNAME,
});

const dataSource = new DataSource({
  type: 'postgres',
  database: process.env.DATABASE_DATABASE,
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [path.join(__dirname, '/../migrations/*{.ts,.js}')],
  synchronize: false,
});

export default dataSource;
