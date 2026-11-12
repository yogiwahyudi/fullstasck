FROM node:26-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV BACKEND_URL=http://backend:3000
EXPOSE 4173
# vite preview menyajikan hasil build dan meneruskan /api ke Express (lihat vite.config.js).
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
