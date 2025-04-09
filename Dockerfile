FROM node:23-alpine3.19 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN if [ "$NODE_ENV" = "staging" ] ; then npm run build:staging ; else npm run build ; fi

RUN npm prune --production

FROM node:23-alpine3.19 AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/dist ./dist

COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/package*.json ./

FROM node:23-alpine3.19 AS staging

ENV NODE_ENV=staging

WORKDIR /app

COPY --from=build /app/dist ./dist

COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/package*.json ./

EXPOSE 3000

CMD npx typeorm migration:run -d dist/config/typeorm.config.js && STAGE=${NODE_ENV} node dist/main