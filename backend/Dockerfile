# --- STAGE 1: Builder ---
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk update --retries 3 || true && \
    (apk add --no-cache --retries 5 openssl libc6-compat || \
     (sed -i 's/dl-cdn.alpinelinux.org/uk.alpinelinux.org/g' /etc/apk/repositories && apk add --no-cache openssl libc6-compat))

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# --- STAGE 2: Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk update --retries 3 || true && \
    (apk add --no-cache --retries 5 openssl libc6-compat || \
     (sed -i 's/dl-cdn.alpinelinux.org/uk.alpinelinux.org/g' /etc/apk/repositories && apk add --no-cache openssl libc6-compat))

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY scripts ./scripts
COPY assets ./assets

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && (node scripts/migrate_periods_and_inquilinos.js || true) && node dist/src/main"]
