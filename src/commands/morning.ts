import { fetchMetar, fetchTaf, fetchStation } from "../services/avwx";
import { fetchGeneralWeather, describeWeatherCode } from "../services/openmeteo";
import { fetchSunTimes, formatSunTime } from "../services/sunrise";
import { getOrCreateUser } from "../store/preferences";
import { getCurrentPriority } from "../store/priorities";
import { setLastAirport, setLastCommand } from "../store/conversation";
import { formatMetarBrief, flightRulesEmoji } from "../formatters/metar";
import { evaluateGoNoGo, formatGoNoGo, calculateCrosswind } from "../formatters/go-nogo";
import { formatTafFull } from "../formatters/taf";
import { buildWeatherCard } from "../images/weather-card";
import { renderWeatherCard } from "../images/render";
import { getAirportName } from "../utils/icao";

export async function handleMorning(phone: string): Promise<{ text: string; images?: string[] }> {
  const prefs = getOrCreateUser(phone);

  if (!prefs.home_airport) {
    return { text: "Set your home airport first: text home CYTZ" };
  }

  setLastCommand(phone, "gm");
  const icao = prefs.home_airport;

  try {
    // Fetch all data in parallel
    const [metar, taf, station, sunTimes] = await Promise.all([
      fetchMetar(icao),
      fetchTaf(icao),
      fetchStation(icao),
      fetchSunTimes(0, 0).catch(() => null), // will use station coords below
    ]);

    // Fetch general weather and sun times with station coords
    const [generalWeather, realSunTimes] = await Promise.all([
      fetchGeneralWeather(station.latitude, station.longitude),
      fetchSunTimes(station.latitude, station.longitude),
    ]);

    // Get primary runway heading for crosswind calc
    const rwyHeading = station.runways?.[0]
      ? parseInt(station.runways[0].ident1.replace(/[LRC]/g, "")) * 10
      : undefined;

    const goNoGo = evaluateGoNoGo(metar, prefs, rwyHeading);
    const name = getAirportName(icao) ?? station.name ?? icao;
    const priority = getCurrentPriority(phone);
    const sunsetLocal = formatSunTime(realSunTimes.sunset, prefs.timezone);

    // Store for explain mode
    setLastAirport(phone, icao, metar.raw);

    // Build text
    const emoji = goNoGo.decision === "GO" ? "☀️" : "⚠️";
    const metarBrief = formatMetarBrief(metar);
    const goNoGoLine = formatGoNoGo(goNoGo);

    // Crosswind info
    let crosswindLine = "";
    if (rwyHeading !== undefined && metar.wind_direction?.value !== undefined && metar.wind_speed?.value !== undefined) {
      const { crosswind } = calculateCrosswind(
        metar.wind_direction.value,
        metar.wind_gust?.value ?? metar.wind_speed.value,
        rwyHeading
      );
      const rwyId = station.runways[0].ident1;
      crosswindLine = `↑ Crosswind Rwy ${rwyId}: ${crosswind}kt ${crosswind <= prefs.max_crosswind ? "OK" : "EXCEEDS LIMIT"}`;
    }

    // TAF summary (next period)
    let tafSummary = "";
    if (taf.forecast.length > 1) {
      const next = taf.forecast[1];
      tafSummary = `${next.flight_rules} through ${next.end_time.repr}`;
    }

    const weatherDesc = describeWeatherCode(generalWeather.weatherCode);
    const cityName = station.city ?? station.name ?? "";

    const lines = [
      `${emoji} Good morning. Here's your brief.`,
      "",
      `${icao} — ${name}`,
      goNoGoLine,
      metarBrief,
      `Sunset ${sunsetLocal}`,
    ];

    if (goNoGo.decision !== "GO") {
      lines.push("");
      for (const reason of goNoGo.reasons) {
        lines.push(reason);
      }
      // Check if TAF shows improvement
      const improvingPeriod = taf.forecast.find((f) => f.flight_rules === "VFR");
      if (improvingPeriod) {
        lines.push("");
        lines.push(`TAF shows improvement to VFR by ${improvingPeriod.start_time.repr}.`);
      } else {
        lines.push("");
        lines.push("Consider sim time or ground study today.");
      }
    }

    lines.push("");
    lines.push(`${cityName}: High ${generalWeather.high}°C, ${weatherDesc}, ${generalWeather.precipChance}% precip`);

    if (priority) {
      lines.push("");
      lines.push(`Your priority: ${priority}`);
    }

    // Generate weather card image
    let images: string[] = [];
    try {
      const cardElement = buildWeatherCard({
        metar,
        goNoGo,
        sunsetLocal,
        crosswindInfo: crosswindLine || undefined,
        tafSummary: tafSummary || undefined,
      });
      const imagePath = await renderWeatherCard(cardElement);
      images = [imagePath];
    } catch (e) {
      // Image generation is optional, don't fail the whole briefing
      if (process.env.DEBUG === "true") console.error("Weather card error:", e);
    }

    return { text: lines.join("\n"), images: images.length > 0 ? images : undefined };
  } catch (error: any) {
    return { text: `Briefing error: ${error.message}. Check your AVWX token and airport code.` };
  }
}
