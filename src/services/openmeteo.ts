export interface GeneralWeather {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  high: number;
  low: number;
  precipChance: number;
  sunrise: string;
  sunset: string;
}

const WEATHER_CODES: Record<number, string> = {
  0: "clear",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "freezing fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "light showers",
  81: "showers",
  82: "heavy showers",
  85: "light snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "severe thunderstorm with hail",
};

export function describeWeatherCode(code: number): string {
  return WEATHER_CODES[code] ?? "unknown";
}

export async function fetchGeneralWeather(lat: number, lon: number): Promise<GeneralWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    weatherCode: data.current.weather_code,
    high: data.daily.temperature_2m_max[0],
    low: data.daily.temperature_2m_min[0],
    precipChance: data.daily.precipitation_probability_max?.[0] ?? 0,
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0],
  };
}

export async function fetchTomorrowWeather(lat: number, lon: number): Promise<{
  high: number;
  low: number;
  weatherCode: number;
  precipChance: number;
  sunrise: string;
  sunset: string;
}> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset&timezone=auto&forecast_days=2`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  return {
    high: data.daily.temperature_2m_max[1],
    low: data.daily.temperature_2m_min[1],
    weatherCode: data.daily.weather_code[1],
    precipChance: data.daily.precipitation_probability_max?.[1] ?? 0,
    sunrise: data.daily.sunrise[1],
    sunset: data.daily.sunset[1],
  };
}
