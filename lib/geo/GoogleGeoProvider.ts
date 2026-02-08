import type { GeoAutocompleteResult, GeoPlaceDetails, GeoProvider } from './GeoProvider';

type LatLng = { lat: number; lng: number };

type LocationInput = string | LatLng | { placeId: string };

type DetourInfo = {
  baseMins: number;
  viaMins: number;
  extraDetourMins: number;
};

class GoogleGeoError extends Error {
  constructor(message: string, public readonly meta?: Record<string, unknown>) {
    super(message);
    this.name = 'GoogleGeoError';
  }
}

type CacheEntry<T> = { value: T; expiresAt: number };

class TTLCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T) {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

export class GoogleGeoProvider implements GeoProvider {
  private readonly apiKey: string;

  private readonly durationCache = new TTLCache<number>(5 * 60 * 1000);
  private readonly detourCache = new TTLCache<DetourInfo>(5 * 60 * 1000);

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('GoogleGeoProvider requires GOOGLE_MAPS_API_KEY');
    this.apiKey = apiKey;
  }

  async autocomplete(query: string, limit = 5): Promise<GeoAutocompleteResult[]> {
    const normalized = query.trim();
    if (!normalized) return [];

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', normalized);
    url.searchParams.set('key', this.apiKey);

    const data = await this.fetchJson<any>(url.toString());
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new GoogleGeoError('Places Autocomplete returned non-OK status', {
        status: data.status,
        error_message: data.error_message
      });
    }

    const results = Array.isArray(data.predictions) ? data.predictions : [];
    return results
      .slice(0, Math.max(1, limit))
      .map((prediction: any) => ({
        placeId: prediction.place_id,
        label: prediction.description
      }));
  }

  async placeDetails(placeId: string): Promise<GeoPlaceDetails> {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'place_id,name,formatted_address,geometry');
    url.searchParams.set('key', this.apiKey);

    const data = await this.fetchJson<any>(url.toString());
    if (data.status !== 'OK') {
      throw new GoogleGeoError('Place Details returned non-OK status', {
        status: data.status,
        error_message: data.error_message
      });
    }

    const result = data.result;
    if (!result?.geometry?.location) {
      throw new GoogleGeoError('Place Details missing geometry', { result });
    }

    return {
      placeId: result.place_id,
      label: result.name,
      address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng
    };
  }

  async routeDurationMins(origin: LatLng, dest: LatLng): Promise<number> {
    return this.duration(origin, dest);
  }

  async detourExtraMins(
    origin: LatLng,
    waypoint: LatLng,
    dest: LatLng
  ): Promise<{ baseMins: number; viaMins: number; extraMins: number }> {
    const detour = await this.detour(origin, waypoint, dest);
    return {
      baseMins: detour.baseMins,
      viaMins: detour.viaMins,
      extraMins: detour.extraDetourMins
    };
  }

  private async duration(origin: LocationInput, destination: LocationInput): Promise<number> {
    const o = this.formatLocation(origin);
    const d = this.formatLocation(destination);
    const cacheKey = `dur|${o}|${d}`;
    const cached = this.durationCache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const mins = await this.durationViaDistanceMatrix(o, d);
      this.durationCache.set(cacheKey, mins);
      return mins;
    } catch {
      const mins = await this.durationViaDirections(o, d);
      this.durationCache.set(cacheKey, mins);
      return mins;
    }
  }

  private async detour(
    driverOrigin: LocationInput,
    passengerStop: LocationInput,
    campusDest: LocationInput
  ): Promise<DetourInfo> {
    const o = this.formatLocation(driverOrigin);
    const w = this.formatLocation(passengerStop);
    const d = this.formatLocation(campusDest);

    const cacheKey = `detour|${o}|${w}|${d}`;
    const cached = this.detourCache.get(cacheKey);
    if (cached) return cached;

    const baseMins = await this.duration(driverOrigin, campusDest);
    const viaMins = await this.durationWithWaypointViaDirections(o, w, d);

    const extraDetourMins = Math.max(0, viaMins - baseMins);
    const out: DetourInfo = { baseMins, viaMins, extraDetourMins };
    this.detourCache.set(cacheKey, out);
    return out;
  }

  private async durationViaDistanceMatrix(origin: string, destination: string): Promise<number> {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', origin);
    url.searchParams.set('destinations', destination);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('mode', 'driving');

    const data = await this.fetchJson<any>(url.toString());
    if (data.status !== 'OK') {
      throw new GoogleGeoError('Distance Matrix API returned non-OK status', {
        status: data.status,
        error_message: data.error_message
      });
    }

    const row = data.rows?.[0];
    const element = row?.elements?.[0];
    const elStatus = element?.status;

    if (elStatus !== 'OK') {
      throw new GoogleGeoError('Distance Matrix element non-OK', { elementStatus: elStatus });
    }

    const seconds: number | undefined =
      element?.duration_in_traffic?.value ?? element?.duration?.value;

    if (typeof seconds !== 'number') {
      throw new GoogleGeoError('Distance Matrix missing duration value', { element });
    }

    return this.secondsToMinutes(seconds);
  }

  private async durationViaDirections(origin: string, destination: string): Promise<number> {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    url.searchParams.set('key', this.apiKey);

    const data = await this.fetchJson<any>(url.toString());
    if (data.status !== 'OK') {
      throw new GoogleGeoError('Directions API returned non-OK status', {
        status: data.status,
        error_message: data.error_message
      });
    }

    const route = data.routes?.[0];
    const leg = route?.legs?.[0];
    const seconds: number | undefined = leg?.duration?.value;

    if (typeof seconds !== 'number') {
      throw new GoogleGeoError('Directions missing duration', { route, leg });
    }

    return this.secondsToMinutes(seconds);
  }

  private async durationWithWaypointViaDirections(
    origin: string,
    waypoint: string,
    destination: string
  ): Promise<number> {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    url.searchParams.set('waypoints', waypoint);
    url.searchParams.set('key', this.apiKey);

    const data = await this.fetchJson<any>(url.toString());
    if (data.status !== 'OK') {
      throw new GoogleGeoError('Directions (waypoint) returned non-OK status', {
        status: data.status,
        error_message: data.error_message
      });
    }

    const route = data.routes?.[0];
    const legs = route?.legs;

    if (!Array.isArray(legs) || legs.length < 2) {
      throw new GoogleGeoError('Directions waypoint route missing legs', { legs });
    }

    const seconds0 = legs[0]?.duration?.value;
    const seconds1 = legs[1]?.duration?.value;

    if (typeof seconds0 !== 'number' || typeof seconds1 !== 'number') {
      throw new GoogleGeoError('Directions waypoint legs missing duration', { legs });
    }

    return this.secondsToMinutes(seconds0 + seconds1);
  }

  private secondsToMinutes(seconds: number): number {
    return Math.max(0, Math.ceil(seconds / 60));
  }

  private formatLocation(input: LocationInput): string {
    if (typeof input === 'string') return input;
    if ('placeId' in input && typeof input.placeId === 'string') return `place_id:${input.placeId}`;
    if ('lat' in input && 'lng' in input && typeof input.lat === 'number' && typeof input.lng === 'number') return `${input.lat},${input.lng}`;
    throw new GoogleGeoError('Unsupported location input', { input });
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    const text = await res.text();
    let json: any;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new GoogleGeoError('Google API returned non-JSON response', {
        status: res.status,
        bodySnippet: text.slice(0, 200)
      });
    }

    if (!res.ok) {
      throw new GoogleGeoError('Google API HTTP error', {
        httpStatus: res.status,
        body: json
      });
    }

    return json as T;
  }
}
