"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWorkoutLogs, pullFromSupabase } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutLog } from "@/lib/types";
import {
  Card,
  StatCard,
  IconBox,
  SectionHeader,
  EmptyState,
  DayDot,
  ProgressRing,
} from "@/components";

export default function Home() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [greeting, setGreeting] = useState("Good morning");
  const [userInitial, setUserInitial] = useState("U");

  useEffect(() => {
    async function init() {
      // Sync from Supabase, then load from localStorage
      await pullFromSupabase();
      setLogs(getWorkoutLogs());

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserInitial(user.email.charAt(0).toUpperCase());
      }
    }
    init();

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Weekly stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekLogs = logs.filter((l) => new Date(l.date) >= weekStart);
  const totalMinThisWeek = Math.round(
    thisWeekLogs.reduce((s, l) => s + l.totalTimeElapsedSec, 0) / 60
  );

  // Streak
  const daySet = new Set(logs.map((l) => new Date(l.date).toDateString()));
  let streak = 0;
  const checkDate = new Date();
  if (!daySet.has(checkDate.toDateString())) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (daySet.has(checkDate.toDateString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Weekly goal
  const weeklyGoal = 4;
  const weeklyProgress = thisWeekLogs.length / weeklyGoal;

  // Days of week activity
  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];
  const dayActivity = daysOfWeek.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return thisWeekLogs.some(
      (l) => new Date(l.date).toDateString() === d.toDateString()
    );
  });

  const recentLogs = logs.slice(0, 3);

  return (
    <div className="page-container">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
          paddingTop: 8,
        }}
      >
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 4 }}>
            {greeting}
          </p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Dashboard
          </h1>
        </div>
        <Link
          href="/account"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            textDecoration: "none",
            fontSize: "1rem",
            fontWeight: 600,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {userInitial}
        </Link>
      </div>

      {/* Start Workout CTA */}
      <Link href="/plan" style={{ textDecoration: "none" }}>
        <div className="cta-banner" style={{ marginBottom: 24 }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8rem", fontWeight: 500, marginBottom: 6 }}>
              READY TO TRAIN?
            </p>
            <p style={{ color: "#fff", fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Start Workout
            </p>
          </div>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              color: "#fff",
            }}
          >
            →
          </div>
        </div>
      </Link>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        <StatCard label="This Week" value={thisWeekLogs.length} sub="workouts" />
        <StatCard label="Time" value={totalMinThisWeek} sub="minutes" />
        <StatCard
          label="Streak"
          value={streak}
          sub="days"
          valueColor={streak > 0 ? "var(--orange)" : undefined}
        />
      </div>

      {/* Weekly Progress */}
      <Card style={{ marginBottom: 24 }}>
        <SectionHeader
          title="Weekly Goal"
          action={
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
              {thisWeekLogs.length}/{weeklyGoal}
            </span>
          }
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ProgressRing progress={weeklyProgress} size={72} strokeWidth={6}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
              {Math.round(weeklyProgress * 100)}%
            </span>
          </ProgressRing>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
              {daysOfWeek.map((day, i) => (
                <DayDot key={i} label={day} active={dayActivity[i]} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader
          title="Recent Activity"
          action={
            logs.length > 3 ? (
              <Link
                href="/tracking"
                style={{ fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
              >
                See all
              </Link>
            ) : undefined
          }
        />

        {recentLogs.length === 0 ? (
          <EmptyState
            icon="🏃"
            message="No workouts yet. Start your first workout to see your activity here."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentLogs.map((log) => {
              const date = new Date(log.date);
              const totalMin = Math.round(log.totalTimeElapsedSec / 60);
              const exerciseCount = log.exercises.length;
              const isToday = date.toDateString() === new Date().toDateString();
              const dayLabel = isToday
                ? "Today"
                : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

              return (
                <Card key={log.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <IconBox icon="💪" bg="var(--accent-soft)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>
                      {log.location} Workout
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {dayLabel} · {exerciseCount} exercises
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--accent)" }}>
                    {totalMin}m
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <SectionHeader title="Quick Access" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Library", href: "/planning/library", icon: "📖", desc: "Browse exercises" },
            { label: "Breakdown", href: "/planning/breakdown", icon: "📊", desc: "Set priorities" },
            { label: "Goals", href: "/planning/goals", icon: "🎯", desc: "Target areas" },
            { label: "Locations", href: "/planning/locations", icon: "📍", desc: "Equipment setup" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <Card interactive style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
                <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text)" }}>
                    {item.label}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                    {item.desc}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
