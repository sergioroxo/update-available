#!/bin/bash
# normalise each raw render to about -16 LUFS integrated (peak <= -1.5 dBFS), write the WAV master
# beside the MP3, encode MP3 at 112 kbps (CBR) with LAME. Run from the proposals folder.
set -e
cd "$(dirname "$0")/.."
for raw in _raw/*.wav; do
  b=$(basename "$raw" .wav)
  I=$(ffmpeg -nostats -hide_banner -i "$raw" -af ebur128=peak=true -f null - 2>&1 | awk '/^ *I:/{v=$2} END{print v}')
  G=$(python3 -c "print(round(-16.0 - float('$I'), 2))")
  ffmpeg -v error -y -i "$raw" -af "volume=${G}dB,alimiter=limit=0.84:level=disabled:attack=2:release=60" -ar 44100 -c:a pcm_s16le "$b.wav"
  ch=$(ffprobe -v error -show_entries stream=channels -of csv=p=0 "$b.wav")
  mode=j; [ "$ch" = "1" ] && mode=m
  lame --silent -b 112 -m $mode "$b.wav" "$b.mp3"
  echo "$b  raw ${I} LUFS -> gain ${G} dB"
done

# 05b — the floor beat heard through a wall (the shortlist's recipe: lowpass 320 Hz), 3 dB under its sibling
ffmpeg -v error -y -i 05_commons_floor_beat_122bpm_loop.wav -af "lowpass=f=320,lowpass=f=320" _tmp_wall.wav
I=$(ffmpeg -nostats -hide_banner -i _tmp_wall.wav -af ebur128=peak=true -f null - 2>&1 | awk '/^ *I:/{v=$2} END{print v}')
G=$(python3 -c "print(round(-19.0-float('$I'),2))")
ffmpeg -v error -y -i _tmp_wall.wav -af "volume=${G}dB,alimiter=limit=0.84:level=disabled:attack=2:release=60" -c:a pcm_s16le 05b_commons_floor_beat_through_the_wall_loop.wav && rm _tmp_wall.wav
lame --silent -b 112 -m j 05b_commons_floor_beat_through_the_wall_loop.wav 05b_commons_floor_beat_through_the_wall_loop.mp3

# bed-level drop-ins: the repo's convention for room beds is mono, 96 kbps, about -34.4 LUFS
mkdir -p bedlevel
for n in 08_bed_1997_night_alive:bed_1997_alive 06_malta_hum_lets_go_2016:malta_hum_lets_go_2016; do
  src=${n%%:*}; dst=${n##*:}
  I=$(ffmpeg -nostats -hide_banner -i $src.wav -af ebur128=peak=true -f null - 2>&1 | awk '/^ *I:/{v=$2} END{print v}')
  G=$(python3 -c "print(round(-34.4-float('$I'),2))")
  ffmpeg -v error -y -i $src.wav -af "volume=${G}dB" -ac 1 -ar 44100 -c:a pcm_s16le bedlevel/$dst.wav
  lame --silent -b 96 -m m bedlevel/$dst.wav bedlevel/$dst.mp3
done
