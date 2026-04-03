FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Copy static assets into dist for express static middleware
RUN mkdir -p dist/public && cp -r public/* dist/public/

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

RUN npx prisma generate

EXPOSE 4321
CMD ["node", "dist/bin/www.js"]
