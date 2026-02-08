import type { GeoProvider } from './GeoProvider';
import { GoogleGeoProvider } from './GoogleGeoProvider';
import { MockGeoProvider } from './MockGeoProvider';

export const createGeoProvider = (): GeoProvider => {
  const provider = (process.env.GEO_PROVIDER || '').toLowerCase();
  console.log('[geo] provider =', (process.env.GEO_PROVIDER || 'mock'));
  if (provider === 'google') {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is required when GEO_PROVIDER=google');
    }
    return new GoogleGeoProvider(apiKey);
  }

  return new MockGeoProvider();
};
