const BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export async function searchLocations(query) {
  const url = new URL(BASE_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "7");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) throw new Error("Location provider is temporarily unavailable.");

  const data = await response.json();
  return (data.results || []).map((place) => ({
    id: `${place.id}-${place.latitude}-${place.longitude}`,
    name: place.name,
    admin1: place.admin1 || "",
    country: place.country || "",
    latitude: place.latitude,
    longitude: place.longitude,
    label: [place.name, place.admin1, place.country].filter(Boolean).join(", ")
  }));
}
