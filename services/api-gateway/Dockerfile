FROM node:20-alpine

RUN apk add --no-cache dumb-init cmake make g++ curl

WORKDIR /app

COPY services/api-gateway/package*.json ./
RUN npm install

COPY services/api-gateway/tsconfig.json ./
COPY services/api-gateway/src ./src

COPY engine/matching-engine-cpp/src ./engine/matching-engine-cpp/src
COPY engine/matching-engine-cpp/include ./engine/matching-engine-cpp/include
COPY engine/matching-engine-cpp/tests ./engine/matching-engine-cpp/tests
COPY engine/matching-engine-cpp/vendor ./engine/matching-engine-cpp/vendor
COPY engine/matching-engine-cpp/CMakeLists.txt ./engine/matching-engine-cpp/CMakeLists.txt

RUN mkdir -p /app/engine/matching-engine-cpp/build && \
    cmake -S /app/engine/matching-engine-cpp \
          -B /app/engine/matching-engine-cpp/build \
          -DCMAKE_BUILD_TYPE=Release && \
    cmake --build /app/engine/matching-engine-cpp/build --target engine

EXPOSE 4000

CMD ["dumb-init", "node", "--import", "tsx", "src/server.ts"]