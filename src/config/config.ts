import * as path from "node:path";

export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET
  },
  database: {
    database: process.env.DATABASE_DATABASE,
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  },
  supabase: {
    url: process.env.SUBABASE_URL,
    key: process.env.SUBABASE_KEY,
  }

})