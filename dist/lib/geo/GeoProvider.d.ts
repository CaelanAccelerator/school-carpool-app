export interface GeoAutocompleteResult {
    placeId: string;
    label: string;
}
export interface GeoPlaceDetails {
    placeId: string;
    label: string;
    address: string;
    lat: number;
    lng: number;
}
export interface GeoProvider {
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
//# sourceMappingURL=GeoProvider.d.ts.map