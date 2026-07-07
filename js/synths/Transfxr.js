class Transfxr extends SynthBase {
  name = "Transfxr";
  version = "1.0.0";
  tooltip = "Filter-sweep transition sounds for UI whooshes and movement.";

  canvas_bg_logo = "img/logo_transfxr.png";

  header_properties = ["waveType"];

  permalocked = ["masterVolume"];
  hide_params = ["masterVolume"];

  param_info = [
    [
      "Sound Volume",
      "Overall volume of the current sound.",
      "masterVolume",
      0.5,
      0,
      1,
    ],
    {
      type: "KNOB_TRANSITION",

      name: "roll",
      display_name: "Filter Sweep",

      default_value_l: 0,
      default_value_r: 1,
      min: 0,
      max: 1,

      default_tween: "Linear",

      header: true,
    },
    ["Heel", "How hard the initial impact hits.", "heel", 0.5, 0, 1],
    ["Ball", "How much tail/resonance lingers after.", "ball", 0.5, 0, 1],
    ["Swiftness", "How quick the transition happens.", "swiftness", 0.5, 0, 1],
  ];

  templates = [
    [
      "Randomize",
      "Talking your life into your hands... (only modifies unlocked parameters)",
      "randomize_params",
      "Random",
    ],
    [
      "Mutate",
      "Modify each unlocked parameter by a small wee amount... (only modifies unlocked parameters)",
      "mutate_params",
      "Mutant",
    ],
  ];

  static tweenfunctions = [
    ["Linear", (t) => t],
    ["Ease In", (t) => t * t],
    ["Triangle", (t) => 1 - Math.abs(t - 0.5) * 2],
    [
      "Bounce",
      (t) => (t < 0.5 ? 1 - t * 2 * (t * 2) : (t * 2 - 1) * (t * 2 - 1) + 1),
    ],
    ["Cosine", (t) => 1 - (Math.cos(t * Math.PI * 2) + 1) / 2],
    ["Accelerating Sine", (t) => Math.sin(t * Math.PI * 2) * t],
    ["Decelerating Sine", (t) => Math.sin(t * Math.PI * 2) * (1 - t)],
  ];

  // Canvas code removed (browser-only)

  /*********************/
  /* CONSTRUCTOR       */
  /*********************/

  constructor() {
    super();
    this.post_initialize();
  }

  /*********************/
  /* TEMPLATE FUNCTIONS  */
  /*********************/

  generate_pickup_coin() {
    return this.params;
  }

  /*********************/
  /* SOUND SYNTHESIS   */
  /*********************/

  generate_sound() {
    var heel = this.params.heel;
    var roll = this.params.roll;
    var ball = this.params.ball;
    var swiftness = this.params.swiftness;
    var vol = this.params.masterVolume;

    // duration: swiftness 0 = slow whoosh (0.7s), swiftness 1 = snappy (0.08s)
    var dur = 0.08 + 0.62 * (1 - swiftness);
    pd_set_stream_length_seconds(dur);

    // noise source
    var noise = pd_noise();

    // filter sweep: cuts through the noise from low to high
    // heel pushes the starting freq up for punchier attacks
    // roll controls how open the filter gets (brightness)
    var sweep_start = 60 + heel * 400;
    var sweep_end = 600 + roll * 12000;
    var sweep = pd_fn(function (t) {
      var p = t / dur;
      return sweep_start + (sweep_end - sweep_start) * Math.pow(p, 0.35);
    });

    // bandpass filter with ball-controlled resonance
    var q = 0.2 + ball * 7;
    var filtered = pd_bp(noise, sweep, pd_c(q));

    // gain boost to compensate filter attenuation
    filtered = pd_mul(filtered, pd_c(3.5));

    // amplitude envelope: hard attack, tail shaped by ball
    var env = pd_fn(function (t) {
      var p = t / dur;
      if (p < 0.015) return p / 0.015;
      var decay = 1 + ball * 3;
      return Math.pow(1 - (p - 0.015) / 0.985, decay);
    });

    var signal = pd_mul(filtered, env);
    signal = pd_mul(signal, pd_c(vol * 1.5));
    signal = pd_clip(signal, pd_c(-1), pd_c(1));

    this.sound = RealizedSound.from_buffer(signal);
  }
}
