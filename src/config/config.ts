import * as path from 'node:path';

export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  mailhub: {
    api_key_dev: process.env.MAILHUB_API_KEY_DEV,
    api_key_prod: process.env.MAILHUB_API_KEY_PROD,
  },
  database: {
    database: process.env.DATABASE_DATABASE,
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  },
  aws: {
    region: process.env.AWS_REGION,
    access_key_id: process.env.AWS_ACCESS_KEY_ID,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
    bucket_name: process.env.AWS_BUCKET_NAME,
  },
  bce: {
    API_KEY: process.env.BCE_API_KEY,
  },
});
