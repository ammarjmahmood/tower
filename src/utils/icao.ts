const ICAO_PATTERN = /^[A-Z]{4}$/;

// Common airport name lookups (Canadian + nearby US)
const AIRPORT_NAMES: Record<string, string> = {
  CYYZ: "Toronto Pearson",
  CYTZ: "Billy Bishop Toronto City",
  CYKZ: "Buttonville Municipal",
  CYHM: "John C. Munro Hamilton",
  CYOW: "Ottawa Macdonald-Cartier",
  CYUL: "Montréal-Trudeau",
  CYYC: "Calgary International",
  CYVR: "Vancouver International",
  CYEG: "Edmonton International",
  CYWG: "Winnipeg James Armstrong Richardson",
  CYHZ: "Halifax Stanfield",
  CYQB: "Québec City Jean Lesage",
  CYXU: "London International",
  CYGK: "Kingston Norman Rogers",
  CZBA: "Burlington Executive",
  CYOO: "Oshawa Executive",
  CYPQ: "Peterborough",
  CYFD: "Brantford Municipal",
  KBUF: "Buffalo Niagara",
  KORD: "Chicago O'Hare",
  KJFK: "New York JFK",
  KLGA: "New York LaGuardia",
  KDTW: "Detroit Metro Wayne County",
  KROC: "Rochester Greater",
  KSYR: "Syracuse Hancock",
};

export function isValidICAO(code: string): boolean {
  return ICAO_PATTERN.test(code.toUpperCase());
}

export function getAirportName(icao: string): string | null {
  return AIRPORT_NAMES[icao.toUpperCase()] ?? null;
}

export function normalizeICAO(code: string): string {
  return code.toUpperCase().trim();
}
