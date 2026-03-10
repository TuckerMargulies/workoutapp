"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh", paddingBottom: 20 }}>
      {/* Logo / Brand */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent) 0%, #9b7eef 100%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.8rem",
            marginBottom: 16,
            boxShadow: "0 4px 16px rgba(124, 92, 231, 0.25)",
          }}
        >
          💪
        </div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
          Create account
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Start tracking your workouts today
        </p>
      </div>

      <Card>
        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label>
            <div style={{ fontWeight: 500, marginBottom: 6, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Email
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              required
              autoComplete="email"
            />
          </label>

          <label>
            <div style={{ fontWeight: 500, marginBottom: 6, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Password
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="input-field"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </label>

          <label>
            <div style={{ fontWeight: 500, marginBottom: 6, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Confirm Password
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </label>

          {error && (
            <div
              style={{
                background: "var(--red-soft)",
                color: "var(--red)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </Card>

      <p style={{ textAlign: "center", marginTop: 16, fontSize: "0.85rem", color: "var(--text-muted)" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
