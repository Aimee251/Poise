import React, { Children, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

// poise sign in method: use google or email + password -> user name and onboarding

// DEFINE THE STYLE
const C = {
    bg: "#F3F1EC", card: "#FBFAF7", ink: "#1E1B16", sub: "#6B655B",
    line: "#E4E0D7", jadeD: "#0F6E56", clay: "#9A3B23", clayBg: "#F3E2DB", accent: "#4A3F86",
};

const SERIF = "Fraunces, Georgia, serif";
const SANS = "'Josefin Sans', -apple-system, system-ui, sans-serif";

//login button

const Btn = ({ children, onClick, variant = "dark", full, disabled, style, type }) => {
    const v = variant === "dark" ? { background: C.ink, color: C.bg } :
        { background: C.card, color: C.ink, border: `1px solid ${C.line}` };
    return (
        <button type={type || "button"} onClick={onClick} disabled={disabled}
            style={{
                border: "none", borderRadius: 13, padding: "13px 16px", fontSize: 15,
                fontWeight: 500, cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.55 : 1, fontFamily: SANS,
                width: full ? "100%" : "auto", ...v, ...style
            }}>{children}</button>
    )
};

// input fields

const Input = ({ label, type, value, onChange, autoComplete }) => (
    <div style={{ marginBottom: 13 }}> <label style={{ fontSize: 13, color: C.sub, display: "block", marginBottom: 6 }}>{label}</label>
        <input type={type} value={value} autoComplete={autoComplete} required
            onChange={(e) => onChange(e.target.value)}
            style={{
                width: "100%", boxSizing: "border-box", background: C.card,
                border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 14px",
                fontSize: 16, outline: "none", color: C.ink, fontFamily: SANS
            }} />
    </div>
);

const GoogleMark = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2 3.7-5 3.7-8.6z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5.1l-3.9 3C3.2 21.3 7.3 24 12 24z" />
        <path fill="#FBBC05" d="M5.1 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3l-3.9-3C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l3.9-3z" />
        <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.7l3.9 3c1-3 3.7-5 6.9-5z" />
    </svg>
);

export default function SignIn() {
    // variables
    const { signIn } = useAuthActions();
    const [flow, setFlow] = useState("signIn");
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // another function
    const submitEmail = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await signIn("password", { email, password: pw, flow });
            // success -> <Authenticated> takes over in App.jsx
        } catch (err) {
            const msg = String(err?.message || "");
            setError(
                msg.includes("InvalidAccountId") || msg.includes("InvalideSecret")
                    ? "Wrong email or password."
                    : msg.includes("already exists")
                        ? "This email already has an account. Try signing in, or use Google below."
                        : msg.includes("8 characters")
                            ? "Password must be at least 8 characters."
                            : "Something went wrong — try again.");
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submitEmail}
            style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px", overflowY: "auto" }}>
            <style>{`
                @keyframes wormCrawl {
                    0% {
                        stroke-dashoffset: 140;
                        stroke-dasharray: 40 140;
                        transform: scaleX(0.8);
                    }
                    40% {
                        stroke-dashoffset: 15;
                        stroke-dasharray: 130 50;
                        transform: scaleX(1.45);
                    }
                    70% {
                        stroke-dashoffset: -50;
                        stroke-dasharray: 50 130;
                        transform: scaleX(1.1);
                    }
                    100% {
                        stroke-dashoffset: 140;
                        stroke-dasharray: 40 140;
                        transform: scaleX(0.8);
                    }
                }
                .worm-line {
                    transform-origin: left center;
                    animation: wormCrawl 3.2s ease-in-out infinite;
                }
            `}</style>
            <div style={{ paddingTop: 34 }}>
                <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 500, color: C.ink, margin: "0 0 2px" }}>Poise</h1>
                <svg width="160" height="16" viewBox="0 0 170 18" style={{ margin: "2px 0 14px", display: "block", overflow: "visible" }} aria-hidden="true">
                    <path
                        className="worm-line"
                        d="M5 9 C 25 2, 45 15, 65 7 S 110 3, 135 10 S 155 13, 165 8"
                        fill="none"
                        stroke="#D8B36A"
                        strokeWidth="3.4"
                        strokeLinecap="round"
                    />
                </svg>
                <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.55, margin: "0 0 22px" }}>
                    {flow === "signIn"
                        ? "Welcome back — your wants and baseline are where you left them."
                        : "One account, honest verdicts, and a ping when your buy window opens."}
                </p>
            </div>

            <Input label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Input label={flow === "signUp" ? "Password (8+ characters)" : "Password"} type="password"
                value={pw} onChange={setPw}
                autoComplete={flow === "signUp" ? "new-password" : "current-password"} />

            {error && (
                <p role="alert" style={{
                    margin: "0 0 12px", fontSize: 13, color: C.clay,
                    background: C.clayBg, borderRadius: 10, padding: "10px 12px"
                }}>{error}</p>
            )}

            <Btn type="submit" full disabled={busy || !email || !pw}>
                {busy ? "One sec…" : flow === "signIn" ? "Sign in" : "Create account"}
            </Btn>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
                <div style={{ flex: 1, height: 1, background: C.line }} />
                <span style={{ fontSize: 12, color: C.sub }}>or</span>
                <div style={{ flex: 1, height: 1, background: C.line }} />
            </div>

            <Btn variant="light" full disabled={busy}
                onClick={() => { setBusy(true); void signIn("google"); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <GoogleMark /> Continue with Google
            </Btn>

            <div style={{ flex: 1 }} />
            <p style={{ textAlign: "center", fontSize: 13.5, color: C.sub, margin: "14px 0 20px" }}>
                {flow === "signIn" ? "New here? " : "Already have an account? "}
                <span onClick={() => { setFlow(flow === "signIn" ? "signUp" : "signIn"); setError(""); }}
                    style={{ color: C.jadeD, fontWeight: 500, cursor: "pointer" }}>
                    {flow === "signIn" ? "Create an account" : "Sign in"}
                </span>
            </p>
        </form>
    );

}
