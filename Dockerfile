FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    DB_PATH=/data/catalog.db \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build && npm prune --omit=dev

# Mount a persistent volume here so inventory survives redeploys.
VOLUME /data
EXPOSE 3000
CMD ["npm", "start"]
