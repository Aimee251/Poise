import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";

// Both methods. Linking: Convex Auth merges providers into one user when the
// verified email matches, so Google-then-password (or the reverse) stays ONE
// account. NOTE: password-account email verification requires wiring an email
// sender (e.g. Resend OTP provider) — see README; until then password emails
// are unverified and won't auto-link, which is the safe default.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Password({
      validatePasswordRequirements: (password: string) => {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
      },
    }),
  ],
});
