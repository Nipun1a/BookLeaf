FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY server ./server
COPY tests ./tests
COPY ["bookleaf_sample_data (1).json", "./"]
RUN npm run build
ENV PORT=3001 DATABASE_PATH=/app/data/bookleaf.sqlite
EXPOSE 3001
CMD ["npm", "start"]
