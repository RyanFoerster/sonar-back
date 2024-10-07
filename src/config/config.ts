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
  drive: {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_CLIENT_AUTH_URI,
    token_uri: process.env.GOOGLE_CLIENT_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509,
    universe_domain: process.env.GOOGLE_CLIENT_UNIVERSE_DOMAIN,
  },
  bce: {
    API_KEY: process.env.BCE_API_KEY,
  }
});
