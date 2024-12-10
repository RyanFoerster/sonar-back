FROM node:23-alpine3.19 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

FROM node:23-alpine3.19 AS production

WORKDIR /app

COPY --from=build /app/dist ./dist

COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/package*.json ./

EXPOSE 3000

CMD ["npm", "run", "start:prod"]