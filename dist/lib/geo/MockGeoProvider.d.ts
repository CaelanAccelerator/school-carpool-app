import { GeoAutocompleteResult, GeoPlaceDetails, GeoProvider } from './GeoProvider';
export declare class MockGeoProvider implements GeoProvider {
    private haversineDistanceKm;
    autocomplete(query: string, limit?: number): Promise<GeoAutocompleteResult[]>;
    placeDetails(placeId: string): Promise<GeoPlaceDetails>;
    routeDurationMins(origin: {
        lat: number;
        lng: number;
    }, dest: {
        lat: number;
        lng: number;
    }): Promise<number>;
    detourExtraMins(origin: {
        lat: number;
        lng: number;
    }, waypoint: {
        lat: number;
        lng: number;
    }, dest: {
        lat: number;
        lng: number;
    }): Promise<{
        baseMins: number;
        viaMins: number;
        extraMins: number;
    }>;
}
//# sourceMappingURL=MockGeoProvider.d.ts.map