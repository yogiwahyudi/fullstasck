FROM node:26-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY storage ./storage
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
