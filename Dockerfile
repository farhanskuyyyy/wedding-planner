FROM node:22-slim

# build tools buat better-sqlite3 (node-gyp butuh python3 + make + g++)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# dependency dulu (biar layer cache)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# source (server.js, undangan-bridge.js, dll)
COPY *.js ./

# frontend statis
COPY public ./public

# data sqlite di-mount dari host lewat compose
RUN mkdir -p /app/data && chown -R node:node /app/data

ENV NODE_ENV=production \
    PORT=3457

USER node
EXPOSE 3457

HEALTHCHECK --interval=30s --timeout=6s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
