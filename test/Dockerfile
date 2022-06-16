
# Set up empirica on a container
#FROM ubuntu:jammy as empirica_base
# for some reason, volta had trouble installing its own node version?
FROM node:16.15.1-bullseye as empirica_base  

RUN apt-get update && apt-get install -y ca-certificates curl rsync
# note: this file should be run from the main empirica directory,
# with the -f flag, as is pattern for vscode: https://stackoverflow.com/a/67944726
ADD ../build/public/empirica-linux-amd64 /usr/local/bin/empirica
RUN chmod u+x /usr/local/bin/empirica
RUN empirica setup
#
#RUN curl https://get.empirica.dev | sh
# RUN apt-get remove --yes ca-certificates curl && \
#     apt-get clean autoclean && \
#     apt-get autoremove --yes && \
#     rm -rf /var/lib/{apt,dpkg,cache,log}/

# set up and build the template experiment
FROM empirica_base as builder
WORKDIR /app
RUN empirica create test_experiment
WORKDIR /app/test_experiment
COPY ../test/empirica.toml .empirica/empirica.toml
RUN empirica bundle

# serve the template experiment
FROM empirica_base as server
COPY --from=builder /app/test_experiment/test_experiment.tar.zst /app/test_experiment.tar.zst
# For some reason, the config is not picked up if it's not first setup during
# the build, so we run server for a few seconds to let the settings settle.
RUN timeout --preserve-status 5s empirica serve /app/test_experiment.tar.zst
EXPOSE 3000
ENTRYPOINT ["empirica", "serve", "/app/test_experiment.tar.zst"]
