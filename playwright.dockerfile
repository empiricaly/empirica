FROM mcr.microsoft.com/playwright:focal

RUN npx playwright install
WORKDIR work
RUN npm init -y
RUN npm i -D @playwright/test

ENTRYPOINT rm -rf ./tests/; cp -a /app/tests/. ./tests/; npx playwright test
