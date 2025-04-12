FROM node:20-bullseye

WORKDIR /app
COPY package.json .
RUN yarn install
COPY . .
CMD yarn start:dev