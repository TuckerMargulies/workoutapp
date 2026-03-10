"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", icon: "⌂", label: "Home" },
  { href: "/planning", icon: "◎", label: "Plan" },
  { href: "/tracking", icon: "▦", label: "Activity" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav on exercise screen (full screen workout mode)
  if (pathname === "/exercise") return null;

  return (
    <nav className="nav-bottom">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? "nav-item-active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
