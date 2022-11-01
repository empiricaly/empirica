FROM node:18-slim

RUN apt-get update && apt-get install -y curl rsync
RUN ls
RUN curl https://get.empirica.dev | sh

WORKDIR /usr
RUN empirica create myproj
WORKDIR /usr/myproj

EXPOSE 3000
ENTRYPOINT ["empirica"]
