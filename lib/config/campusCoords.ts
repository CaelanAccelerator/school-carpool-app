export const CAMPUS_COORDS: Record<string, { lat: number; lng: number }> = {
  'Main Campus': { lat: 49.2606, lng: -123.2460 },
  'UBC Campus': { lat: 49.2606, lng: -123.2460 },
  'North Campus': { lat: 49.3050, lng: -123.1440 }
};

export const CAMPUS_NAMES = Object.keys(CAMPUS_COORDS);

export function getCampusCoords(campus: string): { lat: number; lng: number } {
  const coords = CAMPUS_COORDS[campus];
  if (!coords) {
    throw new Error(`UNKNOWN_CAMPUS:${campus}`);
  }
  return coords;
}