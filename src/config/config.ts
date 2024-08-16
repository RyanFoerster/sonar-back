import * as path from 'node:path';

export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
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
    type: process.env.DRIVE_TYPE,
    project_id: process.env.DRIVE_PROJECT_ID,
    private_key_id: process.env.DRIVE_PRIVATE_KEY_ID,
    private_key: process.env.DRIVE_PRIVATE_KEY,
    client_email: process.env.DRIVE_CLIENT_EMAIL,
    client_id: process.env.DRIVE_CLIENT_ID,
    auth_uri: process.env.DRIVE_AUTH_URI,
    token_uri: process.env.DRIVE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.DRIVE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.DRIVE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.DRIVE_UNIVERSE_DOMAIN,
  },
});
