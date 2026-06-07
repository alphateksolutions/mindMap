export function createId(prefix = "id"): string {
  // Try using crypto.randomUUID if available (safe environments like HTTPS/localhost)
  if (
    typeof window !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.randomUUID === "function"
  ) {
    try {
      return `${prefix}_${window.crypto.randomUUID()}`;
    } catch (e) {
      // Fallback
    }
  }

  // Fallback for non-secure HTTP / IP contexts
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 12);
  return `${prefix}_${timestamp}_${randomStr}`;
}
