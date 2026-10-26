/* youreyesinspace — original WebGL2 universe flight.
   License text: LICENSE.txt (MIT, copyright ypaaaaaaaaaaaaa).
   idea after @berkcomba (berkcomba/youreyesinspace); clean-room implementation, no code copied. */
(function () {
  "use strict";

  var AU = 1.495978707e11;
  var LY = 9.4607304725808e15;
  var PC = 3.08567758149137e16;
  var KPC = PC * 1000;
  var MPC = KPC * 1000;
  var GPC = MPC * 1000;
  var OBS = 14.25 * GPC;
  var RSUN = 6.9634e8;
  var FOV = 0.98;
  var NEAR = 0.008;
  var FAR = 6e9;
  var SIM_DAYS = 0.9;
  var OPEN_TILT = 0.36;
  var OPEN_RADII = 5.65;

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(edge0, edge1, x) {
    var t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function rateDays(days) { return Math.PI * 2 * SIM_DAYS / days; }

  var bodies = [];
  var byId = {};
  var px, py, pz, stamp, frameN = 1;

  function add(b) {
    b.i = bodies.length;
    b.ox = b.ox || 0;
    b.oy = b.oy || 0;
    b.oz = b.oz || 0;
    b.orbit = b.orbit || 0;
    b.phase = b.phase || 0;
    b.rate = b.rate || 0;
    b.tilt = b.tilt || 0;
    b.axis = b.axis || 0;
    b.frame = b.frame || 4.6;
    b.atmos = b.atmos || 0;
    b.atmo = b.atmo || [0.5, 0.6, 0.8];
    b.pat = b.pat || 0;
    b.squash = b.squash || 1;
    bodies.push(b);
    if (b.id) byId[b.id] = b;
    return b;
  }

  add({
    id: "core", name: "Galactic core", kind: "hole", parent: -1,
    radius: 1.2e10, pat: 8, frame: 7.5, axis: 0.9,
    col: [0.02, 0.01, 0.015], atmo: [1, 0.72, 0.4], atmos: 0.02,
    ring: [2.4, 7.2, 1.0, 0.62, 0.28],
    blurb: "A dark heart with a gilt disc. The chart’s Milky Way turns around this point."
  });
  add({
    id: "sun", name: "Sun", kind: "sun", parent: 0,
    ox: 8 * KPC, oy: 0.02 * KPC, oz: 0,
    radius: RSUN, pat: 7, emit: 1, frame: 6.2, atmos: 0.18,
    col: [1, 0.62, 0.22], atmo: [1, 0.55, 0.2],
    blurb: "The hearth of this chart. Pinch outward and the planets fall into a handful of light."
  });

  function planet(spec) {
    spec.kind = spec.kind || "planet";
    spec.parent = spec.parent == null ? 1 : spec.parent;
    return add(spec);
  }
  planet({ id: "mercury", name: "Mercury", orbit: 0.387 * AU, phase: 0.5, rate: rateDays(87.97), radius: 2.4397e6, pat: 0, col: [0.62, 0.58, 0.52], atmo: [0.7, 0.65, 0.55], atmos: 0.02, blurb: "A small iron marble, quick around the hearth." });
  planet({ id: "venus", name: "Venus", orbit: 0.723 * AU, phase: 2.2, rate: rateDays(224.7), radius: 6.0518e6, pat: 1, col: [0.9, 0.78, 0.5], atmo: [0.95, 0.78, 0.45], atmos: 0.08, blurb: "A cream veil. Nothing of the ground shows through." });
  planet({ id: "earth", name: "Earth", orbit: AU, phase: 0.18, rate: rateDays(365.25), radius: 6.371e6, pat: 2, col: [0.2, 0.45, 0.5], atmo: [0.45, 0.72, 0.78], atmos: 0.045, frame: 4.4, blurb: "Teal water, ochre ground, and a thin bright rim. Home, on a stylized globe." });
  planet({ id: "moon", name: "Moon", kind: "moon", parent: 4, orbit: 3.844e8, phase: 1.15, rate: rateDays(27.32), tilt: 0.09, radius: 1.737e6, pat: 0, col: [0.72, 0.7, 0.66], atmo: [0.8, 0.8, 0.78], atmos: 0.015, blurb: "A grey companion. From here it is a short pinch away from Earth." });
  planet({ id: "mars", name: "Mars", orbit: 1.524 * AU, phase: 3.5, rate: rateDays(687), radius: 3.3895e6, pat: 3, col: [0.7, 0.32, 0.18], atmo: [0.85, 0.45, 0.3], atmos: 0.03, blurb: "Rust and a pale polar cap." });
  planet({ id: "jupiter", name: "Jupiter", orbit: 5.204 * AU, phase: 1.15, rate: rateDays(4333), radius: 6.9911e7, pat: 4, col: [0.86, 0.72, 0.48], atmo: [0.9, 0.72, 0.5], atmos: 0.04, frame: 4.2, blurb: "Bands of cream and umber, and one stubborn oval storm." });
  planet({ id: "io", name: "Io", kind: "moon", parent: 7, orbit: 4.217e8, phase: 0.4, rate: rateDays(1.77), radius: 1.8216e6, pat: 0, col: [0.9, 0.78, 0.35], atmo: [0.95, 0.7, 0.3], atmos: 0.02, blurb: "A sulphur-yellow moon racing around Jupiter." });
  planet({ id: "saturn", name: "Saturn", orbit: 9.583 * AU, phase: 4.4, rate: rateDays(10759), radius: 5.8232e7, pat: 5, axis: 0.47, col: [0.94, 0.84, 0.62], atmo: [0.95, 0.82, 0.55], atmos: 0.035, frame: 5.4, ring: [1.18, 2.32, 0.95, 0.84, 0.62], blurb: "Honey bands and a thin bright ring. The showpiece of the outer system." });
  planet({ id: "titan", name: "Titan", kind: "moon", parent: 9, orbit: 1.222e9, phase: 2.4, rate: rateDays(15.95), radius: 2.5747e6, pat: 1, col: [0.85, 0.62, 0.32], atmo: [0.9, 0.55, 0.25], atmos: 0.06, blurb: "A hazy orange moon, larger than Mercury." });
  planet({ id: "uranus", name: "Uranus", orbit: 19.19 * AU, phase: 2.5, rate: rateDays(30687), radius: 2.5362e7, pat: 6, axis: 1.55, col: [0.65, 0.88, 0.82], atmo: [0.6, 0.9, 0.85], atmos: 0.04, ring: [1.55, 2.05, 0.7, 0.85, 0.8], blurb: "A pale celadon world, tipped onto its side." });
  planet({ id: "neptune", name: "Neptune", orbit: 30.07 * AU, phase: 0.7, rate: rateDays(60190), radius: 2.4622e7, pat: 6, col: [0.22, 0.34, 0.75], atmo: [0.35, 0.5, 0.95], atmos: 0.04, blurb: "Deep cobalt, far and cold." });
  planet({ id: "pluto", name: "Pluto", orbit: 39.48 * AU, phase: 5.2, rate: rateDays(90560), tilt: 0.3, radius: 1.188e6, pat: 0, col: [0.78, 0.68, 0.58], atmo: [0.8, 0.7, 0.65], atmos: 0.02, blurb: "A small icy world on a tilted path. Still worth the trip." });

  var STAR_TABLE = [
    ["proxima", "Proxima", 4.24, 0.15, 1.0, 0.38, 0.22, "A dim red neighbour. Two small worlds circle it on this chart."],
    ["alpha", "Alpha Centauri", 4.37, 1.22, 1.0, 0.9, 0.7, "A bright pair, just past Proxima on the stylized spiral."],
    ["barnard", "Barnard's Star", 5.96, 0.2, 1.0, 0.42, 0.25, "A hurried red dwarf."],
    ["sirius", "Sirius", 8.6, 1.71, 0.75, 0.84, 1.0, "The brightest of the nearby lanterns, white with a blue edge."],
    ["procyon", "Procyon", 11.5, 2.05, 1.0, 0.95, 0.8, "A warm white star on the near spiral."],
    ["tau", "Tau Ceti", 11.9, 0.79, 1.0, 0.86, 0.62, "A quiet sunlike star."],
    ["altair", "Altair", 16.7, 1.8, 0.85, 0.92, 1.0, "A fast spinner, pale and sharp."],
    ["vega", "Vega", 25, 2.36, 0.7, 0.82, 1.0, "A blue-white lamp, one of the chart’s easy hops."],
    ["fomalhaut", "Fomalhaut", 25, 1.84, 0.8, 0.88, 1.0, "A solitary bright star with a cold colour."],
    ["pollux", "Pollux", 34, 9.1, 1.0, 0.72, 0.42, "An orange giant, already larger than the Sun."],
    ["arcturus", "Arcturus", 37, 25, 1.0, 0.55, 0.28, "A great orange giant. The disc is the destination."],
    ["capella", "Capella", 43, 12, 1.0, 0.9, 0.62, "A golden system, drawn here as one star."],
    ["aldebaran", "Aldebaran", 65, 44, 1.0, 0.45, 0.2, "A red eye. Up close it fills the view."],
    ["regulus", "Regulus", 79, 3.1, 0.7, 0.8, 1.0, "A hot white star on the mid spiral."],
    ["antares", "Antares", 550, 680, 1.0, 0.32, 0.14, "A red supergiant. Arrive slowly — the sphere is enormous."],
    ["betelgeuse", "Betelgeuse", 550, 760, 1.0, 0.28, 0.1, "A vast dull ember. Its radius on this chart is hundreds of suns."],
    ["rigel", "Rigel", 860, 79, 0.65, 0.78, 1.0, "A blue supergiant, fierce and distant."],
    ["deneb", "Deneb", 2600, 203, 0.7, 0.82, 1.0, "A far lantern. Reaching it drops you into the outer disc."],
    ["etacar", "Eta Carinae", 7500, 240, 1.0, 0.7, 0.35, "A violent, luminous star near the stylized rim of the disc."]
  ];

  var randStar = mulberry(0x51a7);
  for (var si = 0; si < STAR_TABLE.length; si++) {
    var row = STAR_TABLE[si];
    var lon = si * 2.399963 + 0.4;
    var lat = ((si % 5) - 2) * 0.16;
    var dist = row[2] * LY;
    var cl = Math.cos(lat);
    add({
      id: row[0], name: row[1], kind: si === 0 ? "star" : "star", parent: 1,
      ox: cl * Math.cos(lon) * dist,
      oy: Math.sin(lat) * dist,
      oz: cl * Math.sin(lon) * dist,
      radius: row[3] * RSUN,
      pat: 7, emit: 1, frame: row[3] > 40 ? 10 : 7,
      col: [row[4], row[5], row[6]],
      atmo: [row[4], row[5], row[6]],
      atmos: 0.12,
      blurb: row[7]
    });
  }
  var proxima = byId.proxima;
  add({
    id: "proxima-b", name: "Proxima b", kind: "planet", parent: proxima.i,
    orbit: 0.0485 * AU, phase: 0.6, rate: rateDays(11.2), radius: 7.0e6,
    pat: 0, col: [0.55, 0.32, 0.24], atmo: [0.7, 0.35, 0.25], atmos: 0.03,
    blurb: "A close, warm world around the red neighbour. Invented terrain, familiar distance."
  });
  add({
    id: "proxima-c", name: "Proxima c", kind: "planet", parent: proxima.i,
    orbit: 1.48 * AU, phase: 2.8, rate: rateDays(1900), radius: 9.0e6,
    pat: 6, col: [0.45, 0.55, 0.7], atmo: [0.5, 0.6, 0.8], atmos: 0.03,
    blurb: "A farther, colder world on the same little system."
  });
  add({
    id: "beacon", name: "Beacon", kind: "pulsar", parent: 1,
    ox: 640 * LY * 0.2, oy: 80 * LY, oz: 640 * LY * 0.98,
    radius: 14000, pat: 7, emit: 1, frame: 8,
    col: [0.7, 0.85, 1], atmo: [0.6, 0.8, 1], atmos: 0.4,
    beam0: 1.7,
    blurb: "A tiny neutron star with a sweeping beam. Wait for the flash, or fly in until the marble appears."
  });

  function gal(spec) {
    spec.kind = "galaxy";
    spec.parent = 0;
    spec.pat = 0;
    spec.frame = spec.frame || 2.6;
    spec.emit = 1;
    return add(spec);
  }
  gal({ id: "lmc", name: "Large Cloud", ox: -30 * KPC, oy: -8 * KPC, oz: 42 * KPC, radius: 4.5 * KPC, squash: 0.55, col: [0.95, 0.82, 0.62], blurb: "A bright satellite just off the disc." });
  gal({ id: "smc", name: "Small Cloud", ox: -18 * KPC, oy: -14 * KPC, oz: 58 * KPC, radius: 2.2 * KPC, squash: 0.7, col: [0.85, 0.78, 0.95], blurb: "The smaller companion cloud." });
  gal({ id: "andromeda", name: "Andromeda", ox: 40 * KPC, oy: 20 * KPC, oz: 780 * KPC, radius: 35 * KPC, squash: 0.32, col: [0.78, 0.74, 0.98], blurb: "The great spiral neighbour. Pinch in and the arms resolve." });
  gal({ id: "triangulum", name: "Triangulum", ox: 70 * KPC, oy: -15 * KPC, oz: 860 * KPC, radius: 9 * KPC, squash: 0.7, col: [0.95, 0.75, 0.58], blurb: "A smaller spiral just past Andromeda on this chart." });
  gal({ id: "centaurus", name: "Centaurus A", ox: -2800 * KPC, oy: 400 * KPC, oz: 1800 * KPC, radius: 18 * KPC, squash: 0.5, col: [0.95, 0.7, 0.45], blurb: "A dusty elliptical with a warm core." });
  gal({ id: "whirlpool", name: "Whirlpool", ox: 4200 * KPC, oy: 800 * KPC, oz: -3600 * KPC, radius: 16 * KPC, squash: 0.85, col: [0.7, 0.8, 1], blurb: "A face-on spiral, far along the web." });
  gal({ id: "sombrero", name: "Sombrero", ox: -1500 * KPC, oy: -2200 * KPC, oz: 7000 * KPC, radius: 14 * KPC, squash: 0.28, col: [0.95, 0.88, 0.7], blurb: "A thin disc seen almost edge on." });
  gal({ id: "virgo", name: "Virgo Heart", ox: 2000 * KPC, oy: 1500 * KPC, oz: 16000 * KPC, radius: 22 * KPC, squash: 0.8, col: [1, 0.82, 0.55], blurb: "A giant elliptical standing in for the Virgo cluster’s heart." });

  var wr = mulberry(0xc0ffee);
  for (var gi = 0; gi < 28; gi++) {
    var u = Math.pow((gi + 0.5) / 28, 1.35);
    var gd = (8 + u * 7000) * MPC;
    var arm = gi % 3;
    var ang = arm * 2.0944 + u * 2.7 + (wr() - 0.5) * 0.4;
    var bend = Math.sin(u * 8 + arm) * 0.28;
    var gy = Math.sin(u * 5.5 + arm * 2) * gd * 0.16;
    gal({
      id: "web" + gi,
      name: "Web " + (gi + 1),
      ox: Math.cos(ang + bend) * gd,
      oy: gy,
      oz: Math.sin(ang + bend) * gd,
      radius: (6 + wr() * 14) * KPC,
      squash: 0.35 + wr() * 0.55,
      col: [0.55 + wr() * 0.4, 0.5 + wr() * 0.35, 0.45 + wr() * 0.5],
      blurb: "One knot in the stylized cosmic web. The warm shell beyond is the edge of the observable chart."
    });
  }

  var N = bodies.length;
  px = new Float64Array(N);
  py = new Float64Array(N);
  pz = new Float64Array(N);
  stamp = new Int32Array(N);

  var sunI = byId.sun.i;
  var earthI = byId.earth.i;
  var beaconI = byId.beacon.i;

  function world(i) {
    if (stamp[i] === frameN) return;
    var b = bodies[i];
    if (b.parent >= 0) world(b.parent);
    stamp[i] = frameN;
    var x = 0, y = 0, z = 0;
    if (b.parent >= 0) { x = px[b.parent]; y = py[b.parent]; z = pz[b.parent]; }
    if (b.orbit) {
      var a = b.phase + clock * b.rate;
      var c = Math.cos(a), s = Math.sin(a);
      var st = Math.sin(b.tilt), ct = Math.cos(b.tilt);
      px[i] = x + c * b.orbit;
      py[i] = y + s * b.orbit * st;
      pz[i] = z + s * b.orbit * ct;
    } else {
      px[i] = x + b.ox;
      py[i] = y + b.oy;
      pz[i] = z + b.oz;
    }
  }
  function worldAll() {
    frameN++;
    if (frameN > 1e9) { frameN = 1; stamp.fill(0); }
    for (var i = 0; i < N; i++) world(i);
  }

  var focus = earthI;
  var yaw = 0, pitch = 0.3, logDist = 7;
  var camX = 0, camY = 0, camZ = 0;
  var lookX = 0, lookY = 0, lookZ = 0;
  var clock = 0;
  var ease = null;
  var xx = 1, xy = 0, xz = 0, yx = 0, yy = 1, yz = 0, zx = 0, zy = 0, zz = 1;
  var viewScale = 1;

  function escapeDist(b) {
    if (b.kind === "moon") return b.orbit * 0.72;
    if (b.kind === "planet") return Math.max(b.orbit * 0.4, b.radius * 90);
    if (b.kind === "sun") return 55 * LY;
    if (b.kind === "star" || b.kind === "pulsar") {
      var approx = Math.hypot(b.ox, b.oy, b.oz);
      return Math.max(b.radius * 600, Math.min(approx * 0.4, 12 * LY));
    }
    if (b.kind === "galaxy") return b.radius * 7;
    return OBS;
  }
  function minLog(b) {
    var k = b.kind === "galaxy" ? 0.9 : b.kind === "sun" || b.kind === "star" || b.kind === "pulsar" ? 2.6 : b.kind === "hole" ? 3.4 : 1.85;
    return Math.log10(Math.max(b.radius * k, 200));
  }
  function maxLog(b) {
    if (b.parent < 0) return Math.log10(OBS * 1.08);
    return Math.log10(escapeDist(b) * 1.3);
  }
  function syncOrbit() {
    world(focus);
    var d = Math.pow(10, logDist);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    lookX = px[focus]; lookY = py[focus]; lookZ = pz[focus];
    camX = lookX + cp * cy * d;
    camY = lookY + sp * d;
    camZ = lookZ + cp * sy * d;
  }
  function basis() {
    var dx = camX - lookX, dy = camY - lookY, dz = camZ - lookZ;
    var zl = Math.hypot(dx, dy, dz) || 1;
    zx = dx / zl; zy = dy / zl; zz = dz / zl;
    var cx = zz, cy = 0, cz = -zx;
    var cl = Math.hypot(cx, cy, cz);
    if (cl < 1e-5) { cx = 1; cy = 0; cz = 0; cl = 1; }
    xx = cx / cl; xy = cy / cl; xz = cz / cl;
    yx = zy * xz - zz * xy;
    yy = zz * xx - zx * xz;
    yz = zx * xy - zy * xx;
    viewScale = zl;
  }
  function adopt(wx, wy, wz, fi) {
    focus = fi;
    world(fi);
    var dx = wx - px[fi], dy = wy - py[fi], dz = wz - pz[fi];
    var d = Math.hypot(dx, dy, dz);
    if (d < 1) d = 1;
    pitch = Math.asin(clamp(dy / d, -1, 1));
    yaw = Math.atan2(dz, dx);
    logDist = Math.log10(d);
    pitch = clamp(pitch, -1.15, 1.15);
  }
  function promote() {
    var guard = 0;
    while (guard++ < 5) {
      var b = bodies[focus];
      if (b.parent < 0) break;
      if (Math.pow(10, logDist) <= escapeDist(b)) break;
      syncOrbit();
      adopt(camX, camY, camZ, b.parent);
    }
    var b2 = bodies[focus];
    logDist = clamp(logDist, minLog(b2), maxLog(b2));
  }
  function cancelEase() {
    if (!ease) return;
    adopt(camX, camY, camZ, focus);
    ease = null;
  }
  function goTo(id, yaw2, pitch2, log2) {
    var b = byId[id];
    if (!b) return;
    worldAll();
    syncOrbit();
    focus = b.i;
    var destLog = log2 != null ? log2 : Math.log10(Math.max(b.frameDist || b.radius * b.frame, b.radius * 1.2));
    destLog = clamp(destLog, minLog(b), maxLog(b));
    ease = {
      t: 0,
      dur: 1.2,
      c0x: camX, c0y: camY, c0z: camZ,
      l0x: lookX, l0y: lookY, l0z: lookZ,
      yaw: yaw2 != null ? yaw2 : yaw + 0.45,
      pitch: pitch2 != null ? pitch2 : 0.26,
      log: destLog,
      fi: b.i
    };
    lastInput = performance.now();
  }
  function stepEase(dt) {
    ease.t += dt;
    var k = clamp(ease.t / ease.dur, 0, 1);
    k = k * k * (3 - 2 * k);
    world(ease.fi);
    var d = Math.pow(10, ease.log);
    var cp = Math.cos(ease.pitch), sp = Math.sin(ease.pitch);
    var cy = Math.cos(ease.yaw), sy = Math.sin(ease.yaw);
    var tx = px[ease.fi], ty = py[ease.fi], tz = pz[ease.fi];
    var c1x = tx + cp * cy * d, c1y = ty + sp * d, c1z = tz + cp * sy * d;
    camX = ease.c0x + (c1x - ease.c0x) * k;
    camY = ease.c0y + (c1y - ease.c0y) * k;
    camZ = ease.c0z + (c1z - ease.c0z) * k;
    lookX = ease.l0x + (tx - ease.l0x) * k;
    lookY = ease.l0y + (ty - ease.l0y) * k;
    lookZ = ease.l0z + (tz - ease.l0z) * k;
    focus = ease.fi;
    if (k >= 1) {
      yaw = ease.yaw;
      pitch = ease.pitch;
      logDist = ease.log;
      ease = null;
      syncOrbit();
    }
  }

  function frameOpening() {
    worldAll();
    var ex = px[earthI], ey = py[earthI], ez = pz[earthI];
    var sx = px[sunI] - ex, sy = py[sunI] - ey, sz = pz[sunI] - ez;
    var sl = Math.hypot(sx, sy, sz) || 1;
    sx /= sl; sy /= sl; sz /= sl;
    var ang = OPEN_TILT;
    var cx = -sx * Math.cos(ang);
    var cy = -sy * Math.cos(ang) + Math.sin(ang);
    var cz = -sz * Math.cos(ang);
    var cl = Math.hypot(cx, cy, cz) || 1;
    focus = earthI;
    yaw = Math.atan2(cz / cl, cx / cl);
    pitch = Math.asin(clamp(cy / cl, -1, 1));
    logDist = Math.log10(bodies[earthI].radius * OPEN_RADII);
  }

  var shellN = 1100;
  var shell = new Float32Array(shellN * 8);
  (function buildShell() {
    var rnd = mulberry(0x5eed);
    for (var i = 0; i < shellN; i++) {
      var band = i % 4 !== 0;
      var lon = rnd() * Math.PI * 2;
      var lat = band ? (rnd() - 0.5) * (0.22 + rnd() * 0.35) : Math.asin(rnd() * 2 - 1);
      var cl = Math.cos(lat);
      var o = i * 8;
      shell[o] = cl * Math.cos(lon);
      shell[o + 1] = Math.sin(lat);
      shell[o + 2] = cl * Math.sin(lon);
      var mag = rnd();
      shell[o + 3] = mag > 0.97 ? 3.6 : mag > 0.9 ? 2.5 : 1.45 + rnd() * 0.7;
      var warm = rnd();
      if (warm > 0.82) { shell[o + 4] = 0.7; shell[o + 5] = 0.8; shell[o + 6] = 1; }
      else if (warm > 0.55) { shell[o + 4] = 1; shell[o + 5] = 0.95; shell[o + 6] = 0.88; }
      else { shell[o + 4] = 1; shell[o + 5] = 0.78; shell[o + 6] = 0.5; }
      shell[o + 7] = rnd();
    }
  })();

  var mwN = 1500;
  var mwX = new Float64Array(mwN), mwY = new Float64Array(mwN), mwZ = new Float64Array(mwN), mwK = new Float32Array(mwN);
  (function buildMw() {
    var rnd = mulberry(0x911);
    for (var i = 0; i < mwN; i++) {
      if (i < 220) {
        var rr = Math.pow(rnd(), 0.55) * 1.8 * KPC;
        var a = rnd() * Math.PI * 2;
        mwX[i] = Math.cos(a) * rr;
        mwZ[i] = Math.sin(a) * rr;
        mwY[i] = (rnd() - 0.5) * 0.15 * KPC;
      } else {
        var arm = i % 4;
        var u = Math.pow(rnd(), 0.7);
        var r = (2.3 + u * 13.2) * KPC;
        var th = arm * 1.5708 + u * 4.5 + (rnd() - 0.5) * 0.45;
        mwX[i] = Math.cos(th) * r;
        mwZ[i] = Math.sin(th) * r;
        mwY[i] = (rnd() + rnd() + rnd() - 1.5) * 0.16 * KPC * (0.4 + u);
      }
      mwK[i] = rnd();
    }
  })();

  var beltN = 320;
  var beltA = new Float64Array(beltN), beltR = new Float64Array(beltN), beltY = new Float64Array(beltN);
  (function buildBelt() {
    var rnd = mulberry(0xb317);
    for (var i = 0; i < beltN; i++) {
      beltA[i] = rnd() * Math.PI * 2;
      beltR[i] = (2.1 + rnd() * 1.25) * AU;
      beltY[i] = (rnd() - 0.5) * 0.09 * AU;
    }
  })();

  var canvas = document.getElementById("canvas");
  var whereEl = document.getElementById("where");
  var sheetName = document.getElementById("sheet-name");
  var sheetDist = document.getElementById("sheet-dist");
  var sheetBlurb = document.getElementById("sheet-blurb");
  var jumps = document.getElementById("jumps");
  var sheet = document.getElementById("sheet");
  var cssW = 1, cssH = 1, bufW = 1, bufH = 1;
  var soft = false;
  var gl = null;
  var maxPoint = 64;
  var sentReady = false;
  var drawn = 0;
  var lastInput = 0;
  var pointers = new Map();
  var pinching = false;
  var suppressTap = false;
  var pinch0 = 0, mid0 = 0, logAtPinch = 0;
  var hudName = "", hudSub = "";

  var JUMPS = [
    ["Sun", "sun"],
    ["Earth", "earth"],
    ["Jupiter", "jupiter"],
    ["Saturn", "saturn"],
    ["Sirius", "sirius"],
    ["Betelgeuse", "betelgeuse"],
    ["Beacon", "beacon"],
    ["Core", "core"],
    ["Andromeda", "andromeda"],
    ["The edge", "edge"]
  ];

  function silence(el) {
    ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend", "wheel", "contextmenu"].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.stopPropagation(); });
    });
  }
  silence(sheet);
  JUMPS.forEach(function (pair) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = pair[0];
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (pair[1] === "edge") goTo("core", 0.85, 0.16, Math.log10(0.86 * OBS));
      else goTo(pair[1]);
    });
    jumps.appendChild(btn);
  });
  function fmt(m) {
    var a = Math.abs(m);
    if (a < 0.08 * AU) return Math.max(1, Math.round(a / 1000)).toLocaleString("en-US") + " km";
    if (a < 0.25 * LY) return (a / AU).toFixed(a < 30 * AU ? 2 : 1) + " AU";
    if (a < 0.25 * KPC) return (a / LY).toFixed(a < 30 * LY ? 1 : 0) + " ly";
    if (a < 0.25 * MPC) return (a / KPC).toFixed(2) + " kpc";
    if (a < 0.25 * GPC) return (a / MPC).toFixed(2) + " Mpc";
    return (a / GPC).toFixed(2) + " Gpc";
  }
  function rung(originDist, sunDist, focusDist) {
    if (focusDist < bodies[focus].radius * 48) return "close orbit";
    if (sunDist < 2.2 * AU) return "inner system";
    if (sunDist < 120 * AU) return "solar system";
    if (sunDist < 40 * LY) return "nearby stars";
    if (sunDist < 4000 * LY) return "stellar field";
    if (originDist < 90 * KPC) return "milky way";
    if (originDist < 6 * MPC) return "local group";
    if (originDist < 500 * MPC) return "galaxy web";
    return "observable edge";
  }
  function setHud() {
    var b = bodies[focus];
    var dist = Math.hypot(camX - px[focus], camY - py[focus], camZ - pz[focus]);
    var sunD = Math.hypot(camX - px[sunI], camY - py[sunI], camZ - pz[sunI]);
    var oriD = Math.hypot(camX, camY, camZ);
    var sub = fmt(dist) + " · " + rung(oriD, sunD, dist);
    if (b.name !== hudName || sub !== hudSub) {
      hudName = b.name;
      hudSub = sub;
      whereEl.innerHTML = hudName + "<small>" + hudSub + "</small>";
      sheetName.textContent = b.name;
      sheetDist.textContent = sub;
      sheetBlurb.textContent = b.blurb || "";
    }
  }

  function pixelRatio() {
    var dpr = window.devicePixelRatio || 1;
    if (soft) return Math.min(dpr, 0.6);
    var coarse = false;
    try { coarse = matchMedia("(pointer: coarse)").matches; } catch (e) {}
    if (coarse) return Math.max(0.65, Math.min(dpr * 0.62, 1.1));
    return Math.max(0.8, Math.min(dpr, 1.55));
  }
  function resize() {
    var w = canvas.clientWidth | 0;
    var h = canvas.clientHeight | 0;
    if (w < 2 || h < 2) return false;
    var pr = pixelRatio();
    var bw = Math.max(2, Math.round(w * pr));
    var bh = Math.max(2, Math.round(h * pr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    cssW = w; cssH = h; bufW = bw; bufH = bh;
    return true;
  }

  function link(vsSrc, fsSrc, attribs) {
    var p = gl.createProgram();
    var vs = gl.createShader(gl.VERTEX_SHADER);
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs, vsSrc);
    gl.shaderSource(fs, fsSrc);
    gl.compileShader(vs);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS) || !gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs));
      return null;
    }
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    for (var i = 0; i < attribs.length; i++) gl.bindAttribLocation(p, i, attribs[i]);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  var progSky, progSphere, progGal, progRing, progShell, progDyn, progLine;
  var skyBuf, quadBuf, shellBuf, dynBuf, lineBuf;
  var vaoSky, vaoQuad, vaoShell, vaoDyn, vaoLine;
  var dynData = new Float32Array(4200 * 8);
  var lineData = new Float32Array(2400 * 3);
  var uSky = {}, uSph = {}, uGal = {}, uRing = {}, uShell = {}, uDyn = {}, uLine = {};

  var SKY_VS = "#version 300 es\nin vec2 aCorner;\nout vec2 vUv;\nvoid main(){vUv=aCorner;gl_Position=vec4(aCorner,0.0,1.0);}";
  var SKY_FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vUv;",
    "uniform vec3 uX,uY,uZ,uSun,uBeam;",
    "uniform float uMw,uCmb,uPulse,uBeamVis;",
    "uniform vec2 uTan;",
    "out vec4 frag;",
    "float hash13(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}",
    "void main(){",
    "vec3 rd=normalize(uX*(vUv.x*uTan.x)+uY*(vUv.y*uTan.y)-uZ);",
    "float up=rd.y*0.5+0.5;",
    "vec3 col=mix(vec3(0.012,0.01,0.028),vec3(0.045,0.035,0.08),up);",
    "float band=exp(-pow(rd.y*8.0,2.0));",
    "float lane=exp(-pow(rd.y*26.0,2.0));",
    "float arms=0.6+0.4*sin(atan(rd.z,rd.x)*2.0+0.35);",
    "col+=vec3(0.42,0.36,0.62)*band*arms*0.62*uMw;",
    "col+=vec3(0.9,0.74,0.46)*band*(1.0-lane)*0.14*uMw;",
    "col=max(col-vec3(0.035,0.02,0.045)*lane*band*uMw,0.0);",
    "float s=max(dot(rd,uSun),0.0);",
    "col+=vec3(1.0,0.9,0.7)*pow(s,1600.0)*2.4;",
    "col+=vec3(1.0,0.64,0.28)*pow(s,80.0)*0.6;",
    "col+=vec3(1.0,0.46,0.18)*pow(s,14.0)*0.2;",
    "col+=vec3(0.95,0.55,0.22)*pow(s,3.0)*0.075;",
    "float blobs=hash13(floor(rd*6.0+2.0));",
    "float fine=hash13(floor(rd*17.0+8.0));",
    "vec3 cmb=vec3(0.68,0.3,0.16)*(0.22+0.95*blobs)+vec3(0.18,0.08,0.2)*fine;",
    "col=mix(col,col+cmb,uCmb);",
    "float beam=pow(max(dot(rd,uBeam),0.0),80.0)+pow(max(dot(rd,-uBeam),0.0),80.0);",
    "col+=vec3(0.62,0.82,1.0)*beam*uBeamVis;",
    "col+=vec3(0.75,0.88,1.0)*uPulse*0.42;",
    "float vig=dot(vUv,vUv);",
    "col*=mix(1.06,0.52,smoothstep(0.15,1.65,vig));",
    "frag=vec4(col,1.0);}"
  ].join("\n");

  var QUAD_VS = [
    "#version 300 es",
    "in vec2 aCorner;",
    "uniform mat4 uProj;",
    "uniform vec3 uC;",
    "uniform float uPad,uSquash;",
    "out vec3 vPos;",
    "void main(){",
    "vec3 p=vec3(uC.x+aCorner.x*uPad,uC.y+aCorner.y*uPad*uSquash,uC.z);",
    "vPos=p;gl_Position=uProj*vec4(p,1.0);}"
  ].join("\n");

  var SPHERE_FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 vPos;",
    "uniform vec3 uC,uSun,uCol,uAtmo,uX,uY,uZ;",
    "uniform float uR,uEmit,uPat,uTime,uAtmos;",
    "out vec4 frag;",
    "float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float n2(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);",
    "float a=h21(i),b=h21(i+vec2(1.0,0.0)),c=h21(i+vec2(0.0,1.0)),d=h21(i+vec2(1.0,1.0));",
    "return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}",
    "float fbm(vec2 p){return n2(p)*0.55+n2(p*2.13+3.1)*0.28+n2(p*4.27+1.7)*0.17;}",
    "void main(){",
    "vec3 rd=normalize(vPos);",
    "vec3 oc=-uC;",
    "float b=dot(oc,rd);",
    "float c=dot(oc,oc)-uR*uR;",
    "float h=b*b-c;",
    "float aR=uR*(1.0+uAtmos);",
    "float hA=b*b-(dot(oc,oc)-aR*aR);",
    "if(h<0.0&&(uAtmos<0.001||hA<0.0))discard;",
    "vec3 col=vec3(0.0);float alpha=0.0;",
    "if(h>=0.0){",
    "float t=-b-sqrt(h);if(t<0.0)t=-b+sqrt(h);",
    "vec3 p=rd*t;vec3 n=normalize(p-uC);",
    "vec3 nw=normalize(uX*n.x+uY*n.y+uZ*n.z);",
    "float lat=nw.y;float lon=atan(nw.z,nw.x);",
    "vec3 albedo=uCol;float cloud=0.0;float city=0.0;",
    "if(uPat<0.5){float cr=fbm(vec2(lon*4.0,lat*6.0));albedo=uCol*(0.55+0.75*cr);}",
    "else if(uPat<1.5){float w=fbm(vec2(lon*1.4+uTime*0.012,lat*2.4));albedo=mix(vec3(0.84,0.7,0.42),vec3(0.97,0.9,0.66),w);}",
    "else if(uPat<2.5){",
    "float land=fbm(vec2(lon*1.35+1.2,lat*2.3));float detail=fbm(vec2(lon*3.2+4.0,lat*3.1));",
    "float continent=smoothstep(0.46,0.58,land);float ice=smoothstep(0.72,0.92,abs(lat));",
    "vec3 ocean=vec3(0.04,0.26,0.32);vec3 ground=mix(vec3(0.34,0.46,0.24),vec3(0.74,0.56,0.3),detail);",
    "albedo=mix(ocean,ground,continent);",
    "float shore=1.0-smoothstep(0.0,0.07,abs(land-0.52));",
    "albedo=mix(albedo,vec3(0.55,0.64,0.42),shore*0.65);",
    "albedo=mix(albedo,vec3(0.88,0.92,0.95),ice);",
    "cloud=smoothstep(0.52,0.74,fbm(vec2(lon*2.4+uTime*0.02,lat*3.2+2.0)))*(1.0-ice);",
    "city=smoothstep(0.58,0.82,fbm(vec2(lon*9.0,lat*8.0)))*continent*(1.0-ice);",
    "}else if(uPat<3.5){float d=fbm(vec2(lon*2.2,lat*2.4));albedo=mix(vec3(0.64,0.27,0.14),vec3(0.36,0.15,0.1),d);albedo=mix(albedo,vec3(0.84,0.8,0.74),smoothstep(0.78,0.95,abs(lat)));}",
    "else if(uPat<4.5){float bands=sin(lat*21.0+fbm(vec2(lon*1.6,lat*3.0))*1.8);albedo=mix(vec3(0.92,0.8,0.56),vec3(0.52,0.3,0.15),smoothstep(-0.15,0.75,bands));",
    "float dx=lon-0.55;float dy=lat+0.28;float spot=exp(-(dx*dx*7.0+dy*dy*26.0));albedo=mix(albedo,vec3(0.74,0.3,0.16),clamp(spot,0.0,1.0));}",
    "else if(uPat<5.5){float bands=sin(lat*16.0+fbm(vec2(lon*1.2,lat*2.0))*1.2);albedo=mix(vec3(0.96,0.88,0.64),vec3(0.76,0.58,0.34),smoothstep(-0.2,0.85,bands));}",
    "else if(uPat<6.5){float w=fbm(vec2(lon*2.0,lat*3.0));albedo=mix(uCol*0.75,uCol*1.2,w);}",
    "else if(uPat<7.5){float g=fbm(vec2(lon*5.0+uTime*0.025,lat*7.0));albedo=mix(uCol*0.55,uCol*1.25+vec3(0.2,0.08,0.0),g);}",
    "else{albedo=vec3(0.0);}",
    "vec3 L=normalize(uSun-p);float ndl=max(dot(n,L),0.0);float facing=max(dot(n,-rd),0.0);float rim=pow(1.0-facing,2.05);",
    "if(uEmit>0.5){float limb=pow(1.0-facing,0.5);col=albedo*mix(1.2,0.35,limb);alpha=1.0;}",
    "else if(uPat>=7.5){col=vec3(1.0,0.78,0.42)*pow(rim,1.35)*1.45;alpha=1.0;}",
    "else{",
    "col=albedo*(ndl*0.92+0.11)+albedo*pow(ndl,4.0)*0.35;",
    "col=mix(col,vec3(0.96,0.97,0.99),cloud*(0.15+0.75*ndl));",
    "col+=vec3(1.0,0.76,0.4)*city*(1.0-smoothstep(0.0,0.2,ndl))*1.2;",
    "col+=uAtmo*rim*1.05;alpha=1.0;}",
    "}",
    "if(uAtmos>0.001&&hA>=0.0){",
    "float distC=length(cross(rd,uC));",
    "if(distC>uR&&distC<aR){float g=1.0-(distC-uR)/(aR-uR);g*=g;col+=uAtmo*g*0.9;alpha=max(alpha,g*0.6);}",
    "}",
    "if(alpha<0.012)discard;",
    "frag=vec4(col,alpha);}"
  ].join("\n");

  var GAL_FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 vPos;",
    "uniform vec3 uC,uCol;uniform float uPad,uSquash,uTime;",
    "out vec4 frag;",
    "void main(){",
    "vec2 q=vec2((vPos.x-uC.x)/uPad,(vPos.y-uC.y)/max(uPad*uSquash,1e-4));",
    "float r=length(q);if(r>1.0)discard;",
    "float ang=atan(q.y,q.x);",
    "float arm=pow(0.5+0.5*sin(ang*2.0-log(r+0.03)*5.2),5.0);",
    "float disc=exp(-r*r*2.5);float core=exp(-r*6.2);",
    "float dust=0.72+0.28*sin(ang*7.0+r*16.0);",
    "vec3 col=uCol*(disc*0.3+arm*disc*1.4+core*1.75)*dust;",
    "float alpha=clamp(disc*0.75+core,0.0,1.0);",
    "if(alpha<0.02)discard;",
    "frag=vec4(col,alpha);}"
  ].join("\n");

  var RING_FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 vPos;",
    "uniform vec3 uC,uN,uSun,uCol;",
    "uniform float uR,uIn,uOut;",
    "out vec4 frag;",
    "void main(){",
    "vec3 rd=normalize(vPos);",
    "float denom=dot(rd,uN);if(abs(denom)<1e-4)discard;",
    "float t=dot(uC,uN)/denom;if(t<0.0)discard;",
    "vec3 p=rd*t;vec3 d=p-uC;",
    "float radial=length(d-uN*dot(d,uN));",
    "if(radial<uIn||radial>uOut)discard;",
    "vec3 oc=-uC;float b=dot(oc,rd);float c=dot(oc,oc)-uR*uR;float h=b*b-c;",
    "if(h>=0.0){float t0=-b-sqrt(h);if(t>t0&&t0>0.0)discard;}",
    "float u=(radial-uIn)/(uOut-uIn);",
    "float band=0.42+0.58*(0.5+0.5*sin(u*48.0));",
    "float gap=smoothstep(0.02,0.0,abs(u-0.62));band*=1.0-0.82*gap;",
    "float edge=smoothstep(0.0,0.045,u)*smoothstep(1.0,0.88,u);",
    "float ndl=abs(dot(normalize(uSun-p),uN));",
    "vec3 col=uCol*band*(0.32+0.8*ndl);",
    "float alpha=edge*band*0.78;if(alpha<0.02)discard;",
    "frag=vec4(col,alpha);}"
  ].join("\n");

  var SHELL_VS = [
    "#version 300 es",
    "in vec3 aPos;in float aSize;in vec3 aCol;in float aTw;",
    "uniform mat4 uProj;uniform vec3 uX,uY,uZ;uniform float uMaxSize;",
    "out vec3 vCol;out float vTw;",
    "void main(){",
    "float vx=dot(aPos,uX),vy=dot(aPos,uY),vz=dot(aPos,uZ);",
    "gl_Position=uProj*vec4(vx*16.0,vy*16.0,vz*16.0,1.0);",
    "gl_PointSize=clamp(aSize,1.0,uMaxSize);",
    "vCol=aCol;vTw=aTw;}"
  ].join("\n");
  var DYN_VS = [
    "#version 300 es",
    "in vec3 aPos;in float aSize;in vec3 aCol;in float aTw;",
    "uniform mat4 uProj;uniform float uMaxSize;",
    "out vec3 vCol;out float vTw;",
    "void main(){",
    "gl_Position=uProj*vec4(aPos,1.0);",
    "gl_PointSize=clamp(aSize,1.0,uMaxSize);",
    "vCol=aCol;vTw=aTw;}"
  ].join("\n");
  var POINT_FS = [
    "#version 300 es",
    "precision mediump float;",
    "in vec3 vCol;in float vTw;uniform float uTime;",
    "out vec4 frag;",
    "void main(){",
    "vec2 p=gl_PointCoord*2.0-1.0;float r2=dot(p,p);if(r2>1.0)discard;",
    "float a=exp(-r2*3.3);",
    "float tw=0.9+0.1*sin(uTime*(1.2+vTw*2.2)+vTw*10.0);",
    "frag=vec4(vCol*a*tw,a);}"
  ].join("\n");
  var LINE_VS = "#version 300 es\nin vec3 aPos;uniform mat4 uProj;void main(){gl_Position=uProj*vec4(aPos,1.0);}";
  var LINE_FS = "#version 300 es\nprecision mediump float;\nout vec4 frag;void main(){frag=vec4(0.86,0.74,0.5,0.33);}";

  function bootGl() {
    gl = canvas.getContext("webgl2", {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: "high-performance", preserveDrawingBuffer: false
    });
    if (!gl) return false;
    var info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) {
      var renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "");
      soft = /swiftshader|llvmpipe|software/i.test(renderer);
    }
    var range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    if (range && range[1]) maxPoint = Math.min(64, range[1]);
    progSky = link(SKY_VS, SKY_FS, ["aCorner"]);
    progSphere = link(QUAD_VS, SPHERE_FS, ["aCorner"]);
    progGal = link(QUAD_VS, GAL_FS, ["aCorner"]);
    progRing = link(QUAD_VS, RING_FS, ["aCorner"]);
    progShell = link(SHELL_VS, POINT_FS, ["aPos", "aSize", "aCol", "aTw"]);
    progDyn = link(DYN_VS, POINT_FS, ["aPos", "aSize", "aCol", "aTw"]);
    progLine = link(LINE_VS, LINE_FS, ["aPos"]);
    if (!progSky || !progSphere || !progGal || !progRing || !progShell || !progDyn || !progLine) return false;
    function take(prog, names) {
      var o = {};
      for (var i = 0; i < names.length; i++) o[names[i]] = gl.getUniformLocation(prog, names[i]);
      return o;
    }
    uSky = take(progSky, ["uX", "uY", "uZ", "uSun", "uBeam", "uMw", "uCmb", "uPulse", "uBeamVis", "uTan"]);
    uSph = take(progSphere, ["uProj", "uC", "uPad", "uSquash", "uR", "uSun", "uCol", "uAtmo", "uX", "uY", "uZ", "uEmit", "uPat", "uTime", "uAtmos"]);
    uGal = take(progGal, ["uProj", "uC", "uPad", "uSquash", "uCol", "uTime"]);
    uRing = take(progRing, ["uProj", "uC", "uPad", "uSquash", "uN", "uSun", "uCol", "uR", "uIn", "uOut"]);
    uShell = take(progShell, ["uProj", "uX", "uY", "uZ", "uMaxSize", "uTime"]);
    uDyn = take(progDyn, ["uProj", "uMaxSize", "uTime"]);
    uLine = take(progLine, ["uProj"]);
    skyBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    shellBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shellBuf);
    gl.bufferData(gl.ARRAY_BUFFER, shell, gl.STATIC_DRAW);
    dynBuf = gl.createBuffer();
    lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf);
    gl.bufferData(gl.ARRAY_BUFFER, dynData.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lineData.byteLength, gl.DYNAMIC_DRAW);
    function makeVao(buf, layout) {
      var vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      for (var i = 0; i < layout.length; i++) {
        var s = layout[i];
        gl.enableVertexAttribArray(s[0]);
        gl.vertexAttribPointer(s[0], s[1], gl.FLOAT, false, s[2], s[3]);
      }
      gl.bindVertexArray(null);
      return vao;
    }
    vaoSky = makeVao(skyBuf, [[0, 2, 0, 0]]);
    vaoQuad = makeVao(quadBuf, [[0, 2, 0, 0]]);
    vaoShell = makeVao(shellBuf, [[0, 3, 32, 0], [1, 1, 32, 12], [2, 3, 32, 16], [3, 1, 32, 28]]);
    vaoDyn = makeVao(dynBuf, [[0, 3, 32, 0], [1, 1, 32, 12], [2, 3, 32, 16], [3, 1, 32, 28]]);
    vaoLine = makeVao(lineBuf, [[0, 3, 0, 0]]);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    return true;
  }

  function perspective(aspect) {
    var f = 1 / Math.tan(FOV * 0.5);
    var nf = 1 / (NEAR - FAR);
    var m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (FAR + NEAR) * nf;
    m[11] = -1;
    m[14] = 2 * FAR * NEAR * nf;
    return m;
  }

  var vx = 0, vy = 0, vz = 0;
  function viewOf(x, y, z) {
    var dx = x - camX, dy = y - camY, dz = z - camZ;
    vx = (dx * xx + dy * xy + dz * xz) / viewScale;
    vy = (dx * yx + dy * yy + dz * yz) / viewScale;
    vz = (dx * zx + dy * zy + dz * zz) / viewScale;
  }
  function dirView(x, y, z) {
    return [x * xx + y * xy + z * xz, x * yx + y * yy + z * yz, x * zx + y * zy + z * zz];
  }

  function bindQuad(prog) {
    gl.useProgram(prog);
    gl.bindVertexArray(vaoQuad);
  }
  function drawQuad() { gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }

  function pushDyn(x, y, z, size, r, g, b, tw) {
    if (dynCount >= 4100) return;
    if (vz > -NEAR || vz < -FAR * 0.92) return;
    var o = dynCount * 8;
    dynData[o] = x; dynData[o + 1] = y; dynData[o + 2] = z;
    dynData[o + 3] = size;
    dynData[o + 4] = r; dynData[o + 5] = g; dynData[o + 6] = b;
    dynData[o + 7] = tw;
    dynCount++;
  }
  var dynCount = 0;
  var lineCount = 0;
  var meshOrder = new Int32Array(N);
  var meshDist = new Float64Array(N);
  var meshN = 0;

  function addOrbit(parent, radius, tilt) {
    world(parent);
    var seg = 64;
    var st = Math.sin(tilt), ct = Math.cos(tilt);
    var prevOk = false, pvx = 0, pvy = 0, pvz = 0;
    for (var i = 0; i <= seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      var c = Math.cos(a), s = Math.sin(a);
      var x = px[parent] + c * radius;
      var y = py[parent] + s * radius * st;
      var z = pz[parent] + s * radius * ct;
      viewOf(x, y, z);
      var ok = vz < -NEAR && vz > -FAR * 0.9;
      if (ok && prevOk && lineCount < 790) {
        var o = lineCount * 6;
        lineData[o] = pvx; lineData[o + 1] = pvy; lineData[o + 2] = pvz;
        lineData[o + 3] = vx; lineData[o + 4] = vy; lineData[o + 5] = vz;
        lineCount++;
      }
      prevOk = ok; pvx = vx; pvy = vy; pvz = vz;
    }
  }

  function draw() {
    if (!gl || !resize()) return false;
    worldAll();
    var dtHold = 0;
    if (ease) stepEase(0);
    else syncOrbit();
    basis();
    var proj = perspective(bufW / Math.max(1, bufH));
    var tanY = Math.tan(FOV * 0.5);
    var tanX = tanY * (bufW / Math.max(1, bufH));

    var sunDx = px[sunI] - camX, sunDy = py[sunI] - camY, sunDz = pz[sunI] - camZ;
    var sunL = Math.hypot(sunDx, sunDy, sunDz) || 1;
    var sunDir = [sunDx / sunL, sunDy / sunL, sunDz / sunL];
    viewOf(px[sunI], py[sunI], pz[sunI]);
    var sunVx = vx, sunVy = vy, sunVz = vz;

    var bnx = 1, bny = 0, bnz = 0, pulse = 0, beamVis = 0;
    world(beaconI);
    var bang = bodies[beaconI].beam0 + clock * 2.15;
    var bwx = Math.cos(bang), bwy = 0.22, bwz = Math.sin(bang);
    var bl = Math.hypot(bwx, bwy, bwz) || 1;
    bnx = bwx / bl; bny = bwy / bl; bnz = bwz / bl;
    var toCx = camX - px[beaconI], toCy = camY - py[beaconI], toCz = camZ - pz[beaconI];
    var tl = Math.hypot(toCx, toCy, toCz) || 1;
    var align = Math.abs((bnx * toCx + bny * toCy + bnz * toCz) / tl);
    pulse = align > 0.993 ? (align - 0.993) / 0.007 : 0;
    var beaconDist = tl;
    beamVis = (1 - smooth(2 * LY, 40 * LY, beaconDist)) * (beaconDist > bodies[beaconI].radius * 30 ? 1 : 0.25);

    var originDist = Math.hypot(camX, camY, camZ);
    var sunDist = sunL;
    var mwBand = 1 - smooth(Math.log10(0.08 * KPC), Math.log10(3 * KPC), Math.log10(Math.max(sunDist, 1)));
    var cmb = smooth(Math.log10(0.35 * GPC), Math.log10(9 * GPC), Math.log10(Math.max(originDist, 1)));

    gl.viewport(0, 0, bufW, bufH);
    gl.disable(gl.BLEND);
    gl.useProgram(progSky);
    gl.uniform3f(uSky.uX, xx, xy, xz);
    gl.uniform3f(uSky.uY, yx, yy, yz);
    gl.uniform3f(uSky.uZ, zx, zy, zz);
    gl.uniform3f(uSky.uSun, sunDir[0], sunDir[1], sunDir[2]);
    gl.uniform3f(uSky.uBeam, bnx, bny, bnz);
    gl.uniform1f(uSky.uMw, mwBand);
    gl.uniform1f(uSky.uCmb, cmb);
    gl.uniform1f(uSky.uPulse, pulse);
    gl.uniform1f(uSky.uBeamVis, beamVis);
    gl.uniform2f(uSky.uTan, tanX, tanY);
    gl.bindVertexArray(vaoSky);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(progShell);
    gl.uniformMatrix4fv(uShell.uProj, false, proj);
    gl.uniform3f(uShell.uX, xx, xy, xz);
    gl.uniform3f(uShell.uY, yx, yy, yz);
    gl.uniform3f(uShell.uZ, zx, zy, zz);
    gl.uniform1f(uShell.uMaxSize, maxPoint);
    gl.uniform1f(uShell.uTime, clock);
    gl.bindVertexArray(vaoShell);
    gl.drawArrays(gl.POINTS, 0, shellN);

    dynCount = 0;
    meshN = 0;
    for (var i = 0; i < N; i++) {
      var b = bodies[i];
      viewOf(px[i], py[i], pz[i]);
      var distW = Math.hypot(px[i] - camX, py[i] - camY, pz[i] - camZ);
      if (distW < 1) distW = 1;
      var ang = b.radius / distW;
      var meshCut = b.kind === "galaxy" ? 0.018 : 0.01;
      var asMesh = ang > meshCut && vz < -NEAR && Math.hypot(vx, vy, vz) < FAR * 0.9;
      if (asMesh && b.kind !== "pulsar" || (asMesh && b.kind === "pulsar")) {
        meshOrder[meshN] = i;
        meshDist[i] = Math.hypot(vx, vy, vz);
        meshN++;
      } else if (b.kind !== "moon" || distW < 0.05 * AU) {
        var base = b.kind === "sun" ? 6.2 : b.kind === "galaxy" ? 3.4 : b.kind === "hole" ? 3.2 : b.kind === "pulsar" ? 3.6 : 2.3;
        if (b.kind === "star" || b.kind === "pulsar" || b.kind === "sun") {
          base += Math.min(4.2, Math.log10(b.radius / RSUN + 1.2) * 1.3);
        }
        var ly = distW / LY;
        var size = base * Math.sqrt(6 / Math.max(ly, 0.05));
        if (b.kind === "planet" || b.kind === "moon") size = Math.max(1.8, ang * cssH * 0.9);
        size = clamp(size, 1.5, 18);
        var twinkle = (i % 17) / 17;
        if (pulse > 0 && i === beaconI) size += pulse * 10;
        pushDyn(vx, vy, vz, size, b.col[0], b.col[1], b.col[2], twinkle);
      }
    }

    if (sunDist > 0.15 * KPC && sunDist < 280 * KPC) {
      for (var m = 0; m < mwN; m += soft ? 2 : 1) {
        viewOf(mwX[m], mwY[m], mwZ[m]);
        var k = mwK[m];
        var colr = k > 0.7 ? 0.72 : 1, colg = k > 0.7 ? 0.8 : 0.84, colb = k > 0.7 ? 1 : 0.62;
        pushDyn(vx, vy, vz, k > 0.92 ? 2.8 : 1.55, colr, colg, colb, k);
      }
    }
    if (sunDist > 0.35 * AU && sunDist < 90 * AU) {
      var sx0 = px[sunI], sy0 = py[sunI], sz0 = pz[sunI];
      for (var q = 0; q < beltN; q++) {
        var ca = Math.cos(beltA[q] + clock * 0.02), sa = Math.sin(beltA[q] + clock * 0.02);
        viewOf(sx0 + ca * beltR[q], sy0 + beltY[q], sz0 + sa * beltR[q]);
        pushDyn(vx, vy, vz, 1.5, 0.72, 0.64, 0.5, q / beltN);
      }
    }

    if (dynCount) {
      gl.useProgram(progDyn);
      gl.uniformMatrix4fv(uDyn.uProj, false, proj);
      gl.uniform1f(uDyn.uMaxSize, maxPoint);
      gl.uniform1f(uDyn.uTime, clock);
      gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dynData.subarray(0, dynCount * 8));
      gl.bindVertexArray(vaoDyn);
      gl.drawArrays(gl.POINTS, 0, dynCount);
    }

    lineCount = 0;
    if (sunDist > 3.2 * AU && sunDist < 90 * AU) {
      for (var oi = 0; oi < N; oi++) {
        var ob = bodies[oi];
        if (ob.orbit && ob.parent === sunI && ob.kind === "planet") addOrbit(sunI, ob.orbit, ob.tilt);
      }
    }
    var earthCam = Math.hypot(camX - px[earthI], camY - py[earthI], camZ - pz[earthI]);
    var moonOrbit = byId.moon.orbit;
    if (earthCam > moonOrbit * 2.4 && earthCam < moonOrbit * 24) {
      addOrbit(earthI, moonOrbit, byId.moon.tilt);
    }
    if (lineCount) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(progLine);
      gl.uniformMatrix4fv(uLine.uProj, false, proj);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineData.subarray(0, lineCount * 6));
      gl.bindVertexArray(vaoLine);
      gl.drawArrays(gl.LINES, 0, lineCount * 2);
    }

    if (meshN > 1) {
      var idx = [];
      for (var mi = 0; mi < meshN; mi++) idx.push(meshOrder[mi]);
      idx.sort(function (a, c) { return meshDist[c] - meshDist[a]; });
      for (var mj = 0; mj < meshN; mj++) meshOrder[mj] = idx[mj];
    }

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (var di = 0; di < meshN; di++) {
      var bi = meshOrder[di];
      var body = bodies[bi];
      viewOf(px[bi], py[bi], pz[bi]);
      var dView = Math.hypot(vx, vy, vz);
      if (dView < body.radius / viewScale * 1.02) continue;
      var radV = body.radius / viewScale;
      var atmosR = radV * (1 + (body.atmos || 0));
      var useR = body.kind === "galaxy" ? radV : Math.max(radV, atmosR);
      var pad = useR * dView / Math.sqrt(Math.max(dView * dView - useR * useR, 1e-8));
      pad *= body.kind === "galaxy" ? 1.02 : 1.12;
      if (pad > 4000) continue;
      var squash = body.kind === "galaxy" ? body.squash : 1;
      if (body.kind === "galaxy") {
        bindQuad(progGal);
        gl.uniformMatrix4fv(uGal.uProj, false, proj);
        gl.uniform3f(uGal.uC, vx, vy, vz);
        gl.uniform1f(uGal.uPad, radV);
        gl.uniform1f(uGal.uSquash, squash);
        gl.uniform3f(uGal.uCol, body.col[0], body.col[1], body.col[2]);
        gl.uniform1f(uGal.uTime, clock);
        drawQuad();
        continue;
      }
      bindQuad(progSphere);
      gl.uniformMatrix4fv(uSph.uProj, false, proj);
      gl.uniform3f(uSph.uC, vx, vy, vz);
      gl.uniform1f(uSph.uPad, pad);
      gl.uniform1f(uSph.uSquash, 1);
      gl.uniform1f(uSph.uR, radV);
      gl.uniform3f(uSph.uSun, sunVx, sunVy, sunVz);
      gl.uniform3f(uSph.uCol, body.col[0], body.col[1], body.col[2]);
      gl.uniform3f(uSph.uAtmo, body.atmo[0], body.atmo[1], body.atmo[2]);
      gl.uniform3f(uSph.uX, xx, xy, xz);
      gl.uniform3f(uSph.uY, yx, yy, yz);
      gl.uniform3f(uSph.uZ, zx, zy, zz);
      gl.uniform1f(uSph.uEmit, body.emit ? 1 : 0);
      gl.uniform1f(uSph.uPat, body.pat);
      gl.uniform1f(uSph.uTime, clock);
      gl.uniform1f(uSph.uAtmos, body.atmos || 0);
      drawQuad();
      if (body.ring) {
        var ax = Math.sin(body.axis), ay = Math.cos(body.axis), az = 0;
        var nv = dirView(ax, ay, az);
        var nl = Math.hypot(nv[0], nv[1], nv[2]) || 1;
        var outer = radV * body.ring[1];
        var padR = outer * dView / Math.sqrt(Math.max(dView * dView - outer * outer, 1e-8)) * 1.08;
        bindQuad(progRing);
        gl.uniformMatrix4fv(uRing.uProj, false, proj);
        gl.uniform3f(uRing.uC, vx, vy, vz);
        gl.uniform1f(uRing.uPad, padR);
        gl.uniform1f(uRing.uSquash, 1);
        gl.uniform3f(uRing.uN, nv[0] / nl, nv[1] / nl, nv[2] / nl);
        gl.uniform3f(uRing.uSun, sunVx, sunVy, sunVz);
        gl.uniform3f(uRing.uCol, body.ring[2], body.ring[3], body.ring[4]);
        gl.uniform1f(uRing.uR, radV);
        gl.uniform1f(uRing.uIn, radV * body.ring[0]);
        gl.uniform1f(uRing.uOut, outer);
        drawQuad();
      }
    }
    return true;
  }

  function pick(cx, cy) {
    var rect = canvas.getBoundingClientRect();
    var x = cx - rect.left, y = cy - rect.top;
    var best = -1, bestD = 1e9;
    var f = 1 / Math.tan(FOV * 0.5);
    var aspect = cssW / Math.max(1, cssH);
    for (var i = 0; i < N; i++) {
      viewOf(px[i], py[i], pz[i]);
      if (vz > -0.02) continue;
      var ndx = (f / aspect) * vx / (-vz);
      var ndy = f * vy / (-vz);
      if (ndx < -1.3 || ndx > 1.3 || ndy < -1.3 || ndy > 1.3) continue;
      var sx = (ndx * 0.5 + 0.5) * cssW;
      var sy = (-ndy * 0.5 + 0.5) * cssH;
      var distW = Math.hypot(px[i] - camX, py[i] - camY, pz[i] - camZ);
      var pr = (bodies[i].radius / Math.max(distW, 1)) * cssH * 0.95;
      var hitR = Math.max(26, pr + 8);
      var dd = Math.hypot(sx - x, sy - y);
      if (dd < hitR && dd < bestD) { bestD = dd; best = i; }
    }
    if (best < 0) return;
    if (best === focus && !ease) {
      logDist = Math.max(minLog(bodies[focus]), logDist - 0.28);
    } else {
      goTo(bodies[best].id);
    }
  }

  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("pointerdown", function (e) {
    if (e.target !== canvas) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY, moved: 0, t: performance.now() });
    if (pointers.size === 2) {
      var arr = Array.from(pointers.values());
      pinch0 = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) || 1;
      mid0 = (arr[0].y + arr[1].y) * 0.5;
      logAtPinch = logDist;
      pinching = true;
      suppressTap = true;
    }
    cancelEase();
    lastInput = performance.now();
    ensureAudio();
  });
  canvas.addEventListener("pointermove", function (e) {
    var p = pointers.get(e.pointerId);
    if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    p.moved += Math.hypot(dx, dy);
    if (pointers.size >= 2) {
      var arr = Array.from(pointers.values());
      var d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) || 1;
      var mid = (arr[0].y + arr[1].y) * 0.5;
      var zoom = -Math.log(d / pinch0) / Math.LN10;
      var fly = (mid - mid0) * 0.0034;
      logDist = logAtPinch + zoom * 1.25 + fly;
      promote();
    } else if (!pinching) {
      yaw -= dx * 0.0064;
      pitch = clamp(pitch + dy * 0.0052, -1.15, 1.15);
    }
    lastInput = performance.now();
  });
  function endPointer(e) {
    var p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinching = false;
    if (p && pointers.size === 0) {
      if (!suppressTap && p.moved < 12 && performance.now() - p.t < 340) pick(p.ox, p.oy);
      if (pointers.size === 0) suppressTap = false;
    }
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", function (e) {
    if (pointers.size >= 2) return;
    e.preventDefault();
    cancelEase();
    logDist += e.deltaY * 0.0015;
    promote();
    lastInput = performance.now();
  }, { passive: false });

  var audio = null, noiseGain = null;
  function ensureAudio() {
    if (audio) {
      if (audio.state === "suspended") audio.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      audio = new AC();
      var master = audio.createGain();
      master.gain.value = 0.045;
      var filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 420;
      filter.connect(master);
      master.connect(audio.destination);
      [82.4, 123.5, 196].forEach(function (freq, i) {
        var o = audio.createOscillator();
        o.type = "sine";
        o.frequency.value = freq;
        var g = audio.createGain();
        g.gain.value = 0.08 / (i + 1);
        o.connect(g);
        g.connect(filter);
        o.start();
      });
      var len = audio.sampleRate * 2;
      var buf = audio.createBuffer(1, len, audio.sampleRate);
      var data = buf.getChannelData(0);
      var brown = 0;
      for (var i = 0; i < len; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.04) * 0.96;
        data[i] = brown * 0.4;
      }
      var src = audio.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      noiseGain = audio.createGain();
      noiseGain.gain.value = 0.0;
      src.connect(noiseGain);
      noiseGain.connect(filter);
      src.start();
    } catch (err) { audio = null; }
  }

  var prevLog = logDist;
  var clockLast = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - clockLast) / 1000);
    clockLast = now;
    clock += dt;
    worldAll();
    if (!ease && pointers.size === 0 && now - lastInput > 2200) yaw += dt * 0.016;
    if (ease) stepEase(dt);
    else {
      syncOrbit();
      if (pointers.size === 0) promote();
    }
    var flew = Math.abs(logDist - prevLog) / Math.max(dt, 0.016);
    prevLog = logDist;
    if (noiseGain && audio) {
      var target = flew > 0.35 ? 0.12 : 0.012;
      noiseGain.gain.setTargetAtTime(target, audio.currentTime, 0.15);
    }
    var ok = false;
    try { ok = draw(); } catch (err) { console.error(err); }
    if (ok) {
      drawn++;
      setHud();
      if (!sentReady && drawn >= 1 && window.__gbSandbox && typeof window.__gbSandbox.ready === "function") {
        sentReady = true;
        try { window.__gbSandbox.ready(); } catch (e2) {}
      }
    }
    requestAnimationFrame(frame);
  }

  frameOpening();
  syncOrbit();
  if (!bootGl()) {
    whereEl.textContent = "WebGL2 is unavailable on this device";
  }
  requestAnimationFrame(frame);
})();
