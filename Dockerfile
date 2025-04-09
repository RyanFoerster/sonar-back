FROM node:23-alpine3.19 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG NODE_ENV=production

WORKDIR /app

COPY --from=build /app/dist ./dist

COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/package*.json ./

EXPOSE 3000

CMD npx typeorm migration:run -d dist/config/typeorm.config.js && STAGE=prod node dist/main