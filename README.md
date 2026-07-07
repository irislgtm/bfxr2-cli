# bleepr

Sound effect generator for UI, games, and transitions. Works right in your terminal.

## Install

```sh
npm install -g bleepr
```

## Quick start

```sh
# Pick a template
bleepr pickup_coin

# Random sound
bleepr --random

# Pick an output name
bleepr explosion -o boom.wav
```

## Templates

See what's available:

```sh
bleepr -l
```

Try `pickup_coin`; `laser_shoot`; `explosion`; `powerup`; `hit_hurt`; `jump`; `blip_select`.

Each template has randomness built in; run it twice and you'll get variations.

## Tweak a sound

Want to adjust a template? Dump its settings, edit, and reload:

```sh
# Step 1 — save the params
bleepr pickup_coin --dump-params

# Step 2 — open pickup_coin.json in any text editor
# Change things like frequency_start, sustainTime, pitch, filters...

# Step 3 — generate your tweaked version
bleepr -f pickup_coin.json -o my-coin.wav
```

Every number in the JSON file controls something: slide, pitch, filters, distortion. Change one at a time to hear what it does.

## Reproduce a sound

Same seed = same result:

```sh
bleepr pickup_coin --seed 42 -o coin1.wav
bleepr pickup_coin --seed 42 -o coin2.wav  # identical to coin1
```

## Synths

Three sound engines:

- **bfxr** (default) — classic 8-bit and chiptune style
- **footsteppr** — footsteps and movement sounds
- **transfxr** — filter-sweep whooshes for UI transitions

```sh
# footstep sounds
bleepr -s footsteppr --random

# UI transition whooshes
bleepr -s transfxr --random -o whoosh.wav
```
