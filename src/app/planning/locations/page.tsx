"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocations, saveLocations, getAllEquipment } from "@/lib/store";
import type { LocationConfig } from "@/lib/types";

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
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/planning" className="back-btn">← Planning</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>
        Locations &amp; Equipment
      </h1>

      <div style={{ marginTop: 20 }}>
        {locations.map((loc) => (
          <div key={loc.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                checked={loc.available}
                onChange={() => toggleAvailable(loc.id)}
                style={{ width: 20, height: 20 }}
              />
              <span
                style={{ fontWeight: 600, flex: 1, cursor: "pointer" }}
                onClick={() => setExpandedId((p) => (p === loc.id ? null : loc.id))}
              >
                {loc.name}
                <span style={{ float: "right", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {expandedId === loc.id ? "▲" : "▼"}
                </span>
              </span>
            </div>

            {expandedId === loc.id && (
              <div style={{ marginTop: 12, marginLeft: 32, display: "flex", flexDirection: "column", gap: 6 }}>
                {allEquip.map((eq) => (
                  <label key={eq} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!loc.equipment[eq]}
                      onChange={() => toggleEquipment(loc.id, eq)}
                    />
                    <span style={{ textTransform: "capitalize" }}>{eq}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add custom location */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Add Custom Location</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Location name"
            value={newLocName}
            onChange={(e) => setNewLocName(e.target.value)}
            style={{
              flex: 1,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 12px",
              color: "var(--text)",
            }}
            onKeyDown={(e) => e.key === "Enter" && addLocation()}
          />
          <button className="btn-secondary" onClick={addLocation}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
