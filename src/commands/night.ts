import { fetchTaf, fetchStation } from "../services/avwx";
import { fetchTomorrowWeather, describeWeatherCode } from "../services/openmeteo";
import { fetchSunTimes, formatSunTime } from "../services/sunrise";
import { getOrCreateUser } from "../store/preferences";
import { getCurrentPriority } from "../store/priorities";
import { setLastCommand } from "../store/conversation";
import { getAirportName } from "../utils/icao";

export async function handleNight(phone: string): Promise<{ text: string }> {
  const prefs = getOrCreateUser(phone);

  if (!prefs.home_airport) {
    return { text: "Set your home airport first: text home CYTZ" };
  }

  setLastCommand(phone, "gn");
  const icao = prefs.home_airport;

  try {
    const station = await fetchStation(icao);

    const [taf, tomorrow, sunTimes] = await Promise.all([
      fetchTaf(icao),
      fetchTomorrowWeather(station.latitude, station.longitude),
      fetchSunTimes(station.latitude, station.longitude),
    ]);

    const name = getAirportName(icao) ?? station.name ?? icao;
    const priority = getCurrentPriority(phone);
    const sunriseLocal = formatSunTime(sunTimes.sunrise, prefs.timezone);
    const weatherDesc = describeWeatherCode(tomorrow.weatherCode);

    // Find tomorrow AM forecast from TAF
    let tafForecast = "Check back in the morning";
    const lastPeriod = taf.forecast[taf.forecast.length - 1];
    if (lastPeriod) {
      tafForecast = `${lastPeriod.flight_rules} expected`;
    }

    const lines = [
      "🌙 Good night. Tomorrow's outlook:",
      "",
      `${icao} — Forecast for tomorrow AM`,
      tafForecast,
      `Sunrise ${sunriseLocal}`,
      "",
      `${station.city ?? ""}: High ${tomorrow.high}°C, ${weatherDesc}, ${tomorrow.precipChance}% precip`,
    ];

    if (priority) {
      lines.push("");
      lines.push(`Your priority: ${priority}`);
    }

    lines.push("");
    lines.push("Rest up. ✈️");

    return { text: lines.join("\n") };
  } catch (error: any) {
    return { text: `Night briefing error: ${error.message}` };
  }
}
