#!/usr/bin/env bash
#
# release.sh - build & publish the WeightTracker Docker image, then bump the version.
#
# The version lives in ./VERSION (a single line, e.g. 0.0.21). Each run:
#   1. builds & pushes  yusseiin/weighttracker:v<VERSION>  and  :latest
#   2. bumps the patch number in ./VERSION for next time
#
# The changelog's "latest" entry renders NEXT_PUBLIC_VERSION, so building with the
# right version automatically labels the changelog correctly.
#
# Usage:
#   ./release.sh            # release the version in ./VERSION, then bump the patch
#   ./release.sh 0.1.0      # release an explicit version (minor/major bump), then set next patch
#   ./release.sh -y         # skip the confirmation prompt (for CI)
#
set -euo pipefail

IMAGE="yusseiin/weighttracker"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION_FILE="$SCRIPT_DIR/VERSION"

# ---- parse args (version and/or -y, in any order) ----
ASSUME_YES=0
VERSION_ARG=""
for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    -*) echo "error: unknown option '$arg'" >&2; exit 1 ;;
    *)  VERSION_ARG="$arg" ;;
  esac
done

# ---- resolve the version to release ----
if [ -n "$VERSION_ARG" ]; then
  VERSION="$VERSION_ARG"
elif [ -f "$VERSION_FILE" ]; then
  VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
else
  echo "error: no version argument and no VERSION file at $VERSION_FILE" >&2
  exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "error: version '$VERSION' is not in x.y.z form" >&2
  exit 1
fi

command -v docker >/dev/null 2>&1 || { echo "error: docker not found in PATH" >&2; exit 1; }

echo "About to build & push:"
echo "  $IMAGE:v$VERSION"
echo "  $IMAGE:latest        (moving tag)"
echo "  platform  : linux/amd64"
echo "  build-arg : NEXT_PUBLIC_VERSION=$VERSION"
echo

if [ "$ASSUME_YES" -ne 1 ]; then
  read -r -p "Proceed? [y/N] " reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) echo "aborted."; exit 1 ;;
  esac
fi

# ---- build ----
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_VERSION="$VERSION" \
  -t "$IMAGE:v$VERSION" \
  -t "$IMAGE:latest" \
  "$SCRIPT_DIR"

# ---- push ----
docker push "$IMAGE:v$VERSION"
docker push "$IMAGE:latest"

# ---- bump patch for next time ----
IFS='.' read -r MAJ MIN PAT <<< "$VERSION"
NEXT="$MAJ.$MIN.$((PAT + 1))"
printf '%s\n' "$NEXT" > "$VERSION_FILE"

echo
echo "Released $IMAGE:v$VERSION  (and :latest)"
echo "Next version set to $NEXT in $(basename "$VERSION_FILE")"
