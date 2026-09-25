const PIN_STORAGE_KEY = "expense_pin_unlocked_until";
const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000; // 28 ngày (4 tuần)
export const CORRECT_PIN = "2403";

export function isAppUnlocked(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(PIN_STORAGE_KEY);
  if (!raw) return false;
  const expiresAt = parseInt(raw, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    localStorage.removeItem(PIN_STORAGE_KEY);
    return false;
  }
  return true;
}

export function saveAppUnlocked(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PIN_STORAGE_KEY, (Date.now() + FOUR_WEEKS_MS).toString());
}

export function lockApp(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PIN_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("app-locked"));
}
