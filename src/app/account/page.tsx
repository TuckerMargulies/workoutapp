"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, PageHeader, IconBox, ComingSoon } from "@/components";
import { createClient } from "@/lib/supabase/client";

export default function AccountSettings() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? "");
      }
      setLoading(false);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = email ? email.charAt(0).toUpperCase() : "U";

  if (loading) {
    return (
      <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60dvh" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Link href="/" className="back-btn">← Back</Link>
      <PageHeader title="Account" subtitle="Manage your profile and subscription" />

      {/* Profile avatar */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent) 0%, #9b7eef 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "#fff",
            boxShadow: "0 4px 16px rgba(124, 92, 231, 0.25)",
          }}
        >
          {initial}
        </div>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label>
            <div style={{ fontWeight: 500, marginBottom: 6, fontSize: "0.8rem", color: "var(--text-muted)" }}>Email</div>
            <input type="email" value={email} readOnly className="input-field" style={{ opacity: 0.6 }} />
          </label>
          <label>
            <div style={{ fontWeight: 500, marginBottom: 6, fontSize: "0.8rem", color: "var(--text-muted)" }}>Password</div>
            <input type="password" value="••••••••" readOnly className="input-field" style={{ opacity: 0.6 }} />
          </label>
          <button className="btn-accent-outline" style={{ alignSelf: "flex-start", padding: "8px 20px", fontSize: "0.8rem" }}>
            Change Password
          </button>
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <IconBox icon="⭐" size="sm" bg="var(--secondary-soft)" />
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>Subscription</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Free tier</p>
          </div>
        </div>
        <ComingSoon />
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <IconBox icon="💳" size="sm" bg="var(--green-soft)" />
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>Payment</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>No payment method on file</p>
          </div>
        </div>
        <ComingSoon />
      </Card>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        style={{
          width: "100%",
          marginTop: 24,
          padding: "14px 32px",
          background: "var(--red-soft)",
          color: "var(--red)",
          fontWeight: 600,
          border: "1.5px solid rgba(231, 76, 60, 0.2)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.95rem",
          cursor: "pointer",
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
