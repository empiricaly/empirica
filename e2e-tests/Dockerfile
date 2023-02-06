FROM node:16
FROM mcr.microsoft.com/playwright:focal

RUN apt-get update && apt-get -y install libnss3 libatk-bridge2.0-0 libdrm-dev libxkbcommon-dev libgbm-dev libasound-dev libatspi2.0-0 libxshmfence-dev

WORKDIR /empirica

COPY . ./

RUN curl https://install.empirica.dev | sh
RUN npm ci

EXPOSE 8080

WORKDIR /empirica/e2e-tests

CMD [ "npm", "run", "test:e2e"]