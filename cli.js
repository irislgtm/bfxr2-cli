#!/usr/bin/env node

"use strict";

var fs = require("fs");
var path = require("path");

// ANSI helpers

var c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function color(code, text) {
  return code + text + c.reset;
}

// Globals

global.SAMPLE_RATE = 44100;
global.CONVERSION_FACTOR = (2 * Math.PI) / SAMPLE_RATE;

global.AUDIO_CONTEXT = {
  createBuffer: function (numChannels, length, sampleRate) {
    var data = new Float32Array(length);
    return {
      numberOfChannels: numChannels,
      length: length,
      sampleRate: sampleRate,
      _channelData: [data],
      getChannelData: function (ch) {
        return this._channelData[ch];
      },
      copyToChannel: function (source, ch) {
        this._channelData[ch] = new Float32Array(source);
      },
    };
  },
};

// Load synth files

var loadFiles = [
  "js/globals.js",
  "js/audio/riffwave.js",
  "js/audio/AKWF.js",
  "js/audio/Bfxr_DSP.js",
  "js/audio/puredata.js",
  "js/audio/puredata_modules.js",
  "js/audio/puredata_parser.js",
  "js/audio/RealizedSound.js",
  "js/synths/templates.js",
  "js/synths/SynthBase.js",
  "js/synths/Bfxr.js",
  "js/synths/Footsteppr.js",
  "js/synths/Transfxr.js",
];

for (var li = 0; li < loadFiles.length; li++) {
  var lcode = fs.readFileSync(path.join(__dirname, loadFiles[li]), "utf8");
  lcode = lcode.replace(
    /^(const|let)\s+(\w+)\s*=\s*/gm,
    "var $2 = globalThis.$2 = ",
  );
  lcode = lcode.replace(
    /^class\s+(\w+)\s*/gm,
    "var $1 = globalThis.$1 = class ",
  );
  lcode = lcode.replace(
    /^function\s+(\w+)\s*\(/gm,
    "var $1 = globalThis.$1 = function(",
  );
  lcode = lcode.replace(/^var\s+(\w+)\s*=\s*/gm, "var $1 = globalThis.$1 = ");
  eval(lcode);
}

// Package info

var PKG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json"), "utf8"),
);

// WAV helpers

function float32ToWavBytes(samples) {
  var output = new Array(samples.length);
  for (var i = 0; i < samples.length; i++) {
    output[i] = Math.floor(32768 * Math.max(-1, Math.min(samples[i], 1))) | 0;
  }
  var wav = MakeRiff(SAMPLE_RATE, 16, output);
  return Buffer.from(wav.wav);
}

function formatDuration(samples) {
  var sec = samples / SAMPLE_RATE;
  if (sec < 1) return (sec * 1000).toFixed(0) + "ms";
  return sec.toFixed(1) + "s";
}

// Fuzzy matching

function allTemplateNames() {
  var names = [];
  var synthClasses = { Bfxr: Bfxr, Footsteppr: Footsteppr, Transfxr: Transfxr };
  for (var sn in synthClasses) {
    var synth = new synthClasses[sn]();
    for (var i = 0; i < synth.templates.length; i++) {
      var t = synth.templates[i];
      if (t[2] && t[2].startsWith("generate_")) {
        names.push(t[2].replace("generate_", ""));
      }
    }
  }
  return names;
}

function matchScore(query, candidate) {
  query = query.toLowerCase();
  candidate = candidate.toLowerCase();
  var qi = 0;
  var score = 0;
  for (var ci = 0; ci < candidate.length && qi < query.length; ci++) {
    if (candidate[ci] === query[qi]) {
      score++;
      qi++;
    }
  }
  var ratio = score / query.length;
  var lenPenalty = Math.abs(query.length - candidate.length) * 0.1;
  return ratio - lenPenalty;
}

function suggestTemplate(wrongName) {
  var names = allTemplateNames();
  var best = "";
  var bestScore = 0;
  for (var i = 0; i < names.length; i++) {
    var s = matchScore(wrongName, names[i]);
    if (s > bestScore) {
      bestScore = s;
      best = names[i];
    }
  }
  if (bestScore > 0.4) return best;
  return null;
}

// Banner

function showBanner() {
  var logo = [
    c.red + "██████╗  ██╗      ███████╗ ███████╗ ██████╗  ██████╗" + c.reset,
    c.yellow +
      " ██╔══██╗ ██║      ██╔════╝ ██╔════╝ ██╔══██╗ ██╔══██╗" +
      c.reset,
    c.green +
      " ██████╔╝ ██║      █████╗   █████╗   ██████╔╝ ██████╔╝" +
      c.reset,
    c.cyan + " ██╔══██╗ ██║      ██╔══╝   ██╔══╝   ██╔═══╝  ██╔══██╗" + c.reset,
    c.blue + " ██████╔╝ ███████╗ ███████╗ ███████╗ ██║      ██║  ██║" + c.reset,
    c.magenta +
      " ╚═════╝  ╚═══════╝ ╚═══════╝ ╚═══════╝ ╚═╝      ╚═╝  ╚═╝" +
      c.reset,
  ];

  var meta = [
    "  v" + PKG.version + " : irislgtm",
    "  sound effects for the terminal",
    "",
    "  bleepr -h for help",
    "",
  ];

  var i = 0;
  function tick() {
    if (i < logo.length) {
      console.log(logo[i]);
      i++;
      setTimeout(tick, 55);
    } else if (i < logo.length + meta.length) {
      console.log(meta[i - logo.length]);
      i++;
      setTimeout(tick, 25);
    }
  }
  tick();
}

// Help

function showHelp() {
  console.log(
    [
      "bleepr v" + PKG.version,
      "sound effect generator for UI, games, and transitions",
      "",
      "Usage:",
      "  bleepr [template] [options]",
      "",
      "Templates:",
      "  <template>             preset sound (e.g. pickup_coin, laser_shoot, explosion)",
      "  -l, --list-templates   list all available templates",
      "  -a, --about <name>     describe a template and its params",
      "",
      "Options:",
      "  -o, --output <file>    output WAV file (defaults to <template>.wav)",
      "  -s, --synth <name>     which engine: bfxr, footsteppr, or transfxr",
      "      --random           generate a random sound",
      "      --seed <n>         same seed = same sound",
      "  -p, --params <str>     load params from a URL-format string",
      "  -f, --file <path>      load params from a .json or .bcol file",
      "      --dump-params      save the generated params for editing",
      "  -h, --help             show this message",
      "",
      "Examples:",
      "  bleepr pickup_coin",
      "  bleepr pickup_coin -a   # before you generate, peek inside",
      "  bleepr pickup_coin --dump-params",
      "  # edit pickup_coin.json, then:",
      "  bleepr -f pickup_coin.json -o tweaked.wav",
      "  bleepr --random -o bang.wav",
      "  bleepr -s transfxr --random -o whoosh.wav",
    ].join("\n"),
  );
}

// Template listing

function describeTemplate(templateName) {
  var synthClasses = { Bfxr: Bfxr, Footsteppr: Footsteppr, Transfxr: Transfxr };
  for (var sn in synthClasses) {
    var synth = new synthClasses[sn]();
    for (var i = 0; i < synth.templates.length; i++) {
      var t = synth.templates[i];
      var tname =
        t[2] && t[2].startsWith("generate_")
          ? t[2].replace("generate_", "")
          : "";
      if (tname === templateName) {
        console.log(templateName + "  (synth: " + sn.toLowerCase() + ")");
        console.log("  " + t[1]);
        console.log("");
        console.log("Params:");
        for (var j = 0; j < synth.param_info.length; j++) {
          var p = synth.param_info[j];
          if (p.constructor === Array) {
            console.log("  " + String(p[2]).padEnd(24) + p[0]);
          }
        }
        return;
      }
    }
  }
  console.error("Unknown template: " + templateName);
  process.exit(1);
}

function listTemplates() {
  var synthClasses = { Bfxr: Bfxr, Footsteppr: Footsteppr, Transfxr: Transfxr };
  for (var sn in synthClasses) {
    console.log("");
    console.log(sn);
    var synth = new synthClasses[sn]();
    for (var i = 0; i < synth.templates.length; i++) {
      var t = synth.templates[i];
      if (t[2] && t[2].startsWith("generate_")) {
        var tname = t[2].replace("generate_", "");
        console.log("  " + tname.padEnd(22) + t[1]);
      }
    }
  }
  console.log("");
}

// Arg parsing

function parseArgs() {
  var args = process.argv.slice(2);
  var opts = { synth: "bfxr" };
  var positional = [];
  for (var i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "-l":
      case "--list-templates":
        opts.listTemplates = true;
        break;
      case "-a":
      case "--about":
        opts.about = args[++i];
        break;
      case "-s":
      case "--synth":
        opts.synth = args[++i] || "bfxr";
        break;
      case "-p":
      case "--params":
        opts.params = args[++i];
        break;
      case "-f":
      case "--file":
        opts.file = args[++i];
        break;
      case "--random":
        opts.random = true;
        break;
      case "-o":
      case "--output":
        opts.output = args[++i];
        break;
      case "--dump-params":
        opts.dumpParams = true;
        break;
      case "--seed":
        opts.seed = parseInt(args[++i]);
        break;
      default:
        if (args[i].startsWith("-")) {
          console.error("Unknown option: " + args[i]);
          process.exit(1);
        }
        positional.push(args[i]);
    }
  }
  if (positional.length > 0) {
    opts.template = positional[0];
  }

  opts.output =
    opts.output || (opts.template ? opts.template + ".wav" : "output.wav");

  return opts;
}

// PRNG

function seededRandom(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Param dump

function trimmedParams(synth) {
  var defaults = synth.default_params();
  var used = {};
  for (var key in synth.params) {
    if (synth.params[key] !== defaults[key]) {
      used[key] = synth.params[key];
    }
  }
  return used;
}

// Generation

function generateBfxr(synth, opts) {
  if (opts.params) {
    var parts = opts.params.split("~");
    var default_params = synth.default_params();
    var keys = Object.keys(default_params).sort();
    var params = {};
    for (var i = 0; i < keys.length && i + 2 < parts.length; i++) {
      params[keys[i]] = parseFloat(parts[i + 2]);
    }
    synth.apply_params(params);
  } else if (opts.file) {
    var data = JSON.parse(fs.readFileSync(opts.file, "utf8"));
    synth.apply_params(data.params || data);
  } else if (opts.template) {
    var methodName = "generate_" + opts.template;
    if (typeof synth[methodName] === "function") {
      synth[methodName]();
    } else {
      var suggestion = suggestTemplate(opts.template);
      if (suggestion) {
        console.error(
          "Unknown template: " +
            opts.template +
            "  did you mean '" +
            suggestion +
            "'?",
        );
      } else {
        console.error("Unknown template: " + opts.template);
      }
      process.exit(1);
    }
  } else {
    synth.randomize_params();
  }

  var dsp = new Bfxr_DSP(synth.params, synth);
  dsp.generate_sound();
  return dsp.buffer;
}

function generateFootsteppr(synth, opts) {
  if (opts.file) {
    var data = JSON.parse(fs.readFileSync(opts.file, "utf8"));
    synth.apply_params(data.params || data);
  } else if (opts.template === "mutate") {
    synth.mutate_params();
  } else {
    synth.randomize_params();
  }
  synth.generate_sound();
  return synth.sound.getBuffer();
}

// Main

function main() {
  var opts = parseArgs();

  if (opts.help) {
    showHelp();
    return;
  }
  if (opts.listTemplates) {
    listTemplates();
    return;
  }
  if (opts.about) {
    describeTemplate(opts.about);
    return;
  }

  var hasAction = opts.template || opts.random || opts.params || opts.file;
  if (!hasAction) {
    showBanner();
    return;
  }

  if (opts.seed != null) {
    Math.random = seededRandom(opts.seed);
  }

  var synthName = opts.synth.toLowerCase();
  var synth;
  var buffer;

  if (synthName === "bfxr") {
    synth = new Bfxr();
    buffer = generateBfxr(synth, opts);
  } else if (synthName === "footsteppr") {
    synth = new Footsteppr();
    buffer = generateFootsteppr(synth, opts);
  } else if (synthName === "transfxr") {
    synth = new Transfxr();
    buffer = generateFootsteppr(synth, opts);
  } else {
    console.error("Unknown synth: " + opts.synth);
    console.error("Available: bfxr, footsteppr, transfxr");
    process.exit(1);
  }

  var wavBytes = float32ToWavBytes(buffer);
  fs.writeFileSync(opts.output, wavBytes);
  console.log(
    "wrote " +
      opts.output +
      "  \u2192  " +
      wavBytes.length +
      " bytes" +
      "  :  " +
      formatDuration(buffer.length),
  );

  if (opts.dumpParams) {
    var paramsFile = opts.template ? opts.template + ".json" : "params.json";
    var trimmed = trimmedParams(synth);
    fs.writeFileSync(paramsFile, JSON.stringify(trimmed, null, 2));
    console.log(
      "dumped \u2192 " +
        paramsFile +
        "  :  " +
        Object.keys(trimmed).length +
        " active",
    );
  }
}

main();
