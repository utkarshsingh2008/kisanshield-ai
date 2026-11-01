import { getWeather } from "./weather.js";
import { assessWeatherRisk } from "./risk.js";
import { generateAiAdvice } from "./ai.js";

export async function createAdvisory(input) {
  const weather = await getWeather(input.latitude, input.longitude);
  const risk = assessWeatherRisk(weather);
  const advice = await generateAiAdvice({
    ...input,
    weather,
    risk
  });

  return {
    location: {
      name: input.locationName,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: weather.timezone
    },
    crop: input.crop,
    growthStage: input.growthStage,
    language: input.language,
    current: weather.current,
    currentUnits: weather.current_units,
    dailyUnits: weather.daily_units,
    risk,
    advice,
    generatedAt: new Date().toISOString(),
    weatherSource: "Open-Meteo"
  };
}
