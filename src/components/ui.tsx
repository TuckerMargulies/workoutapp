"use client";

import React from "react";

/* ---- Card ---- */
interface CardProps {
  children: React.ReactNode;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, interactive, className = "", style, onClick }: CardProps) {
  return (
    <div
      className={`${interactive ? "card-interactive" : "card"} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/* ---- StatCard ---- */
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  style?: React.CSSProperties;
  valueColor?: string;
  center?: boolean;
}

export function StatCard({ label, value, sub, style, valueColor, center }: StatCardProps) {
  return (
    <div className="stat-card" style={{ textAlign: center ? "center" : undefined, ...style }}>
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ color: valueColor, fontSize: center ? "1.4rem" : undefined }}>
        {value}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

/* ---- IconBox ---- */
interface IconBoxProps {
  icon: string;
  size?: "sm" | "md" | "lg";
  bg?: string;
  style?: React.CSSProperties;
}

export function IconBox({ icon, size = "md", bg = "var(--accent-soft)", style }: IconBoxProps) {
  return (
    <div
      className={`icon-box icon-box-${size}`}
      style={{ background: bg, ...style }}
    >
      {icon}
    </div>
  );
}

/* ---- SectionHeader ---- */
interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <div className="section-header" style={style}>
      <span className="section-title">{title}</span>
      {action}
    </div>
  );
}

/* ---- PageHeader ---- */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  style?: React.CSSProperties;
}

export function PageHeader({ title, subtitle, style }: PageHeaderProps) {
  return (
    <div style={style}>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
}

/* ---- Tag ---- */
interface TagProps {
  children: React.ReactNode;
  variant?: "accent" | "green" | "orange" | "secondary";
  style?: React.CSSProperties;
}

export function Tag({ children, variant = "accent", style }: TagProps) {
  return (
    <span className={`tag tag-${variant}`} style={style}>
      {children}
    </span>
  );
}

/* ---- PillTabs ---- */
interface PillTabsProps {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
  style?: React.CSSProperties;
}

export function PillTabs({ tabs, active, onChange, style }: PillTabsProps) {
  return (
    <div className="pill-tabs" style={style}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`pill-tab ${active === tab.key ? "pill-tab-active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ---- ToggleSwitch ---- */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <div
      className={`toggle-switch ${checked ? "toggle-switch-on" : "toggle-switch-off"}`}
      onClick={onChange}
    >
      <div className="toggle-switch-knob" />
    </div>
  );
}

/* ---- EmptyState ---- */
interface EmptyStateProps {
  icon: string;
  message: string;
  style?: React.CSSProperties;
}

export function EmptyState({ icon, message, style }: EmptyStateProps) {
  return (
    <div className="empty-state" style={style}>
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-text">{message}</p>
    </div>
  );
}

/* ---- FreqBadge ---- */
interface FreqBadgeProps {
  value: number;
  unit?: string;
}

export function FreqBadge({ value, unit = "×/week" }: FreqBadgeProps) {
  return (
    <span className="freq-badge">
      {value}{unit}
    </span>
  );
}

/* ---- DayDot ---- */
interface DayDotProps {
  label: string;
  active: boolean;
}

export function DayDot({ label, active }: DayDotProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </span>
      <div className={`day-dot ${active ? "day-dot-active" : "day-dot-inactive"}`}>
        {active ? "✓" : ""}
      </div>
    </div>
  );
}

/* ---- ComingSoon ---- */
export function ComingSoon() {
  return <div className="coming-soon">Coming soon</div>;
}
