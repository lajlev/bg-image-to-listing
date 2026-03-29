FROM node:22-slim

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/server.js ./
COPY backend/lib ./lib
COPY public ../public

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
