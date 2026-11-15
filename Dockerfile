FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma.config.js ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000

# Applies migrations, seeds demo users and starts the server (see package.json).
CMD ["npm", "start"]
