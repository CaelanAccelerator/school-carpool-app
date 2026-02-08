import { GeoAutocompleteResult, GeoPlaceDetails, GeoProvider } from './GeoProvider';

type MockPlace = GeoPlaceDetails;

const SPEED_KMH = 35;
const OVERHEAD_MINS = 2;
const EARTH_RADIUS_KM = 6371;

const MOCK_PLACES: MockPlace[] = [
  {
    placeId: 'ubc-campus',
    label: 'University of British Columbia (UBC) Campus',
    address: '2329 West Mall, Vancouver, BC V6T 1Z4, Canada',
    lat: 49.2606,
    lng: -123.2460
  },
  {
    placeId: 'ubc-bookstore',
    label: 'UBC Bookstore',
    address: '6200 University Blvd, Vancouver, BC V6T 1Z4, Canada',
    lat: 49.2602,
    lng: -123.2405
  },
  {
    placeId: 'ubc-aquatic',
    label: 'UBC Aquatic Centre',
    address: '6080 Student Union Blvd, Vancouver, BC V6T 1Z1, Canada',
    lat: 49.2667,
    lng: -123.2485
  },
  {
    placeId: 'kitsilano',
    label: 'Kitsilano Beach',
    address: '1499 Arbutus St, Vancouver, BC V6J 5N2, Canada',
    lat: 49.2744,
    lng: -123.1545
  },
  {
    placeId: 'granville-island',
    label: 'Granville Island Public Market',
    address: '1689 Johnston St, Vancouver, BC V6H 3R9, Canada',
    lat: 49.2723,
    lng: -123.1340
  },
  {
    placeId: 'downtown-waterfront',
    label: 'Waterfront Station',
    address: '601 W Cordova St, Vancouver, BC V6B 1G1, Canada',
    lat: 49.2856,
    lng: -123.1116
  },
  {
    placeId: 'metrotown',
    label: 'Metropolis at Metrotown',
    address: '4700 Kingsway, Burnaby, BC V5H 4N2, Canada',
    lat: 49.2266,
    lng: -123.0036
  },
  {
    placeId: 'ubc-hospital',
    label: 'UBC Hospital',
    address: '2211 Wesbrook Mall, Vancouver, BC V6T 2B5, Canada',
    lat: 49.2647,
    lng: -123.2480
  },
  {
    placeId: 'gas-town',
    label: 'Gastown Steam Clock',
    address: '305 Water St, Vancouver, BC V6B 1B9, Canada',
    lat: 49.2844,
    lng: -123.1087
  },
  {
    placeId: 'canada-place',
    label: 'Canada Place',
    address: '999 Canada Pl, Vancouver, BC V6C 3T4, Canada',
    lat: 49.2888,
    lng: -123.1114
  }
];

export class MockGeoProvider implements GeoProvider {
  private haversineDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);

    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

    return EARTH_RADIUS_KM * c;
  }

  async autocomplete(query: string, limit = 5): Promise<GeoAutocompleteResult[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return MOCK_PLACES.filter((place) => {
      return (
        place.label.toLowerCase().includes(normalized) ||
        place.address.toLowerCase().includes(normalized)
      );
    })
      .slice(0, Math.max(1, limit))
      .map((place) => ({
        placeId: place.placeId,
        label: place.label
      }));
  }

  async placeDetails(placeId: string): Promise<GeoPlaceDetails> {
    const match = MOCK_PLACES.find((place) => place.placeId === placeId);
    if (!match) {
      const error = new Error('NOT_FOUND');
      throw error;
    }

    return match;
  }

  async routeDurationMins(
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number }
  ): Promise<number> {
    const distanceKm = this.haversineDistanceKm(origin, dest);
    const minutes = (distanceKm / SPEED_KMH) * 60 + OVERHEAD_MINS;
    return Math.ceil(minutes);
  }

  async detourExtraMins(
    origin: { lat: number; lng: number },
    waypoint: { lat: number; lng: number },
    dest: { lat: number; lng: number }
  ): Promise<{ baseMins: number; viaMins: number; extraMins: number }> {
    const baseMins = await this.routeDurationMins(origin, dest);
    const viaMins =
      (await this.routeDurationMins(origin, waypoint)) +
      (await this.routeDurationMins(waypoint, dest));
    const extraMins = Math.max(0, viaMins - baseMins);

    return { baseMins, viaMins, extraMins };
  }
}
