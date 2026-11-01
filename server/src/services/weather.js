const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function getWeather(latitude, longitude) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("current", [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "wind_speed_10m",
    "weather_code"
  ].join(","));
  url.searchParams.set("daily", [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "et0_fao_evapotranspiration"
  ].join(","));

  const response = await fetch(url);
  if (!response.ok) throw new Error("Live weather data is temporarily unavailable.");
  const data = await response.json();

  if (!data.current || !data.daily) {
    throw new Error("The weather provider returned incomplete data.");
  }
  return data;
}
