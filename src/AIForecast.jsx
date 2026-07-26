import React, { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * AIForecast — the "Ask AI" card for "other"-category wants.
 * Color scheme: amber (dark yellow) as the card accent, matching the rest
 * of your app's warm palette — no purple, no green. Trend uses brown/rust
 * for a rising price (caution) and plain gray for falling or flat.
 *
 * Drop into ItemDetail:
 *   {v.item.cat === "other" && <AIForecast want={v.item} C={C} Icon={Icon} Btn={Btn} />}
 */
export function AIForecast({ want, C, Icon, Btn }) {
  const usage = useQuery(api.ai.getUsage);
  const predictPrice = useAction(api.ai.predictPrice);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const saved = want.aiForecast;
  const remaining = usage ? usage.limit - usage.used : null;

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      await predictPrice({ wantId: want._id, itemName: want.name, price: want.price });
    } catch (err) {
      setError(err?.message || "Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  };

  const trendGlyph = { up: "▲", down: "▼", flat: "→" };
  // simple, mainstream palette: rising = brown/rust (caution), falling/flat = gray
  const trendColor = { up: C.clay, down: C.sub, flat: C.sub };

  return (
    <div style={{ padding: "12px 14px 4px" }}>
      <div style={{ background: C.amberBg, borderRadius: 14, padding: "13px 15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon n="spark" c={C.amberD} s={18} />
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: C.amberD, flex: 1 }}>
            AI forecast
          </p>
          {usage && (
            <span style={{ fontSize: 11, color: C.amberD, opacity: 0.8 }}>
              {remaining} of {usage.limit} left today
            </span>
          )}
        </div>

        {saved && !loading && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 500, color: trendColor[saved.trend] }}>
              {trendGlyph[saved.trend]} {saved.pctChange6mo > 0 ? "+" : ""}{saved.pctChange6mo.toFixed(0)}%
              <span style={{ fontSize: 12, fontWeight: 400, color: C.amberD, marginLeft: 8 }}>
                over 6 months
              </span>
            </p>
            <p style={{ margin: "0 0 6px", fontSize: 12.5, lineHeight: 1.45, color: C.amberD }}>
              {saved.reasoning}
            </p>
            <span style={{ fontSize: 10.5, fontWeight: 500, color: C.amberD, background: "#FAEEDA",
              padding: "2px 8px", borderRadius: 20 }}>
              {saved.confidence} confidence
            </span>
          </div>
        )}

        {!saved && !loading && (
          <p style={{ margin: "0 0 10px", fontSize: 12.5, lineHeight: 1.45, color: C.amberD }}>
            The structural model has no pattern to go on for this one. An AI guess is a
            different kind of estimate — worth a look, not a certainty.
          </p>
        )}

        {loading && (
          <p style={{ margin: "0 0 10px", fontSize: 12.5, color: C.amberD }}>Thinking…</p>
        )}

        {error && (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: C.clay }}>{error}</p>
        )}

        <Btn
          onClick={generate}
          disabled={loading || (usage && remaining <= 0)}
          style={{ background: C.amberD, color: "#fff", fontSize: 13, padding: "9px 14px" }}
        >
          {loading ? "Generating…"
            : usage && remaining <= 0 ? "Come back tomorrow"
            : saved ? "Regenerate forecast" : "Ask AI for a forecast"}
        </Btn>

        <p style={{ margin: "8px 0 0", fontSize: 10.5, color: C.amberD, opacity: 0.7 }}>
          AI estimate — not financial advice.
        </p>
      </div>
    </div>
  );
}
