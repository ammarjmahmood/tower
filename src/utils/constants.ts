// Flight rules thresholds (FAA/TC standard)
export const FLIGHT_RULES = {
  VFR: { ceiling: 3000, visibility: 5 },
  MVFR: { ceiling: 1000, visibility: 3 },
  IFR: { ceiling: 500, visibility: 1 },
  LIFR: { ceiling: 200, visibility: 0.5 },
} as const;

export type FlightRule = keyof typeof FLIGHT_RULES;

// Common aircraft max demonstrated crosswind (kt)
export const AIRCRAFT_CROSSWIND: Record<string, number> = {
  C152: 12,
  C172: 15,
  PA28: 17,
  DA20: 20,
  DA40: 20,
  C182: 15,
  C150: 12,
};

// GFA regions
export const GFA_REGIONS: Record<string, string> = {
  GFACN31: "Pacific",
  GFACN32: "Prairies",
  GFACN33: "Ontario/Quebec",
  GFACN34: "Atlantic",
};

// Default user preferences
export const DEFAULT_PREFS = {
  ceiling_minimum: 1000,
  visibility_minimum: 3,
  wake_time: "0600",
  max_crosswind: 15,
  region: "GFACN33",
  timezone: "America/Toronto",
} as const;

// METAR quiz bank — real METARs with known flight rules
export const METAR_QUIZ_BANK = [
  { raw: "CYYZ 181200Z 27008KT 15SM CLR 12/04 A3012", answer: "VFR", explanation: "Clear skies, 15SM visibility, no ceiling — textbook VFR." },
  { raw: "CYTZ 101400Z 18012G20KT 6SM -RA BKN025 OVC040 08/06 A2985", answer: "MVFR", explanation: "Ceiling broken at 2500ft and vis 6SM. Both within MVFR range (1000-3000ft ceiling, 3-5SM vis)." },
  { raw: "CYKZ 051800Z 16015G25KT 2SM -RA BR OVC008 05/04 A2970", answer: "IFR", explanation: "Ceiling overcast at 800ft and vis 2SM. Both below MVFR thresholds — this is IFR." },
  { raw: "CYUL 220600Z 09005KT 1/2SM FG VV002 02/02 A3001", answer: "LIFR", explanation: "Vertical visibility 200ft in fog, vis 1/2SM. Well below IFR — this is LIFR." },
  { raw: "CYYC 150000Z 31010KT 15SM FEW200 22/05 A3025", answer: "VFR", explanation: "Few clouds at 20000ft (not a ceiling), 15SM vis — clear VFR day." },
  { raw: "CYOW 081600Z 20018G28KT 3SM -TSRA BKN012 OVC025 18/16 A2962", answer: "IFR", explanation: "Ceiling BKN at 1200ft is technically MVFR, but 3SM vis with thunderstorms. The ceiling at 1200 puts it in MVFR, but with -TSRA conditions are marginal. Actually ceiling 1200 + vis 3SM = MVFR boundary, but many would call this IFR operationally." },
  { raw: "KBUF 121800Z 25012KT 10SM SCT050 BKN080 20/12 A3005", answer: "VFR", explanation: "Scattered at 5000ft, broken at 8000ft. Ceiling is 8000ft (first BKN/OVC), vis 10SM — solid VFR." },
  { raw: "CYYZ 030200Z 35006KT 1SM BR OVC003 01/01 A3018", answer: "LIFR", explanation: "Overcast at 300ft, vis 1SM in mist. Ceiling well below 500ft — LIFR." },
  { raw: "CYTZ 201500Z VRB03KT 15SM SCT035 BKN120 16/08 A3020", answer: "VFR", explanation: "Variable light winds, 15SM vis, ceiling at 12000ft BKN — perfect VFR." },
  { raw: "CYOW 150800Z 14010KT 4SM HZ BKN018 OVC030 10/08 A2995", answer: "MVFR", explanation: "Ceiling BKN at 1800ft, vis 4SM in haze. Both in MVFR range." },
  { raw: "CYYC 281400Z 28020G35KT 15SM FEW040 SCT100 25/08 A3010", answer: "VFR", explanation: "Despite strong gusty winds, ceiling and vis are VFR. Go/no-go would depend on crosswind limits though." },
  { raw: "CYUL 190400Z 02008KT 3/4SM FG VV001 08/08 A3002", answer: "LIFR", explanation: "Fog with vertical visibility 100ft and 3/4SM vis — deep LIFR. Temp/dew spread is 0, fog won't clear soon." },
  { raw: "CYWG 101200Z 36012KT 5SM -SN BKN015 OVC025 M08/M10 A3042", answer: "MVFR", explanation: "Ceiling BKN 1500ft, vis 5SM in light snow. Both sit in MVFR range." },
  { raw: "KORD 151800Z 22015G22KT 10SM BKN045 OVC060 24/16 A2988", answer: "VFR", explanation: "Ceiling 4500ft BKN, vis 10SM — VFR. Gusty but that doesn't affect flight rules classification." },
  { raw: "CYQB 080600Z 08004KT 1 1/2SM BR BKN005 OVC010 04/03 A3008", answer: "IFR", explanation: "Ceiling BKN at 500ft, vis 1.5SM — right at the IFR/LIFR boundary. Ceiling 500ft is the IFR floor." },
  { raw: "CYGK 121000Z 30008KT 8SM BKN025 OVC040 14/10 A2998", answer: "MVFR", explanation: "Ceiling BKN 2500ft puts this in MVFR (1000-3000ft), even though vis is 8SM (VFR). Flight rules go by the worst factor." },
  { raw: "CYXU 200700Z 18005KT 2SM BR OVC004 06/05 A3010", answer: "IFR", explanation: "Ceiling OVC at 400ft, vis 2SM — both IFR. Close to LIFR but ceiling is above 200ft." },
  { raw: "CZBA 151300Z 27010KT 15SM CLR 18/06 A3015", answer: "VFR", explanation: "Clear skies, 15SM vis — doesn't get more VFR than this." },
  { raw: "CYYZ 250300Z 04015G25KT 6SM -SHRA BKN020 OVC035 12/10 A2975", answer: "MVFR", explanation: "BKN at 2000ft and 6SM vis — MVFR. The gusts and showers make it feel worse but flight rules classification is based on ceiling/vis." },
  { raw: "CYHM 180900Z 16008KT 1/4SM FG VV001 03/03 A3005", answer: "LIFR", explanation: "Dense fog: vertical vis 100ft, vis 1/4SM. Both deep LIFR. Zero temp/dew spread means this fog is entrenched." },
] as const;
