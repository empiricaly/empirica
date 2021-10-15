FROM golang:1.17.2

ARG BUILD_DATE
ARG BUILD_SHA
ARG BUILD_NUM
ARG VERSION

# Install Node.js and Yarn
##########################

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - && \
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update && \
  DEBIAN_FRONTEND="noninteractive" apt-get install --no-install-recommends -y  \
  nodejs \
  yarn && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* && \
  apt-get autoremove -y



RUN go get -u github.com/go-bindata/go-bindata/...

RUN mkdir -p /build
WORKDIR /build

COPY . .

WORKDIR /build/lib/admin-ui


WORKDIR /build/internal/templates
RUN go-bindata -ignore=node_modules|trigger|yarn-error.log|.DS_Store -pkg templates -prefix source source/...

RUN GOOS=linux GOARCH=amd64 go build -tags netgo -ldflags="-s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Version=$VERSION' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE' -extldflags=-static" -o /out/empirica-linux-amd64
RUN GOOS=darwin GOARCH=amd64 go build -tags netgo -ldflags "-s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Version=$VERSION' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-darwin-amd64
# RUN GOOS=darwin GOARCH=arm64 go build -ldflags "-s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Version=$VERSION' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-darwin-arm64
# RUN GOOS=windows GOARCH=amd64 go build -tags netgo -ldflags "-s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Version=$VERSION' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-windows-amd64
