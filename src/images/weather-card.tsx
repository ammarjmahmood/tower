import type { AvwxMetar, AvwxTaf } from "../services/avwx";
import type { GoNoGoResult } from "../formatters/go-nogo";
import { getAirportName } from "../utils/icao";

interface WeatherCardProps {
  metar: AvwxMetar;
  goNoGo: GoNoGoResult;
  sunsetLocal?: string;
  crosswindInfo?: string;
  tafSummary?: string;
}

const COLORS: Record<string, string> = {
  VFR: "#22c55e",
  MVFR: "#3b82f6",
  IFR: "#ef4444",
  LIFR: "#a855f7",
};

function getCeiling(metar: AvwxMetar): string {
  if (!metar.clouds || metar.clouds.length === 0) return "CLR";
  const c = metar.clouds.find((c) => c.type === "BKN" || c.type === "OVC" || c.type === "VV");
  if (!c) return "CLR";
  return `${c.type} ${c.altitude * 100}`;
}

function getWind(metar: AvwxMetar): string {
  const dir = metar.wind_direction?.repr ?? "VRB";
  const spd = metar.wind_speed?.value ?? 0;
  const gust = metar.wind_gust?.value;
  let w = `${dir}@${spd}`;
  if (gust) w += `G${gust}`;
  return w;
}

export function buildWeatherCard(props: WeatherCardProps) {
  const { metar, goNoGo, sunsetLocal, crosswindInfo, tafSummary } = props;
  const color = COLORS[metar.flight_rules] ?? "#6b7280";
  const name = getAirportName(metar.station) ?? "";
  const icon = goNoGo.decision === "GO" ? "✓" : goNoGo.decision === "CAUTION" ? "⚠️" : "✗";

  return {
    type: "div" as const,
    props: {
      style: {
        display: "flex",
        flexDirection: "column" as const,
        width: 600,
        height: 400,
        backgroundColor: "#1a1a2e",
        color: "#ffffff",
        fontFamily: "Inter, sans-serif",
        padding: 30,
        borderRadius: 16,
      },
      children: [
        // Header
        {
          type: "div" as const,
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            },
            children: [
              {
                type: "div" as const,
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  },
                  children: [
                    {
                      type: "div" as const,
                      props: {
                        style: {
                          backgroundColor: color,
                          padding: "6px 16px",
                          borderRadius: 8,
                          fontSize: 18,
                          fontWeight: 700,
                        },
                        children: `${metar.flight_rules} ${goNoGo.decision} ${icon}`,
                      },
                    },
                  ],
                },
              },
              {
                type: "div" as const,
                props: {
                  style: { fontSize: 24, fontWeight: 700, letterSpacing: 2 },
                  children: metar.station,
                },
              },
            ],
          },
        },
        // Name
        {
          type: "div" as const,
          props: {
            style: { fontSize: 13, color: "#94a3b8", marginBottom: 20 },
            children: name,
          },
        },
        // Divider
        {
          type: "div" as const,
          props: {
            style: { height: 1, backgroundColor: "#334155", marginBottom: 20 },
            children: "",
          },
        },
        // Main grid
        {
          type: "div" as const,
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 20,
            },
            children: [
              makeCell("Wind", getWind(metar)),
              makeCell("Vis", metar.visibility?.repr ?? "N/A"),
              makeCell("Ceiling", getCeiling(metar)),
            ],
          },
        },
        {
          type: "div" as const,
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 20,
            },
            children: [
              makeCell("Temp/Dew", `${metar.temperature?.value ?? "?"}/${metar.dewpoint?.value ?? "?"}°C`),
              makeCell("Alt", metar.altimeter?.repr ?? "N/A"),
              makeCell("Sunset", sunsetLocal ?? "N/A"),
            ],
          },
        },
        // Divider
        {
          type: "div" as const,
          props: {
            style: { height: 1, backgroundColor: "#334155", marginBottom: 16 },
            children: "",
          },
        },
        // Footer
        {
          type: "div" as const,
          props: {
            style: { fontSize: 13, color: "#94a3b8" },
            children: [
              crosswindInfo ? {
                type: "div" as const,
                props: { children: crosswindInfo },
              } : null,
              tafSummary ? {
                type: "div" as const,
                props: { style: { marginTop: 4 }, children: `TAF: ${tafSummary}` },
              } : null,
            ].filter(Boolean),
          },
        },
      ],
    },
  };
}

function makeCell(label: string, value: string) {
  return {
    type: "div" as const,
    props: {
      style: { display: "flex", flexDirection: "column" as const, alignItems: "center", flex: 1 },
      children: [
        {
          type: "div" as const,
          props: {
            style: { fontSize: 12, color: "#64748b", marginBottom: 4, textTransform: "uppercase" as const },
            children: label,
          },
        },
        {
          type: "div" as const,
          props: {
            style: { fontSize: 18, fontWeight: 600 },
            children: value,
          },
        },
      ],
    },
  };
}
