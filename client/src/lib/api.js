const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export function findLocations(query) {
  return request(`/api/locations?q=${encodeURIComponent(query)}`);
}
export function getAdvisory(payload) {
  return request("/api/advisory", { method: "POST", body: JSON.stringify(payload) });
}
export function askAssistant(payload) {
  return request("/api/assistant", { method: "POST", body: JSON.stringify(payload) });
}
export function detectDisease(payload) {
  return request("/api/disease-detect", { method: "POST", body: JSON.stringify(payload) });
}
export function getMandiPrices(params) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  return request(`/api/mandi?${query.toString()}`);
}
