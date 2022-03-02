#!/bin/sh

# This is the empirica install script!
#
# Are you looking at this in your web browser, and would like to install empirica?
#
# Just open up your terminal and type:
#
#   curl https://cli.empirica.dev | sh
#

# We wrap this whole script in a function, so that we won't execute
# until the entire script is downloaded.
# That's good because it prevents our output overlapping with curl's.
# It also means that we can't run a partially downloaded script.
# We don't indent because it would be really confusing with the heredocs.
run_it () {

## NOTE sh NOT bash. This script should be POSIX sh only, since we don't
## know what shell the user has. Debian uses 'dash' for 'sh', for
## example.

PREFIX="/usr/local"

set -e
set -u

# Let's display everything on stderr.
exec 1>&2

UNAME=$(uname)

if [ "$UNAME" = "Darwin" ] ; then
  ### OSX ###
  if [ "1" == "$(sysctl -n hw.cpu64bit_capable 2>/dev/null || echo 0)" ] ; then

    # Can't just test uname -m = x86_64, because Snow Leopard can
    # return other values.
    if [ "i386" != "$(uname -p)" ] ; then
      if [ "arm" != "$(uname -p)" ] ; then
        echo "Only 64-bit Intel or ARM processors are supported at this time."
        exit 1
      else
        PLATFORM="darwin-arm64"
      fi
    else
      PLATFORM="darwin-amd64"
    fi
  else
      echo "Only 64-bit processors are supported at this time."
      exit 1
  fi

elif [ "$UNAME" ">" "MINGW" -a "$UNAME" "<" "MINGX" ] ; then
    PLATFORM="windows-arm64.exe"

elif [ "$UNAME" = "Linux" ] ; then
  ### Linux ###
  LINUX_ARCH=$(uname -m)
  if [ "${LINUX_ARCH}" = "x86_64" ] ; then
    PLATFORM="linux-amd64"
  else
    echo "Unusable architecture: ${LINUX_ARCH}"
    echo "Empirica only supports x86_64 for now."
    exit 1
  fi
else
    echo "Sorry, this OS is not supported yet via this installer."
    exit 1
fi

trap "echo Installation failed." EXIT

TEMP_DIR=`mktemp -d`
if [ -z $TEMP_DIR ] || [ ! -d $TEMP_DIR ]; then
  echo "The installation of empirica requires a temporary directory where its files can be downloaded."
  exit 1
fi

BIN_URL="https://cli.empirica.dev/empirica-${PLATFORM}"

echo $BIN_URL

BIN_FILE="$TEMP_DIR/.empirica-tmp"

cleanUp() {
  rm -rf "$BIN_FILE"
}

# Make sure cleanUp gets called if we exit abnormally.
trap cleanUp EXIT

# Only show progress bar animations if we have a tty
# (Prevents tons of console junk when installing within a pipe)
VERBOSITY="--silent";
if [ -t 1 ]; then
  VERBOSITY="--progress-bar"
fi

echo "Downloading empirica"
# keep trying to curl the file until it works (resuming where possible)
MAX_ATTEMPTS=10
RETRY_DELAY_SECS=5
set +e
ATTEMPTS=0
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]
do
  ATTEMPTS=$((ATTEMPTS + 1))

  curl $VERBOSITY --fail --continue-at - \
    "$BIN_URL" --output "$BIN_FILE"

  if [ $? -eq 0 ]
  then
      break
  fi

  echo "Retrying download in $RETRY_DELAY_SECS seconds..."
  sleep $RETRY_DELAY_SECS
done
set -e

# bomb out if it didn't work, eg no net
test -e "${BIN_FILE}"

if cp "$BIN_FILE" "$PREFIX/bin/empirica" >/dev/null 2>&1; then
  chmod u+x $PREFIX/bin/empirica
  echo "Writing empirica to $PREFIX/bin/empirica for your convenience."

  cat <<"EOF"

To get started fast:

  empirica create my-experiment
  cd my-experiment
  empirica

Otherwise head over to https://docs.empirica.ly.
EOF

elif type sudo >/dev/null 2>&1; then
  echo "Writing empirica to $PREFIX/bin/empirica for your convenience."
  echo "This may prompt for your password."

  # New macs (10.9+) don't ship with /usr/local, however it is still in
  # the default PATH. We still install there, we just need to create the
  # directory first.
  # XXX this means that we can run sudo too many times. we should never
  #     run it more than once if it fails the first time
  if [ ! -d "$PREFIX/bin" ] ; then
      sudo mkdir -m 755 "$PREFIX" || true
      sudo mkdir -m 755 "$PREFIX/bin" || true
  fi

  if sudo cp "$BIN_FILE" "$PREFIX/bin/empirica"; then
  sudo chmod +x $PREFIX/bin/empirica
  echo ""
# Add docs here
  cat <<"EOF"

To get started fast:

  empirica create my-experiment
  cd my-experiment
  empirica

Otherwise head over to https://docs.empirica.ly.
EOF
  else
    cat <<EOF

Couldn't write empirica. Please either:

  (1) Run the following as root:
        cp "$BIN_FILE" /usr/bin/empirica
  (2) Rerun this command to try again.
EOF
  fi
else
  cat <<EOF

Now you need to do the following:

  Run the following as root:
        cp "$BIN_FILE" /usr/bin/empirica
EOF
fi

cleanUp

trap - EXIT
}

run_it
