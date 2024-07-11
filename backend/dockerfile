FROM node:18 AS build

WORKDIR /app


COPY package*.json ./


RUN npm install


COPY . .


RUN npm run build


FROM node:18-slim


WORKDIR /app


COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./


RUN npm install --only=production


EXPOSE 3000


CMD ["node", "./dist/index.js"]
