FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
COPY tsconfig.json ./
RUN npm ci
RUN npx prisma generate
RUN npm run build --workspace=packages/shared && npm run build --workspace=apps/backend-api

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend-api/dist ./apps/backend-api/dist
COPY --from=build /app/apps/backend-api/package.json ./apps/backend-api/package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
EXPOSE 3001
CMD ["node", "apps/backend-api/dist/main.js"]
