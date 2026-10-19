FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js tailwind.config.* postcss.config.* ./
COPY src ./src
COPY shared ./shared
COPY public ./public
ENV VITE_API_URL=/api
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=5000 SERVE_FRONTEND=true
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node backend ./
COPY --chown=node:node shared /app/shared
COPY --from=frontend /app/dist /app/dist
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 5000
CMD ["node", "server.js"]
