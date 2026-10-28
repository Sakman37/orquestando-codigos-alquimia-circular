FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 DATA_FILE=/app/data/store.json
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
COPY data/store.seed.json ./data/store.seed.json
RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/data && chown -R app:app /app
USER app
EXPOSE 3000
CMD ["node", "src/server.js"]
