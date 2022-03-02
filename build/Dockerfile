FROM ghcr.io/gythialy/golang-cross:v1.17.7

ARG BUILD_DATE
ARG BUILD_SHA
ARG BUILD_NUM
ARG VERSION

# Install Node.js and Yarn
##########################

# bash will load volta() function via .bashrc 
# using $VOLTA_HOME/load.sh
SHELL ["/bin/bash", "-c"]

# since we're starting non-interactive shell, 
# we wil need to tell bash to load .bashrc manually
ENV BASH_ENV ~/.bashrc
# needed by volta() function
ENV VOLTA_HOME /root/.volta
# make sure packages managed by volta will be in PATH
ENV PATH $VOLTA_HOME/bin:$PATH

# install volta
RUN curl https://get.volta.sh | bash
RUN volta install node

RUN go install github.com/go-bindata/go-bindata/go-bindata@latest

RUN mkdir -p /build
WORKDIR /build

COPY ./lib/admin-ui ./lib/admin-ui

WORKDIR /build/lib/admin-ui
RUN yarn install && yarn build

WORKDIR /build

COPY . .

WORKDIR /build/internal/templates
RUN go-bindata -ignore="node_modules|trigger|yarn-error.log|.DS_Store" -pkg templates -prefix source source/...

WORKDIR /build

RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -tags "static_build" -ldflags "-extldflags=-static -s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Version=$VERSION' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-linux-amd64 ./cmds/empirica
RUN CC=o64-clang CXX=o64-clang++ CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 go build -ldflags "-s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Version=$VERSION' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-darwin-amd64 ./cmds/empirica
RUN CC=aarch64-apple-darwin20.2-clang CXX=aarch64-apple-darwin20.2-clang++ CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 go build -ldflags "-s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Version=$VERSION' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-darwin-arm64 ./cmds/empirica
RUN CC=CC=x86_64-w64-mingw32-gcc CXX=x86_64-w64-mingw32-g++ CGO_ENABLED=1 GOOS=windows GOARCH=amd64 go build -tags "static_build" -ldflags "-extldflags=-static -buildmode=exe -s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Version=$VERSION' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-windows-amd64.exe ./cmds/empirica

ENTRYPOINT []
