const round = (value) => Math.round(Number(value || 0) * 10) / 10;

export function assessWeatherRisk(weather) {
  const daily = weather.daily;
  const days = (daily.time || []).map((date, index) => ({
    date,
    maxTemp: daily.temperature_2m_max?.[index] ?? null,
    minTemp: daily.temperature_2m_min?.[index] ?? null,
    rain: daily.precipitation_sum?.[index] ?? null,
    rainProbability: daily.precipitation_probability_max?.[index] ?? null,
    wind: daily.wind_speed_10m_max?.[index] ?? null,
    et0: daily.et0_fao_evapotranspiration?.[index] ?? null
  }));

  const risks = [];
  const maxTemp = Math.max(...days.map((d) => Number(d.maxTemp ?? -100)));
  const maxRain = Math.max(...days.map((d) => Number(d.rain ?? 0)));
  const maxRainProbability = Math.max(...days.map((d) => Number(d.rainProbability ?? 0)));
  const maxWind = Math.max(...days.map((d) => Number(d.wind ?? 0)));
  const maxEt0 = Math.max(...days.map((d) => Number(d.et0 ?? 0)));

  if (maxTemp >= 40) {
    risks.push({ type: "Heat stress", level: "High", value: `${round(maxTemp)}°C`, explanation: "Forecast maximum temperature reaches 40°C or higher." });
  } else if (maxTemp >= 35) {
    risks.push({ type: "Heat stress", level: "Moderate", value: `${round(maxTemp)}°C`, explanation: "Forecast maximum temperature reaches 35°C or higher." });
  }

  if (maxRain >= 50 || (maxRain >= 25 && maxRainProbability >= 70)) {
    risks.push({ type: "Heavy rainfall", level: "High", value: `${round(maxRain)} mm/day`, explanation: "The forecast indicates a substantial rainfall event." });
  } else if (maxRain >= 10 || maxRainProbability >= 60) {
    risks.push({ type: "Rainfall", level: "Moderate", value: `${round(maxRain)} mm/day`, explanation: "Rain is possible; review field drainage and planned field work." });
  }

  if (maxWind >= 50) {
    risks.push({ type: "Strong wind", level: "High", value: `${round(maxWind)} km/h`, explanation: "Forecast wind may affect exposed or tall crops." });
  } else if (maxWind >= 30) {
    risks.push({ type: "Strong wind", level: "Moderate", value: `${round(maxWind)} km/h`, explanation: "Elevated wind speeds are forecast." });
  }

  if (maxEt0 >= 6 && maxTemp >= 32) {
    risks.push({ type: "High evaporative demand", level: "Moderate", value: `${round(maxEt0)} mm/day`, explanation: "Warm conditions and elevated reference evapotranspiration may increase water demand." });
  }

  const score = risks.reduce((total, risk) => total + (risk.level === "High" ? 30 : 15), 0);
  const level = risks.some((risk) => risk.level === "High") ? "High" : risks.length ? "Moderate" : "Low";

  return {
    level,
    score: Math.min(score, 100),
    summary: risks.length ? `${risks.length} weather-related risk signal(s) detected in the 7-day forecast.` : "No major risk thresholds were crossed in the 7-day forecast.",
    risks,
    forecast: days
  };
}
