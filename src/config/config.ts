import * as path from "node:path";

export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET
  },
  database: {
    type: process.env.DB_TYPE,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    synchronize: process.env.DB_SYNCHRONIZE
  }
})