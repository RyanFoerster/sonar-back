import * as path from "node:path";
import * as process from "node:process";

export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET
  },
  database: {
    database: process.env.DB_DATABASE,
    url: process.env.DB_URL,
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },

})