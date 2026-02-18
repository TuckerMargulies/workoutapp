// ============================================================
// Default values for DB 3A (Breakdown) & DB 3B (Locations)
// ============================================================
import { BreakdownPreference, LocationConfig } from "../lib/types";

export const ALL_EQUIPMENT = [
  "free weights",
  "kettlebells",
  "machines",
  "mat/floor",
  "bands",
];

function equipMap(checked: string[]): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  ALL_EQUIPMENT.forEach((e) => (m[e] = checked.includes(e)));
  return m;
}

export const defaultLocations: LocationConfig[] = [
  {
    id: "loc-home",
    name: "Home",
    available: true,
    equipment: equipMap(["kettlebells", "mat/floor"]),
  },
  {
    id: "loc-gym",
    name: "Gym",
    available: true,
    equipment: equipMap(ALL_EQUIPMENT),
  },
  {
    id: "loc-outdoors",
    name: "Outdoors",
    available: true,
    equipment: equipMap(["mat/floor"]),
  },
  {
    id: "loc-travel",
    name: "Travel",
    available: true,
    equipment: equipMap([]),
  },
  {
    id: "loc-work",
    name: "Work",
    available: false,
    equipment: equipMap([]),
  },
  {
    id: "loc-pool",
    name: "Pool",
    available: true,
    equipment: equipMap([]),
  },
];

export const defaultBreakdownPreferences: BreakdownPreference[] = [
  { type: "resistance", frequency: 3, isSpecificGoal: false },
  { type: "mobility", frequency: 2, isSpecificGoal: false },
  { type: "cardio", frequency: 2, isSpecificGoal: false },
  { type: "breath hold", frequency: 1, isSpecificGoal: true },
  { type: "surf", frequency: 1, isSpecificGoal: true },
  { type: "shoulder", frequency: 1, isSpecificGoal: true },
  { type: "back", frequency: 2, isSpecificGoal: true },
  { type: "joints", frequency: 1, isSpecificGoal: true },
];
