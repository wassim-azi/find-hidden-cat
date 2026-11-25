#!/usr/bin/env bash
# Extract and normalize spoken tutorial audio from a black-screen narration video
# Supports both English (en) and French (fr) voiceover tracks!
# Usage:
#   ./scripts/sync-narration-from-video.sh path/to/rule1_fr.mp4 1 fr
#   ./scripts/sync-narration-from-video.sh path/to/rule1_en.mp4 1 en
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <input-video-file> <step-number: 1|2|3> [locale: en|fr]"
  exit 1
fi

INPUT_VIDEO="$1"
STEP_NUM="$2"
LOCALE="${3:-en}"
OUT_DIR="public/media/audio/${LOCALE}"
mkdir -p "$OUT_DIR"

OUT_FILE="${OUT_DIR}/narration-step-${STEP_NUM}.mp3"

ffmpeg -y -i "$INPUT_VIDEO" \
  -vn \
  -af "silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:a libmp3lame -b:a 128k -ar 44100 \
  "$OUT_FILE"

echo "Synced [${LOCALE}] narration clip -> $OUT_FILE"
