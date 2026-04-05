/**
 * Maps keyboard digit to zero-based hotbar index (key "1" → 0).
 * Returns null if not a single digit 1–9.
 */
export function hotbarIndexFromKey(key: string): number | null {
  if (key.length !== 1 || key < "1" || key > "9") return null;
  return key.charCodeAt(0) - "1".charCodeAt(0);
}
