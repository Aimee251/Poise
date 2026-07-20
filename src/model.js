// Poise decision model — JS port of buywindow.py. Pure functions, no React.
/// price prediction graph
import { PriceForecastChart } from "./PriceForecastChart.jsx";
import { forecastFor } from "./model.js";

const fc = forecastFor(item);
<PriceForecastChart forecast={fc} />
///

export const WKM = 4.345;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export const CATS = {
  luxury: { label: "Luxury", note: (f) => `brand raises ~${Math.round(f.muH * 100)}% per hike, next in ~${Math.round(f.hikeWk / WKM)} mo` },
  tech: { label: "Tech", note: (f) => `drops ~${Math.round(f.deltaMo * 100)}%/mo, ~${Math.round(f.cliff * 100)}% cliff at the next release` },
  seasonal: { label: "Seasonal", note: () => "a sale trough usually lands around the holidays" },
  other: { label: "Other", note: () => "no clear price pattern — forecasting today's price" },
};

export function forecastFor(item, T = 26) {
  const p0 = item.price;
  const t = Array.from({ length: T + 1 }, (_, i) => i);
  if (item.cat === "luxury") {
    const muH = 0.07, se = 0.015, hikeWk = 13, win = 6;
    const q = t.map((w) => clamp((w - (hikeWk - win / 2)) / win, 0, 1));
    return {
      cat: "luxury", conf: "medium", muH, hikeWk,
      mean: q.map((x) => p0 * (1 + x * muH)),
      lo: q.map((x) => p0 * (1 + x * Math.max(0, muH - 2 * se))),
      hi: q.map((x) => p0 * (1 + x * (muH + 2 * se)))
    };
  }
  if (item.cat === "tech") {
    const dWk = 0.006, cliff = 0.15, relWk = 10, deltaMo = 1 - Math.exp(-dWk * WKM);
    const mean = t.map((w) => p0 * Math.exp(-dWk * w) * (w >= relWk ? 1 - cliff : 1));
    return {
      cat: "tech", conf: "high", deltaMo, cliff, mean,
      lo: mean.map((m, i) => m / (1 + 0.02 * Math.sqrt(t[i]))),
      hi: mean.map((m, i) => m * (1 + 0.02 * Math.sqrt(t[i])))
    };
  }
  if (item.cat === "seasonal") {
    const mean = t.map((w) => p0 * (1 - 0.06 * Math.sin((w / T) * Math.PI)));
    return {
      cat: "seasonal", conf: "medium", mean,
      lo: mean.map((m) => m * 0.95), hi: mean.map((m) => m * 1.05)
    };
  }
  const band = t.map((w) => 2 * 0.01 * Math.sqrt(w) * p0);
  return {
    cat: "other", conf: "low", mean: t.map(() => p0),
    lo: t.map((_, i) => p0 - band[i]), hi: t.map((_, i) => p0 + band[i])
  };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng) {
  let u = 0, v = 0;
  while (!u) u = rng(); while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// population-level priors (SFS/JPMCI-style); user data refines later
const PRIORS = { sigmaIncome: 0.15, pShockM: 0.08, shockMean: 400, pGapM: 0.03 };

export function distressCurve(fin, priceAt, opts = {}) {
  const { T = 26, months = 12, paths = 900, bufferMonths = 1, seed = 7 } = opts;
  const rng = mulberry32(seed);
  const net = [];
  for (let p = 0; p < paths; p++) {
    const row = new Float64Array(months);
    for (let m = 0; m < months; m++) {
      let inc = fin.income * (1 + PRIORS.sigmaIncome * gauss(rng));
      if (rng() < PRIORS.pGapM) inc *= 0.4;
      const shock = rng() < PRIORS.pShockM ? -Math.log(1 - rng()) * PRIORS.shockMean : 0;
      row[m] = inc - fin.burn - shock;
    }
    net.push(row);
  }
  const weeklyDisp = Math.max(0, fin.income - fin.burn) / WKM;
  const floor = bufferMonths * fin.burn;
  const pi = new Array(T + 1);
  for (let t = 0; t <= T; t++) {
    const start = fin.savings + weeklyDisp * t - priceAt[t];
    let hits = 0;
    for (let p = 0; p < paths; p++) {
      let bal = start, broke = false;
      const row = net[p];
      for (let m = 0; m < months; m++) { bal += row[m]; if (bal < floor) { broke = true; break; } }
      if (broke) hits++;
    }
    pi[t] = hits / paths;
  }
  return pi;
}

export function whenToBuy(fin, item, settings) {
  const T = 26;
  const fc = forecastFor(item, T);
  const pi = distressCurve(fin, fc.mean, { T, bufferMonths: settings.bufferMonths });
  const solve = (path) => {
    let tReady = null;
    for (let t = 0; t <= T; t++) if (pi[t] <= settings.piMax) { tReady = t; break; }
    if (tReady === null) return { tReady: null, tStar: null };
    let tStar = tReady, best = Infinity;
    for (let t = tReady; t <= T; t++) {
      const J = path[t] + settings.kappaWk * t;
      if (J < best) { best = J; tStar = t; }
    }
    return { tReady, tStar };
  };
  const { tReady, tStar } = solve(fc.mean);
  if (tReady === null)
    return { action: "not_yet", fc, pi, piNow: pi[0], tReady, tStar, window: [], firm: true, costOfNow: 0 };
  const J = (t) => fc.mean[t] + settings.kappaWk * t;
  const window = [];
  for (let t = tReady; t <= T; t++) if (J(t) <= J(tStar) + 25) window.push(t);
  const costOfNow = J(0) - J(tStar) + (pi[0] - pi[tStar]) * fc.mean[0];
  const firm = solve(fc.lo).tStar === tStar && solve(fc.hi).tStar === tStar;
  return {
    action: tStar === 0 ? "buy_now" : "wait", fc, pi, piNow: pi[0],
    piStar: pi[tStar], tReady, tStar, window, firm, costOfNow
  };
}

export const tierOf = (v) =>
  v.action === "not_yet" ? "notyet" : v.action === "buy_now" ? "ready" : "stretch";
