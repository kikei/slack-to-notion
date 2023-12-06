#!/bin/bash

IMAGE="aws-cli-node"
ROOTDIR="$(cd $(dirname $0)/.. && pwd)"

remove_image() {
    if docker images | grep -q "$IMAGE"; then
        docker rmi "$IMAGE"
    fi
}

ensure_image() {
    if ! docker images | grep -q "$IMAGE"; then
        docker build -t "$IMAGE" .
    fi
}

check_aws_config() {
    if [ ! -f "./data/aws/config" -o ! -f "./data/aws/credentials" ]; then
        echo "Please create ./data/aws/config and ./data/aws/credentials"
        exit 1
    fi
}

run_bash() {
    ensure_image
    check_aws_config
    homedir="/home/worker"
    docker run -it --rm \
           --entrypoint "/docker-entrypoint.sh" \
           --workdir "/work" \
           --user "$(id -u):$(id -g)" \
           --env "HOME=$homedir" \
           -v "$ROOTDIR:/work" \
           -v "$PWD/data/aws/config:$homedir/.aws/config:ro" \
           -v "$PWD/data/aws/credentials:$homedir/.aws/credentials:ro" \
           -v "$PWD/docker-entrypoint.sh:/docker-entrypoint.sh:ro" \
           $IMAGE
}

show_aws_identity() {
    ensure_image
    check_aws_config
    docker run -it --rm \
           -v "$PWD/data/aws/config:/root/.aws/config:ro" \
           -v "$PWD/data/aws/credentials:/root/.aws/credentials:ro" \
           $IMAGE \
           sts get-caller-identity
}

help() {
    cat <<EOF
Usage: $0 [-j] [-b] [-i] [-h]

Options:
    -r  Remove existing image
    -b  Run bash
    -i  Show AWS identity
    -h  Show this message
EOF
}

command=
while getopts "rbih" opt; do
    case $opt in
        r) command="remove_image" ;;
        b) command="run_bash" ;;
        i) command="show_aws_identity" ;;
        h) help ; exit 0 ;;
        *) help ; exit 1 ;;
    esac
done

if [ -z "$command" ]; then
    help
    exit 1
fi

case $command in
    remove_image) remove_image ;;
    run_bash) run_bash ;;
    show_aws_identity) show_aws_identity ;;
    *) echo "Unknown command: $command" ; exit 1 ;;
esac
