FROM ghcr.io/gythialy/golang-cross:v1.18.3

ARG BUILD_DATE
ARG BUILD_SHA
ARG BUILD_NUM
ARG VERSION

# Install Node.js and NPM
##########################

# Bash will load volta() function via .bashrc using $VOLTA_HOME/load.sh
SHELL ["/bin/bash", "-c"]

# Since we're starting non-interactive shell, 
# we wil need to tell bash to load .bashrc manually
ENV BASH_ENV ~/.bashrc
# Needed by volta() function
ENV VOLTA_HOME /root/.volta
# Make sure packages managed by volta will be in PATH
ENV PATH $VOLTA_HOME/bin:$PATH

# Install volta
RUN curl https://get.volta.sh | bash
RUN volta install node

# Install bindata for embedding admin into binary
RUN go install github.com/go-bindata/go-bindata/go-bindata@latest

# Build in /build
RUN mkdir -p /build
WORKDIR /build

# Build admin ui
COPY ./lib/admin-ui /build/lib/admin-ui 
RUN cd /build/lib/admin-ui && npm install && npm run build

# Copy rest of project and embedded admin UI
COPY . .
RUN cd /build/internal/templates && go-bindata -ignore="node_modules|trigger|yarn-error.log|.DS_Store" -pkg templates -prefix source source/...

# Build
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -tags "static_build" -ldflags "-extldflags=-static -s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Tag=$BUILD_TAG' -X 'github.com/empiricaly/empirica/internal/build.Branch=$BUILD_BRANCH' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-linux-amd64 ./cmds/empirica
RUN CC=o64-clang CXX=o64-clang++ CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 go build -ldflags "-s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Tag=$BUILD_TAG' -X 'github.com/empiricaly/empirica/internal/build.Branch=$BUILD_BRANCH' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-darwin-amd64 ./cmds/empirica
RUN CC=aarch64-apple-darwin20.2-clang CXX=aarch64-apple-darwin20.2-clang++ CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 go build -ldflags "-s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Tag=$BUILD_TAG' -X 'github.com/empiricaly/empirica/internal/build.Branch=$BUILD_BRANCH' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-darwin-arm64 ./cmds/empirica
# RUN CC=CC=x86_64-w64-mingw32-gcc CXX=x86_64-w64-mingw32-g++ CGO_ENABLED=1 GOOS=windows GOARCH=amd64 go build -tags "static_build" -ldflags "-extldflags=-static -buildmode=exe -s -w -X 'github.com/empiricaly/empirica/internal/build.Commit=$BUILD_SHA' -X 'github.com/empiricaly/empirica/internal/build.Tag=$BUILD_TAG' -X 'github.com/empiricaly/empirica/internal/build.Branch=$BUILD_BRANCH' -X 'github.com/empiricaly/empirica/internal/build.BuildNum=$BUILD_NUM' -X 'github.com/empiricaly/empirica/internal/build.Time=$BUILD_DATE'" -o /out/empirica-windows-amd64.exe ./cmds/empirica

# Clear inherited entrypoint
ENTRYPOINT []
