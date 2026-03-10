"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocations, saveLocations, getAllEquipment } from "@/lib/store";
import type { LocationConfig } from "@/lib/types";
import { Card, PageHeader, ToggleSwitch } from "@/components";

export default function LocationsScreen() {
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [allEquip, setAllEquip] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newLocName, setNewLocName] = useState("");

  useEffect(() => {
    setLocations(getLocations());
    setAllEquip(getAllEquipment());
  }, []);

  function toggleAvailable(id: string) {
    setLocations((prev) => {
      const updated = prev.map((l) =>
        l.id === id ? { ...l, available: !l.available } : l
      );
      saveLocations(updated);
      return updated;
    });
  }

  function toggleEquipment(locId: string, eq: string) {
    setLocations((prev) => {
      const updated = prev.map((l) =>
        l.id === locId
          ? { ...l, equipment: { ...l.equipment, [eq]: !l.equipment[eq] } }
          : l
      );
      saveLocations(updated);
      return updated;
    });
  }

  function addLocation() {
    if (!newLocName.trim()) return;
    const eqMap: Record<string, boolean> = {};
    allEquip.forEach((e) => (eqMap[e] = false));
    const newLoc: LocationConfig = {
      id: `loc-${Date.now()}`,
      name: newLocName.trim(),
      available: true,
      equipment: eqMap,
    };
    const updated = [...locations, newLoc];
    setLocations(updated);
    saveLocations(updated);
    setNewLocName("");
  }

  return (
    <div className="page-container">
      <Link href="/planning" className="back-btn">← Planning</Link>
      <PageHeader title="Locations" subtitle="Manage your workout locations and equipment" />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {locations.map((loc) => {
          const checkedEquip = Object.values(loc.equipment).filter(Boolean).length;
          const totalEquip = Object.keys(loc.equipment).length;
          const isExpanded = expandedId === loc.id;

          return (
            <Card key={loc.id} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px" }}>
                <ToggleSwitch
                  checked={loc.available}
                  onChange={() => toggleAvailable(loc.id)}
                />
                <div
                  style={{ flex: 1, cursor: "pointer" }}
                  onClick={() => setExpandedId((p) => (p === loc.id ? null : loc.id))}
                >
                  <p style={{
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    marginBottom: 2,
                    opacity: loc.available ? 1 : 0.5,
                  }}>
                    {loc.name}
                  </p>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    {checkedEquip}/{totalEquip} equipment available
                  </p>
                </div>
                <span
                  style={{ color: "var(--text-muted)", fontSize: "0.7rem", cursor: "pointer" }}
                  onClick={() => setExpandedId((p) => (p === loc.id ? null : loc.id))}
                >
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>

              {isExpanded && (
                <div
                  className="animate-in"
                  style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)" }}
                >
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", margin: "12px 0 10px" }}>
                    Equipment
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {allEquip.map((eq) => (
                      <label key={eq} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem" }}>
                        <input
                          type="checkbox"
                          checked={!!loc.equipment[eq]}
                          onChange={() => toggleEquipment(loc.id, eq)}
                        />
                        <span style={{ textTransform: "capitalize" }}>{eq}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add custom location */}
      <Card style={{ marginTop: 20 }}>
        <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 10 }}>Add Location</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Location name"
            value={newLocName}
            onChange={(e) => setNewLocName(e.target.value)}
            className="input-field"
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === "Enter" && addLocation()}
          />
          <button className="btn-primary" style={{ padding: "10px 20px", fontSize: "0.85rem" }} onClick={addLocation}>
            Add
          </button>
        </div>
      </Card>
    </div>
  );
}
