export interface SunTimes {
  sunrise: string;
  sunset: string;
  civil_twilight_begin: string;
  civil_twilight_end: string;
  nautical_twilight_begin: string;
  nautical_twilight_end: string;
}

export async function fetchSunTimes(lat: number, lon: number): Promise<SunTimes> {
  const res = await fetch(
    `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`
  );
  if (!res.ok) throw new Error(`Sunrise API error: ${res.status}`);
  const data = await res.json();

  if (data.status !== "OK") throw new Error(`Sunrise API: ${data.status}`);

  return {
    sunrise: data.results.sunrise,
    sunset: data.results.sunset,
    civil_twilight_begin: data.results.civil_twilight_begin,
    civil_twilight_end: data.results.civil_twilight_end,
    nautical_twilight_begin: data.results.nautical_twilight_begin,
    nautical_twilight_end: data.results.nautical_twilight_end,
  };
}

export function formatSunTime(isoStr: string, timezone: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
}
