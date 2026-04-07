#!/usr/bin/env bash
# Re-measure ENTITY_SPRITE_RECTS_PX columns (80px slots). Requires macOS Swift.
# Usage: ./scripts/measure-sprite-atlas.sh [path/to/sprites.png]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PNG="${1:-"$DIR/../public/textures/sprites.png"}"
exec swift "$DIR/measure-sprite-atlas.swift" "$PNG"
