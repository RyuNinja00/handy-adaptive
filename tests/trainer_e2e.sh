#!/usr/bin/env bash
# End-to-end trainer test: makes a 60 s test video, pairs it with the fixture
# script, runs analyze against a mock vision model, applies the fixture labels,
# and builds a motion library. Needs python3 + ffmpeg.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
W="$(mktemp -d)"; trap 'kill $MOCK 2>/dev/null || true; rm -rf "$W"' EXIT
mkdir -p "$W/vids"
ffmpeg -loglevel error -f lavfi -i "color=c=red:s=320x240:d=30" -f lavfi -i "color=c=blue:s=320x240:d=30" \
  -filter_complex "[0][1]concat=n=2:v=1" -pix_fmt yuv420p "$W/vids/clip.mp4"
cp "$HERE/fixtures/clip.funscript" "$W/vids/"
python3 "$HERE/mock_vlm.py" & MOCK=$!; sleep 1
python3 "$HERE/../trainer/trainer.py" analyze "$W/vids" --vlm-url http://127.0.0.1:8799/v1 --model test --cache "$W/cache"
cp "$HERE/fixtures/clip.labels.csv" "$W/vids/"
python3 "$HERE/../trainer/trainer.py" analyze "$W/vids" --vlm-url http://127.0.0.1:8799/v1 --model test --cache "$W/cache"
python3 "$HERE/../trainer/trainer.py" build "$W/cache" --out "$W/motion_library.json"
python3 -c "import json,sys; l=json.load(open('$W/motion_library.json')); assert {'blowjob','doggy'} <= set(l['acts']), l['acts'].keys(); print('OK: acts', list(l['acts']))"
