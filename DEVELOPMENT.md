## How to use the CLI

```node cli.js``` generates WAV files without a browser. Run `node cli.js --help` for full usage.

Examples:
```
node cli.js pickup_coin --seed 42 --output coin.wav
node cli.js --synth footsteppr --random --output step.wav
node cli.js --file my_sound.bfxr --output sound.wav
```

## How to add new sound templates

A template sound effect ('jump', say) is specified in Bfxr (any of the synths) as a .bcol file stored in "./templates/[Synth Name]/[Template_Name].bcol".

Sound names in a template look like "varietyname_suffix". The sounds are grouped together into varieties, with the idea being that their range of values is the range of possible values of that variety.

(Duplicate values are combined already at this stage.)

So in the end we have that a template is a group of 'varieties'. When you generate a sound, the synth picks a variety at random, then generates a sound with parameters within the ranges it finds in the exemplar sounds.

(The only reason you'd ever need more than 2 example sounds for a given variety is to allow for more than two BUTTONSELECT values - wave shapes, terrains, or what have you.)

Once you've saved the .bcol files in the folder, run `node insert_templates.js` to generate `js/synths/templates.js`.

If you wish to weight a variety so it appears more often than others, just put a number at the start (multiple digits allowed, e.g. "22coin" will appear ten times more often than "2coin").

(There are some hard-coded templates, i.e. Randomize and Mutate - but any defined in ./templates will overwrite existing ones - e.g. pickup_coin.bcol will override any existing generate_pickup_coin method in Bfxr.js)
