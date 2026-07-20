import React from "react";

/**
 * PriceForecastChart — draws a price forecast over time with its
 * confidence band. Self-contained: no imports from your other files,
 * so you can drop this in without touching anything else.
 *
 * Usage:
 *   import { PriceForecastChart } from "./PriceForecastChart.jsx";
 *   import { forecastFor } from "./model.js";
 *
 *   const fc = forecastFor(item);       // { mean, lo, hi, conf, cat, ... }
 *   <PriceForecastChart forecast={fc} />
 */
export function PriceForecastChart({ forecast, height = 170 }) {
  const { mean, lo, hi, conf } = forecast;
  const T = mean.length - 1;
  const W = 322, Hh = height, x0 = 30, x1 = W - 8, y0 = Hh - 24, y1 = 16;

  const mx = (t) => x0 + (t / T) * (x1 - x0);
  const allVals = [...mean, ...lo, ...hi];
  const pMin = Math.min(...allVals) * 0.97;
  const pMax = Math.max(...allVals) * 1.03;
  const py = (p) => y0 - ((p - pMin) / Math.max(1, pMax - pMin)) * (y0 - y1) * 0.7 - (y0 - y1) * 0.1;

  const linePts = mean.map((p, t) => `${mx(t).toFixed(1)},${py(p).toFixed(1)}`).join(" ");
  const bandTop = hi.map((p, t) => `${mx(t).toFixed(1)},${py(p).toFixed(1)}`);
  const bandBot = lo.map((p, t) => `${mx(t).toFixed(1)},${py(p).toFixed(1)}`).reverse();
  const bandPath = [...bandTop, ...bandBot].join(" ");

  const money = (n) => "$" + Math.round(n).toLocaleString();

  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" role="img"
      aria-label={`Forecast price path with ${conf} confidence band over the next ${T} weeks.`}>
      {/* axis */}
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="#E4E0D7" strokeWidth="1" />
      <text x={x0} y={Hh - 6} fill="#B4B2A9" fontSize="9.5">now</text>
      <text x={x1} y={Hh - 6} fill="#B4B2A9" fontSize="9.5" textAnchor="end">{T} wk</text>

      {/* confidence band */}
      <polygon points={bandPath} fill="#BA7517" opacity="0.15" />
      <text x={x0 + 2} y={py(pMax) + 2} fill="#854F0B" fontSize="8.5" opacity="0.8">
        {conf} confidence
      </text>

      {/* price line */}
      <polyline points={linePts} fill="none" stroke="#BA7517" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <text x={x1 - 2} y={py(mean[T]) - 6} fill="#854F0B" fontSize="10" fontWeight="500"
        textAnchor="end">price</text>

      {/* price scale labels */}
      <text x={2} y={py(pMax) + 6} fill="#B4B2A9" fontSize="8.5">{money(pMax)}</text>
      <text x={2} y={y0} fill="#B4B2A9" fontSize="8.5">{money(pMin)}</text>
    </svg>
  );
}
