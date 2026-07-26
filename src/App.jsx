import React, { useState, useMemo, useRef } from "react";
import { Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import SignIn from "./login.jsx";
import { CATS, whenToBuy, tierOf } from "./model.js";
import { PriceForecastChart } from "./PriceForecastChart.jsx";
import { SketchIntro } from "./SketchIntro.jsx";
import CALENDAR_IMG from "../calendar.PNG";
import LUXURY_IMG from "../luxury.PNG";
import TECH_IMG from "../tech.PNG";

const CAT_IMAGES = {
  luxury: LUXURY_IMG,
  tech: TECH_IMG,
  seasonal: CALENDAR_IMG,
};

const getItemImage = (item) => item.imageUrl || CAT_IMAGES[item.cat];

/** Poise — full stack. Auth gate -> (no profile? onboarding) -> app.
 *  profiles/wants/plans live in Convex; every write recomputes verdicts
 *  reactively because useQuery re-renders on any change. */

// ---------- design tokens -------------------------------------------------
const C = {
  bg: "#F8F7F4", card: "#FFFFFF", ink: "#1A1815", sub: "#635D54",
  line: "#E8E5DF", jade: "#1D9E75", jadeD: "#0F6E56", jadeBg: "#E1F1EA",
  amber: "#BA7517", amberD: "#854F0B", amberBg: "#F6EAD4",
  clay: "#9A3B23", clayBg: "#F3E2DB", accent: "#4A3F86", accentBg: "#EAE7F5",
  dark: "#161412", paper: "#EFE9DC", mint: "#5DCAA5", gold: "#D8B36A",
};
const SERIF = "Fraunces, Georgia, serif";
const SANS = "'Josefin Sans', -apple-system, system-ui, sans-serif";
const money = (n) => "$" + Math.round(n).toLocaleString();
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const TIER = {
  ready:   { fg: C.jadeD, bg: C.jadeBg, label: "Ready" },
  stretch: { fg: C.amberD, bg: C.amberBg, label: "Wait" },
  notyet:  { fg: C.clay, bg: C.clayBg, label: "Not yet" },
};

// ---------- icons ----------------------------------------------------------
const P = {
  bag: "M6 7h12l-1 13H7L6 7zM9 7V5a3 3 0 016 0v2",
  device: "M4 4h16v12H4zM2 20h20M9 20v-4M15 20v-4",
  gift: "M20 12v8H4v-8M2 7h20v5H2zM12 7v13",
  bell: "M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0",
  back: "M19 12H5M11 6l-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  home: "M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  chart: "M4 19V5M4 19h16M8 15l3-4 3 2 4-6",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0",
  spark: "M12 3l1.9 5.6L19 10l-5.1 1.4L12 17l-1.9-5.6L5 10l5.1-1.4z",
  clock: "M12 8v4l3 2M4 12a8 8 0 1016 0 8 8 0 00-16 0z",
  check: "M5 13l4 4L19 7",
  info: "M12 16v-4M12 8h.01M4 12a8 8 0 1016 0 8 8 0 00-16 0z",
  link: "M10 14a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1",
  out: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
};
const Icon = ({ n, c = C.sub, s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
);
const GLYPH = { luxury: "bag", tech: "device", seasonal: "gift", other: "gift" };

// ---------- shared ----------------------------------------------------------
const Btn = ({ children, onClick, variant = "dark", full, disabled, style }) => {
  const v = variant === "dark" ? { background: C.ink, color: C.bg }
    : variant === "gold" ? { background: C.gold, color: "#1E1B16", boxShadow: "0 0 16px rgba(216, 179, 106, 0.45), 0 4px 14px rgba(216, 179, 106, 0.3)" }
    : variant === "light" ? { background: C.card, color: C.ink, border: `1px solid ${C.line}` }
    : { background: "transparent", color: C.sub };
  return <button onClick={onClick} disabled={disabled} style={{ border: "none", borderRadius: 13,
    padding: "13px 16px", fontSize: 15, fontWeight: 500, cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1, fontFamily: SANS, width: full ? "100%" : "auto", ...v, ...style }}>{children}</button>;
};
const Field = ({ label, value, onChange, prefix, type = "number", placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 13, color: C.sub, display: "block", marginBottom: 6 }}>{label}</label>
    <div style={{ display: "flex", alignItems: "center", background: C.card,
      border: `1px solid ${C.line}`, borderRadius: 12, padding: "0 14px" }}>
      {prefix && <span style={{ color: C.sub, fontSize: 16 }}>{prefix}</span>}
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ border: "none", background: "transparent", padding: "13px 8px", fontSize: 16,
          width: "100%", outline: "none", color: C.ink, fontFamily: SANS }} />
    </div>
  </div>
);
const Chip = ({ tier }) => (
  <span style={{ fontSize: 12, fontWeight: 500, color: TIER[tier].fg, background: TIER[tier].bg,
    padding: "4px 11px", borderRadius: 20, whiteSpace: "nowrap" }}>{TIER[tier].label}</span>
);
const H = ({ children }) => (
  <p style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: C.ink, margin: "20px 0 12px" }}>{children}</p>
);
const Dots = ({ step }) => (
  <div style={{ display: "flex", gap: 7, justifyContent: "center", padding: "6px 0 2px" }}>
    {[0, 1, 2].map((i) => (
      <span key={i} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: 7,
        background: i === step ? C.ink : C.line }} />
    ))}
  </div>
);

// ---------- onboarding (writes the profile via Convex mutation) ------------
function Onboarding() {
  const upsert = useMutation(api.profiles.upsert);
  const addWant = useMutation(api.wants.add);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [burn, setBurn] = useState("");
  const [savings, setSavings] = useState("");
  const [risk, setRisk] = useState(null);
  const [wantName, setWantName] = useState("");
  const [wantPrice, setWantPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    await upsert({ name: name.trim(), income: +income || 0, burn: +burn || 0,
      savings: +savings || 0, piMax: risk, kappaWk: 0, bufferMonths: 1 });
    if (wantName.trim() && +wantPrice > 0)
      await addWant({ name: wantName.trim(), price: +wantPrice, cat: "luxury" });
    // profiles.get flips from null -> profile; App re-renders into the app
  };

  const OPTIONS = [
    { piMax: 0.05, title: "Keep me safe", sub: "Only 'ready' when a crunch is very unlikely (5%)" },
    { piMax: 0.10, title: "Balanced", sub: "The sensible default — under 10% crunch risk" },
    { piMax: 0.20, title: "I can handle it", sub: "More risk, sooner wants (20%)" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 22px 20px", overflowY: "auto" }}>
      <Dots step={step} />
      {step === 0 && (<>
        <p style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: C.ink, margin: "24px 0 4px" }}>
          What should we call you?</p>
        <p style={{ fontSize: 14, color: C.sub, margin: "0 0 22px", lineHeight: 1.5 }}>
          This is how the app greets you.</p>
        <Field label="Your name" type="text" value={name} onChange={setName} placeholder="Your name" />
        <div style={{ flex: 1 }} />
        <Btn full disabled={!name.trim()} onClick={() => setStep(1)}>Continue</Btn>
      </>)}
      {step === 1 && (<>
        <p style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: C.ink, margin: "24px 0 4px" }}>
          Your baseline</p>
        <p style={{ fontSize: 14, color: C.sub, margin: "0 0 22px", lineHeight: 1.5 }}>
          Three numbers — estimates are fine. Every verdict is simulated from these.
          No bank connection needed.</p>
        <Field label="Monthly income, all sources" prefix="$" value={income} onChange={setIncome} placeholder="2600" />
        <Field label="Monthly fixed expenses" prefix="$" value={burn} onChange={setBurn} placeholder="1700" />
        <Field label="Current savings" prefix="$" value={savings} onChange={setSavings} placeholder="3000" />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="light" onClick={() => setStep(0)}>Back</Btn>
          <Btn full disabled={income === "" || burn === "" || savings === ""}
            onClick={() => setStep(2)}>Continue</Btn>
        </div>
      </>)}
      {step === 2 && (<>
        <p style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: C.ink, margin: "24px 0 4px" }}>
          How cautious should we be?</p>
        <p style={{ fontSize: 14, color: C.sub, margin: "0 0 14px", lineHeight: 1.5 }}>
          A choice, not our opinion — change it anytime in Profile.</p>
        {OPTIONS.map((o) => (
          <div key={o.piMax} onClick={() => setRisk(o.piMax)} style={{ background: C.card,
            border: `${risk === o.piMax ? 2 : 1}px solid ${risk === o.piMax ? C.ink : C.line}`,
            borderRadius: 14, padding: "12px 15px", marginBottom: 9, cursor: "pointer" }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, color: C.ink }}>{o.title}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: C.sub }}>{o.sub}</p>
          </div>
        ))}
        <p style={{ fontSize: 13.5, fontWeight: 500, color: C.ink, margin: "12px 0 8px" }}>
          One thing you've been eyeing <span style={{ color: C.sub, fontWeight: 400 }}>(optional)</span></p>
        <Field label="What is it?" type="text" value={wantName} onChange={setWantName} placeholder="Leather tote" />
        <Field label="Roughly how much?" prefix="$" value={wantPrice} onChange={setWantPrice} placeholder="1850" />
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn variant="light" onClick={() => setStep(1)}>Back</Btn>
          <Btn full disabled={risk === null || busy} onClick={finish}>
            {busy ? "Setting up…" : wantName.trim() ? "Run my first verdict" : "Take me in"}
          </Btn>
        </div>
      </>)}
    </div>
  );
}

// ---------- app screens (Convex-backed) -------------------------------------
function Home({ profile, verdicts, plans, onOpen, onAdd, onFinancing }) {
  const sortedByOpens = [...verdicts].sort((a, b) => {
    const viewsA = a.item.views ?? 0;
    const viewsB = b.item.views ?? 0;
    if (viewsB !== viewsA) return viewsB - viewsA;
    return (b.item.lastOpenedAt ?? 0) - (a.item.lastOpenedAt ?? 0);
  });

  const waiting = verdicts.filter((v) => v.action === "wait").sort((a, b) => a.tStar - b.tStar);
  const hero = (sortedByOpens[0]?.item.views ?? 0) > 0 ? sortedByOpens[0] : (waiting[0] || verdicts[0]);
  const rest = verdicts.filter((v) => v.item._id !== hero?.item._id);
  const owed = plans.reduce((s, p) => s + p.installment * p.remaining, 0);
  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "0 16px", position: "relative",
      background: "radial-gradient(ellipse at 50% 15%, rgba(245, 235, 218, 0.7) 0%, rgba(248, 247, 244, 1) 75%)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 2px 12px" }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: C.sub }}>Good evening</p>
          <p style={{ margin: 0, fontSize: 19, fontWeight: 500, color: C.ink }}>{profile.name}</p>
        </div>
        <Icon n="bell" s={20} />
      </div>

      {verdicts.length === 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
          padding: "22px 18px", textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500, color: C.ink }}>
            What have you been eyeing?</p>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: C.sub, lineHeight: 1.5 }}>
            Add it and we'll run the honest numbers.</p>
          <Btn onClick={onAdd}>Add your first want</Btn>
        </div>
      )}

      {hero && (<>
        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "4px 2px 8px" }}>
          <Icon n="spark" c={C.gold} s={16} />
          <p style={{ margin: 0, fontSize: 13, color: C.ink, fontWeight: 500 }}>The one you keep opening</p>
        </div>
        <div onClick={() => onOpen(hero.item._id)} style={{ background: C.dark, borderRadius: 18,
          padding: 20, cursor: "pointer", border: "1px solid rgba(216, 179, 106, 0.35)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.35), 0 0 20px rgba(216, 179, 106, 0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontFamily: SERIF, fontSize: 23, fontWeight: 500, color: C.bg }}>{hero.item.name}</p>
              <p style={{ margin: "3px 0 0", fontSize: 15, color: "#B7B0A4" }}>{money(hero.item.price)}</p>
            </div>
            {getItemImage(hero.item) ? (
              <img src={getItemImage(hero.item)} alt={hero.item.name} style={{ width: 58, height: 58, borderRadius: 14, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 58, height: 58, borderRadius: 14, background: "#2E2A22",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon n={GLYPH[hero.item.cat] || "gift"} c={C.gold} s={24} />
              </div>
            )}
          </div>
          {hero.action === "wait" ? (<>
            <div style={{ margin: "18px 0 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 12.5, color: "#B7B0A4" }}>Weeks to your buy window</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: C.mint }}>{hero.tStar} wk</span>
              </div>
              <div style={{ height: 7, background: "#3A362D", borderRadius: 20 }}>
                <div style={{ height: "100%", width: `${clamp(100 - (hero.tStar / 26) * 100, 4, 100)}%`,
                  background: C.mint, borderRadius: 20 }} />
              </div>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.5, color: C.paper }}>
              About {hero.tStar} week{hero.tStar !== 1 ? "s" : ""} and this turns{" "}
              <span style={{ color: C.mint, fontWeight: 500 }}>ready</span> — crunch risk drops{" "}
              {Math.round(hero.piNow * 100)}% → {Math.round(hero.piStar * 100)}%.
            </p>
          </>) : hero.action === "buy_now" ? (
            <p style={{ margin: "14px 0 0", fontSize: 14, color: C.mint, fontWeight: 500 }}>
              Good to buy today — crunch risk is safe at {Math.round(hero.piNow * 100)}%.
            </p>
          ) : (
            <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.5, color: C.paper }}>
              Honest read: out of reach at your current baseline. Not a waiting problem.</p>
          )}
        </div>
      </>)}

      {rest.length > 0 && (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 2px 10px" }}>
          <p style={{ margin: 0, fontSize: 13, color: C.sub }}>Also on your list</p>
          <span onClick={onAdd} style={{ fontSize: 12.5, color: C.jadeD, fontWeight: 500, cursor: "pointer" }}>+ Add a want</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {rest.map((v) => (
            <div key={v.item._id} onClick={() => onOpen(v.item._id)} style={{ background: C.card,
              border: `1px solid ${C.line}`, borderRadius: 14, padding: 13, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                {getItemImage(v.item) ? (
                  <img src={getItemImage(v.item)} alt={v.item.name} style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} />
                ) : (
                  <Icon n={GLYPH[v.item.cat] || "gift"} s={20} />
                )}
                <Chip tier={tierOf(v)} />
              </div>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, color: C.ink }}>{v.item.name}</p>
              <p style={{ margin: "1px 0 0", fontSize: 12.5, color: C.sub }}>{money(v.item.price)}</p>
            </div>
          ))}
        </div>
      </>)}

      <div onClick={onFinancing} style={{ background: C.card, border: `1px solid ${C.amberBg}`,
        borderRadius: 16, padding: "15px 17px", margin: "14px 0 10px", cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: plans.length ? 8 : 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.ink }}>Financing tracker</p>
          <span style={{ fontSize: 12.5, color: C.sub }}>{plans.length} active plan{plans.length !== 1 ? "s" : ""}</span>
        </div>
        {plans.length > 0 && (
          <p style={{ margin: 0, fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: C.ink }}>
            {money(owed)} <span style={{ fontFamily: SANS, fontSize: 11, color: C.sub, fontWeight: 400 }}>still owed</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Wishlist({ verdicts, onOpen, onAdd, onRemove }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <H>Your wishlist</H>
        <span onClick={onAdd} style={{ fontSize: 12.5, color: C.jadeD, fontWeight: 500, cursor: "pointer" }}>+ Add</span>
      </div>
      {verdicts.length === 0 && (
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.5 }}>
          Nothing here yet. Add the thing you keep thinking about.</p>
      )}
      {verdicts.map((v, i) => (
        <div key={v.item._id} onClick={() => onOpen(v.item._id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0",
          cursor: "pointer", borderBottom: i < verdicts.length - 1 ? `1px solid ${C.line}` : "none" }}>
          {getItemImage(v.item) ? (
            <img src={getItemImage(v.item)} alt={v.item.name} style={{ width: 52, height: 52, borderRadius: 14, objectFit: "contain" }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: 14,
              background: TIER[tierOf(v)].bg, display: "flex", alignItems: "center",
              justifyContent: "center" }}>
              <Icon n={GLYPH[v.item.cat] || "gift"} c={TIER[tierOf(v)].fg} s={22} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.ink }}>{v.item.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: C.sub }}>
              {money(v.item.price)}{v.action === "wait" ? ` · ~${v.tStar} wk` : ""}</p>
          </div>
          <Chip tier={tierOf(v)} />
          <span onClick={(e) => { e.stopPropagation(); onRemove(v.item._id); }} aria-label="Remove"
            style={{ fontSize: 20, color: C.sub, cursor: "pointer", padding: "4px 6px" }}>×</span>
        </div>
      ))}
    </div>
  );
}

function BuyWindowChart({ v }) {
  const T = 26, W = 322, Hh = 150, x0 = 26, x1 = W - 8, y0 = Hh - 24, y1 = 14;
  const mx = (t) => x0 + (t / T) * (x1 - x0);
  const pMin = Math.min(...v.fc.mean) * 0.97, pMax = Math.max(...v.fc.mean) * 1.03;
  const py = (p) => y0 - ((p - pMin) / Math.max(1, pMax - pMin)) * (y0 - y1) * 0.7 - (y0 - y1) * 0.15;
  const ry = (x) => y0 - (1 - x) * (y0 - y1);
  const rPts = v.pi.map((x, t) => `${mx(t).toFixed(1)},${ry(x).toFixed(1)}`).join(" ");
  const pPts = v.fc.mean.map((p, t) => `${mx(t).toFixed(1)},${py(p).toFixed(1)}`).join(" ");
  const wA = v.window.length ? mx(v.window[0]) : null;
  const wB = v.window.length ? mx(v.window[v.window.length - 1]) : null;
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" role="img"
      aria-label="Safety rises over time while the price path shifts; the shaded band is the buy window.">
      {wA !== null && <rect x={wA} y={y1} width={Math.max(6, wB - wA)} height={y0 - y1} fill={C.jadeBg} />}
      {wA !== null && <text x={(wA + wB) / 2} y={y1 - 3} fill={C.jadeD} fontSize="10.5"
        fontWeight="500" textAnchor="middle" fontFamily={SANS}>buy window</text>}
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={C.line} strokeWidth="1" />
      <text x={x0} y={Hh - 6} fill="#B4B2A9" fontSize="9.5" fontFamily={SANS}>now</text>
      <text x={x1} y={Hh - 6} fill="#B4B2A9" fontSize="9.5" textAnchor="end" fontFamily={SANS}>6 mo</text>
      <polyline points={rPts} fill="none" stroke={C.jade} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x={x0 + 4} y={ry(v.pi[0]) - 7} fill={C.jadeD} fontSize="10" fontWeight="500" fontFamily={SANS}>safety</text>
      <polyline points={pPts} fill="none" stroke={C.amber} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x={x1 - 2} y={py(v.fc.mean[T]) - 6} fill={C.amberD} fontSize="10" fontWeight="500"
        textAnchor="end" fontFamily={SANS}>price</text>
    </svg>
  );
}

function ItemDetail({ v, settings, onBack, onWatch }) {
  const t = tierOf(v);
  const verdictText = v.action === "buy_now" ? "Buy anytime"
    : v.action === "wait" ? `Wait ~${v.tStar} week${v.tStar !== 1 ? "s" : ""}` : "Not yet";
  const why = v.action === "buy_now"
    ? `You can absorb this — crunch risk stays at ${Math.round(v.piNow * 100)}%.`
    : v.action === "wait"
    ? `Buying today puts crunch risk at ${Math.round(v.piNow * 100)}%. At the window it's ${Math.round(v.piStar * 100)}% — waiting is worth ≈ ${money(v.costOfNow)}.`
    : `No week in the next 6 months gets crunch risk under ${Math.round(settings.piMax * 100)}%. This isn't a waiting problem — it's out of reach at your current baseline.`;
  const noteFn = CATS[v.fc.cat]?.note;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px 8px" }}>
        <span onClick={onBack} style={{ cursor: "pointer" }}><Icon n="back" c={C.ink} /></span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.ink }}>{v.item.name}</p>
          <p style={{ margin: "1px 0 0", fontSize: 13, color: C.sub }}>{money(v.item.price)} today</p>
        </div>
        <Chip tier={t} />
      </div>
      <div style={{ padding: "6px 14px 0" }}>
        <div style={{ background: C.dark, borderRadius: 18, padding: "20px 22px", border: "1px solid rgba(216, 179, 106, 0.35)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.35), 0 0 20px rgba(216, 179, 106, 0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Icon n="clock" c={C.gold} s={18} />
                <span style={{ fontSize: 12.5, color: C.gold, fontWeight: 500 }}>The call</span>
              </div>
              <p style={{ margin: "0 0 4px", fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: C.gold }}>{verdictText}</p>
            </div>
            {getItemImage(v.item) && (
              <img src={getItemImage(v.item)} alt={v.item.name} style={{ width: 64, height: 64, borderRadius: 14, objectFit: "contain" }} />
            )}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.paper }}>{why}</p>
          {!v.firm && (
            <p style={{ margin: "10px 0 0", fontSize: 12.5, color: C.gold }}>
              Close call — the timing shifts within the forecast's uncertainty.</p>
          )}
        </div>
      </div>
      {v.action !== "not_yet" && (<>
        <div style={{ padding: "16px 18px 4px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500, color: C.ink }}>Your buy window</p>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: C.sub }}>where you're safe — and the price is still right</p>
        </div>
        <div style={{ padding: "0 12px" }}><BuyWindowChart v={v} /></div>
      </>)}
      <div style={{ padding: "12px 14px 4px" }}>
        <div style={{ background: C.amberBg, borderRadius: 14, padding: "13px 15px" }}>
          <div style={{ display: "flex", gap: 11, marginBottom: 8 }}>
            <Icon n="chart" c={C.amberD} s={20} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: C.amberD }}>Price forecast</p>
                <span style={{ fontSize: 11, fontWeight: 500, color: C.amberD, background: "#FAEEDA",
                  padding: "2px 8px", borderRadius: 20 }}>{v.fc.conf} confidence</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, lineHeight: 1.45, color: C.amberD }}>
                {noteFn ? noteFn(v.fc) : ""}</p>
            </div>
          </div>
          <PriceForecastChart forecast={v.fc} />
        </div>
      </div>
      <div style={{ padding: "12px 16px 20px" }}>
        <Btn full onClick={onWatch}>
          {v.item.watching ? "Watching — stop reminders"
            : v.action === "wait" ? "Remind me at the window" : "Watch this"}
        </Btn>
      </div>
    </div>
  );
}

function Financing({ plans, onBack, onConnect, onRemove }) {
  const owed = plans.reduce((s, p) => s + p.installment * p.remaining, 0);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 0" }}>
        <span onClick={onBack} style={{ cursor: "pointer" }}><Icon n="back" c={C.ink} /></span>
        <H>Financing</H>
      </div>
      {plans.length > 0 && (
        <div style={{ background: C.dark, borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: "#B7B0A4" }}>Still owed across {plans.length} plans</p>
          <p style={{ margin: "2px 0 0", fontFamily: SERIF, fontSize: 28, fontWeight: 500, color: C.bg }}>{money(owed)}</p>
        </div>
      )}
      {plans.length === 0 && (
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.5, margin: "4px 0 16px" }}>
          No financing plans connected yet.</p>
      )}
      {plans.map((p) => (
        <div key={p._id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
          padding: "13px 15px", marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.ink }}>{p.provider} · {p.itemName}</p>
              <span style={{ fontSize: 12.5, color: p.apr > 0 ? C.clay : C.sub }}>
                {p.apr > 0 ? `${p.apr}% APR` : "0% (pay-in-4)"}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: C.sub }}>
              {money(p.installment)} × {p.remaining} left · next {p.nextDue}</p>
          </div>
          <button onClick={(e) => {
            console.log("× button onClick fired for plan ID:", p._id);
            onRemove(p._id);
          }} aria-label={`Remove ${p.provider} plan`}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: C.sub,
              fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      ))}
      <Btn full onClick={onConnect} style={{ margin: "6px 0 12px" }}>Connect an account</Btn>
      <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
        Plan payments fold into your fixed expenses, so every verdict already carries them.</p>
    </div>
  );
}

// ---------- provider catalog + the connect-accounts picker -----------------
const PROVIDER_CATALOG = {
  Klarna:   { itemName: "ASOS order", installment: 31, remaining: 2, nextDue: "2026-07-20", apr: 0 },
  Afterpay: { itemName: "Sneakers", installment: 47, remaining: 3, nextDue: "2026-07-15", apr: 0 },
  Affirm:   { itemName: "Laptop financing", installment: 89, remaining: 6, nextDue: "2026-07-25", apr: 15 },
};

function ConnectAccounts({ connectedProviders, onBack, onConnect }) {
  const [selected, setSelected] = useState([]);
  const toggle = (provider) => {
    setSelected((s) => s.includes(provider) ? s.filter((p) => p !== provider) : [...s, provider]);
  };
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 0" }}>
        <span onClick={onBack} style={{ cursor: "pointer" }}><Icon n="back" c={C.ink} /></span>
        <H>Connect an account</H>
      </div>
      <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, margin: "0 0 16px" }}>
        Demo mode — pick the providers you'd like to connect. Already-connected
        ones are locked so you can't add duplicates.
      </p>
      {Object.entries(PROVIDER_CATALOG).map(([provider, demo]) => {
        const already = connectedProviders.includes(provider);
        const checked = selected.includes(provider);
        return (
          <div key={provider} onClick={() => !already && toggle(provider)}
            style={{ display: "flex", alignItems: "center", gap: 12,
              background: already ? C.line : C.card,
              border: `${checked ? 2 : 1}px solid ${checked ? C.ink : C.line}`,
              borderRadius: 14, padding: "14px 15px", marginBottom: 10,
              cursor: already ? "default" : "pointer", opacity: already ? 0.6 : 1 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: `2px solid ${checked ? C.ink : C.sub}`, background: checked ? C.ink : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              {checked && <Icon n="check" c={C.bg} s={14} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: C.ink }}>{provider}</p>
              <p style={{ margin: 0, fontSize: 12, color: C.sub }}>
                {already ? "Already connected" : `${demo.apr > 0 ? demo.apr + "% APR" : "0% (pay-in-4)"} · demo data`}
              </p>
            </div>
          </div>
        );
      })}
      <Btn full disabled={selected.length === 0}
        onClick={() => { onConnect(selected); setSelected([]); }}
        style={{ margin: "10px 0 12px" }}>
        {selected.length === 0 ? "Select a provider" : `Connect ${selected.length} selected`}
      </Btn>
    </div>
  );
}

function Insights({ profile, verdicts, plansBurn }) {
  const wishTotal = verdicts.reduce((s, v) => s + v.item.price, 0);
  const readyCount = verdicts.filter((v) => v.action === "buy_now").length;
  const runway = profile.savings / Math.max(1, profile.burn + plansBurn);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 18px" }}>
      <H>Insights</H>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Stat label="Baseline runway" value={`${runway.toFixed(1)} mo`} sub="Savings ÷ Monthly expenses" />
        <Stat label="Wishlist total" value={money(wishTotal)} sub="Combined price of all wants" />
        <Stat label="Ready to buy" value={`${readyCount} of ${verdicts.length}`} sub="Passes your risk threshold" />
        <Stat label="Monthly surplus" value={money(profile.income - profile.burn - plansBurn)} sub="Income − fixed burn" />
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "15px 17px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon n="info" c={C.sub} s={20} />
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: C.sub }}>
            Every verdict simulates 900 possible futures of your next 12 months and reports the
            fraction that end in a crunch. Forecasts only claim a trend where a real pattern
            exists — otherwise they abstain. Your risk tolerance is a setting, not our opinion.</p>
        </div>
      </div>
    </div>
  );
}
const Stat = ({ label, value, sub }) => (
  <div className="glow-card-wrap">
    <div className="glow-card-inner">
      <p style={{ margin: 0, fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: C.ink }}>{value}</p>
      <p style={{ margin: "1px 0 0", fontSize: 11.5, color: C.sub, fontWeight: 500 }}>{label}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#8E887D" }}>{sub}</p>}
    </div>
  </div>
);

function ProfileTab({ profile, onSignOut }) {
  const upsert = useMutation(api.profiles.upsert);
  const { signOut } = useAuthActions();
  const [inc, setInc] = useState(String(profile.income));
  const [burn, setBurn] = useState(String(profile.burn));
  const [sav, setSav] = useState(String(profile.savings));
  const [saved, setSaved] = useState(false);
  const handleSignOut = async () => {
    await signOut();
    if (onSignOut) onSignOut();
  };
  const save = async (extra = {}) => {
    await upsert({ name: profile.name, income: +inc || 0, burn: +burn || 0, savings: +sav || 0,
      piMax: profile.piMax, kappaWk: profile.kappaWk, bufferMonths: profile.bufferMonths, ...extra });
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };
  const Seg = ({ opts, value, field }) => (
    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
      {opts.map(([label, v]) => (
        <button key={label} onClick={() => save({ [field]: v })} style={{ flex: 1,
          border: `1px solid ${value === v ? C.ink : C.line}`,
          background: value === v ? C.ink : C.card, color: value === v ? C.bg : C.ink,
          borderRadius: 10, padding: "9px 6px", fontSize: 12.5, cursor: "pointer", fontFamily: SANS }}>{label}</button>
      ))}
    </div>
  );
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 20px" }}>
      <H>Profile</H>
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 500, color: C.ink }}>Your baseline</p>
      <Field label="Monthly income" prefix="$" value={inc} onChange={setInc} />
      <Field label="Monthly fixed expenses" prefix="$" value={burn} onChange={setBurn} />
      <Field label="Current savings" prefix="$" value={sav} onChange={setSav} />
      <Btn full variant="light" onClick={() => save()} style={{ marginBottom: 18 }}>
        {saved ? "Saved ✓" : "Update baseline"}</Btn>

      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500, color: C.ink }}>Risk tolerance</p>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: C.sub, lineHeight: 1.4 }}>
        Maximum probability of crunch risk you'll accept before buying.
      </p>
      <Seg field="piMax" value={profile.piMax}
        opts={[["Cautious 5%", 0.05], ["Balanced 10%", 0.10], ["Bold 20%", 0.20]]} />

      <p style={{ margin: "16px 0 4px", fontSize: 13, fontWeight: 500, color: C.ink }}>What counts as a crunch?</p>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: C.sub, lineHeight: 1.4 }}>
        The safety floor. "1 mo buffer" triggers a crunch if savings dip below 1 month of expenses.
      </p>
      <Seg field="bufferMonths" value={profile.bufferMonths}
        opts={[["Below 1 mo buffer", 1], ["Hitting $0", 0]]} />

      <p style={{ margin: "16px 0 4px", fontSize: 13, fontWeight: 500, color: C.ink }}>Impatience (cost of waiting)</p>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: C.sub, lineHeight: 1.4 }}>
        How much waiting costs your peace of mind ($/week). Higher values nudge decisions to buy sooner.
      </p>
      <Seg field="kappaWk" value={profile.kappaWk}
        opts={[["$0 (Patient)", 0], ["$5/wk", 5], ["$15/wk (Eager)", 15]]} />

      <div style={{ marginTop: 22, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
        <button onClick={handleSignOut} style={{ background: "none", border: "none",
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: 0,
          fontSize: 14, color: C.clay, fontFamily: SANS }}>
          <Icon n="out" c={C.clay} s={18} /> Sign out
        </button>
      </div>
    </div>
  );
}

function AddSheet({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cat, setCat] = useState("luxury");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [storageId, setStorageId] = useState(null);
  const fileInputRef = useRef(null);
  const generateUploadUrl = useMutation(api.wants.generateUploadUrl);

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(30,27,22,0.4)",
      display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, width: "100%",
        borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: "10px 20px 22px" }}>
        <div style={{ width: 38, height: 4, background: C.line, borderRadius: 4, margin: "0 auto 16px" }} />
        <p style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 500, color: C.ink, margin: "0 0 16px" }}>Add a want</p>
        <Field label="What is it?" type="text" value={name} onChange={setName} />
        <Field label="Price" prefix="$" value={price} onChange={setPrice} />
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, color: C.sub, display: "block", marginBottom: 6 }}>Kind of thing</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(CATS).map(([k, v]) => (
              <button key={k} onClick={() => setCat(k)} style={{ border: `1px solid ${cat === k ? C.ink : C.line}`,
                background: cat === k ? C.ink : C.card, color: cat === k ? C.bg : C.ink, borderRadius: 12,
                padding: "8px 10px", fontSize: 12.5, cursor: "pointer", fontFamily: SANS,
                display: "flex", alignItems: "center", gap: 8 }}>
                {CAT_IMAGES[k] ? (
                  <img src={CAT_IMAGES[k]} alt={v.label} style={{ width: 22, height: 22, borderRadius: 5, objectFit: "cover" }} />
                ) : (
                  <Icon n={GLYPH[k] || "gift"} s={16} c={cat === k ? C.bg : C.ink} />
                )}
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>
        {cat === "other" && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13, color: C.sub, display: "block", marginBottom: 6 }}>Upload image from computer</label>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setSelectedFile(file);
                setUploading(true);
                try {
                  const postUrl = await generateUploadUrl();
                  const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: file,
                  });
                  const { storageId: sId } = await result.json();
                  setStorageId(sId);
                } catch (err) {
                  console.error("Upload failed", err);
                } finally {
                  setUploading(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: "100%",
                background: C.card,
                border: `1px dashed ${C.line}`,
                borderRadius: 12,
                padding: "12px",
                fontSize: 13,
                color: C.ink,
                cursor: "pointer",
                fontFamily: SANS,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Icon n="link" s={18} />
              {uploading
                ? "Uploading..."
                : selectedFile
                ? `Uploaded: ${selectedFile.name}`
                : "Choose image file..."}
            </button>
          </div>
        )}
        <Btn variant="gold" full onClick={() => {
          if (!name.trim() || !+price || +price <= 0) return;
          const payload = { name: name.trim(), price: +price, cat };
          if (storageId) payload.storageId = storageId;
          onSave(payload);
        }}>
          Run the numbers</Btn>
      </div>
    </div>
  );
}

function TabBar({ tab, onTab, onAdd }) {
  const T = ({ id, n, label }) => (
    <button onClick={() => onTab(id)} aria-label={label} style={{ background: "none", border: "none",
      cursor: "pointer", padding: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <Icon n={n} c={tab === id ? C.jadeD : "#B4B2A9"} s={22} />
      <span style={{ fontSize: 9.5, color: tab === id ? C.jadeD : "#B4B2A9", fontFamily: SANS }}>{label}</span>
    </button>
  );
  return (
    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "8px 0 12px", borderTop: `1px solid ${C.line}`, background: C.card }}>
      <T id="home" n="home" label="Home" />
      <T id="wishlist" n="list" label="Wants" />
      <button onClick={onAdd} aria-label="Add a want" style={{ background: C.gold, border: "none",
        width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center",
        justifyContent: "center", cursor: "pointer", marginTop: -6,
        boxShadow: "0 0 18px rgba(216, 179, 106, 0.6), 0 4px 14px rgba(216, 179, 106, 0.4)" }}>
        <Icon n="plus" c="#1E1B16" s={22} />
      </button>
      <T id="insights" n="chart" label="Insights" />
      <T id="profile" n="user" label="Profile" />
    </div>
  );
}

// ---------- the signed-in app (data from Convex) ----------------------------
function MainApp({ onSignOut }) {
  const profile = useQuery(api.profiles.get);
  const wants = useQuery(api.wants.list) ?? [];
  const plans = useQuery(api.plans.list) ?? [];
  const addWant = useMutation(api.wants.add);
  const removeWant = useMutation(api.wants.remove);
  const setWatching = useMutation(api.wants.setWatching);
  const recordOpen = useMutation(api.wants.recordOpen);
  const addPlans = useMutation(api.plans.addMany);
  const removePlan = useMutation(api.plans.remove);

  const [tab, setTab] = useState("home");
  const [view, setView] = useState(null);
  const [adding, setAdding] = useState(false);

  const handleOpen = (id) => {
    void recordOpen({ id });
    setView({ t: "detail", id });
  };

  const plansBurn = plans.reduce((s, p) => s + p.installment, 0);
  const settings = profile
    ? { piMax: profile.piMax, kappaWk: profile.kappaWk, bufferMonths: profile.bufferMonths }
    : null;
  const finEff = profile
    ? { income: profile.income, burn: profile.burn + plansBurn, savings: profile.savings }
    : null;

  const verdicts = useMemo(() => {
    if (!finEff || !settings) return [];
    return wants.map((item) => ({ item, ...whenToBuy(finEff, item, settings) }));
  }, [wants, profile, plansBurn]); // profile/plansBurn cover finEff+settings

  if (profile === undefined) return <Center>Loading…</Center>;
  if (profile === null) return <Onboarding />;

  const detail = view?.t === "detail" ? verdicts.find((v) => v.item._id === view.id) : null;

  return (
    <>
      {view?.t === "detail" && detail ? (
        <ItemDetail v={detail} settings={settings} onBack={() => setView(null)}
          onWatch={() => { void setWatching({ id: detail.item._id, watching: !detail.item.watching });
            setView(null); }} />
      ) : view?.t === "financing" ? (
        <Financing plans={plans} onBack={() => setView(null)}
          onConnect={() => setView({ t: "connect" })}
          onRemove={(id) => {
            console.log("onRemove called with ID:", id);
            removePlan({ id })
              .then(() => console.log("removePlan success for ID:", id))
              .catch((err) => console.error("removePlan error for ID:", id, err));
          }} />
      ) : view?.t === "connect" ? (
        <ConnectAccounts
          connectedProviders={plans.map((p) => p.provider)}
          onBack={() => setView({ t: "financing" })}
          onConnect={(selectedProviders) => {
            const newPlans = selectedProviders.map((provider) => ({
              provider, ...PROVIDER_CATALOG[provider],
            }));
            void addPlans({ plans: newPlans });
            setView({ t: "financing" });
          }} />
      ) : (
        <>
          {tab === "home" && <Home profile={profile} verdicts={verdicts} plans={plans}
            onOpen={handleOpen} onAdd={() => setAdding(true)}
            onFinancing={() => setView({ t: "financing" })} />}
          {tab === "wishlist" && <Wishlist verdicts={verdicts}
            onOpen={handleOpen} onAdd={() => setAdding(true)}
            onRemove={(id) => void removeWant({ id })} />}
          {tab === "insights" && <Insights profile={profile} verdicts={verdicts} plansBurn={plansBurn} />}
          {tab === "profile" && <ProfileTab profile={profile} onSignOut={onSignOut} />}
          <TabBar tab={tab} onTab={setTab} onAdd={() => setAdding(true)} />
        </>
      )}
      {adding && <AddSheet onClose={() => setAdding(false)}
        onSave={async (it) => {
          try {
            await addWant(it);
            setAdding(false);
            setTab("wishlist");
          } catch (err) {
            console.error("Failed to add want item:", err);
          }
        }} />}
    </>
  );
}

const Center = ({ children }) => (
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    color: C.sub, fontSize: 14 }}>{children}</div>
);

// ---------- shell ------------------------------------------------------------
export default function App() {
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem("poise_intro_dismissed"));

  const handleDoneIntro = () => {
    sessionStorage.setItem("poise_intro_dismissed", "true");
    setShowIntro(false);
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("poise_intro_dismissed");
    setShowIntro(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#DEDACF", display: "flex",
      justifyContent: "center", alignItems: "flex-start", padding: "24px 12px", fontFamily: SANS }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Josefin+Sans:wght@400;500;600&display=swap');
        body{margin:0}
        button:focus-visible,input:focus-visible{outline:2px solid ${C.accent};outline-offset:2px}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        @keyframes borderSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .glow-card-wrap {
          position: relative;
          border-radius: 16px;
          padding: 1.5px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(30, 27, 22, 0.05);
        }
        .glow-card-wrap::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            transparent 0deg,
            transparent 250deg,
            rgba(216, 179, 106, 0.85) 300deg,
            #F59E0B 330deg,
            rgba(216, 179, 106, 0.85) 350deg,
            transparent 360deg
          );
          animation: borderSweep 2.0s linear infinite;
          pointer-events: none;
        }
        .glow-card-inner {
          position: relative;
          background: #FFFFFF;
          border-radius: 14.5px;
          z-index: 1;
          padding: 13px 15px;
          height: 100%;
          box-sizing: border-box;
        }`}</style>
      <div style={{ position: "relative", width: "100%", maxWidth: 390, height: 800, background: C.bg,
        borderRadius: 28, overflow: "hidden",
        boxShadow: "0 20px 50px rgba(30,27,22,0.22), 0 0 0 1px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column" }}>
        {showIntro ? (
          <SketchIntro onDone={handleDoneIntro} />
        ) : (
          <>
            <AuthLoading><Center>Loading…</Center></AuthLoading>
            <Unauthenticated><SignIn /></Unauthenticated>
            <Authenticated><MainApp onSignOut={handleSignOut} /></Authenticated>
          </>
        )}
      </div>
    </div>
  );
}
