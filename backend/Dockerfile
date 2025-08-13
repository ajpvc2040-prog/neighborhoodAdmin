FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
COPY .env .env
RUN npx tsc
EXPOSE 4000
CMD ["node", "dist/index.js"]
