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
  resend: {
    api_key: process.env.RESEND_API_KEY,
  },
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    vapidKey: process.env.FIREBASE_VAPID_KEY,
  },
  isProd: process.env.STAGE === 'prod',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    apiBaseUrl: process.env.API_BASE_URL,
    frontendUrl: process.env.FRONTEND_URL,
    encryptionKey: process.env.ENCRYPTION_KEY,
    encryptionIv: process.env.ENCRYPTION_IV,
  },
});
