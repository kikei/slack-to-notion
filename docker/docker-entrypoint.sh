#!/bin/sh

set -e

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

. ~/.nvm/nvm.sh
nvm install 17
nvm use 17

bash -i
