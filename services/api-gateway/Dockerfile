FROM node:20-alpine

# dumb-init handles signals properly inside Docker
# Without it, Ctrl+C and SIGTERM don't reach Node correctly
RUN apk add --no-cache dumb-init

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

CMD ["dumb-init", "node", "--import", "tsx", "src/server.ts"]