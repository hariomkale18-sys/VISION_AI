/**
 * Nominatim OpenStreetMap Geocoder
 * Provides forward address search and reverse geocoding.
 */

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) throw new Error('Geocoding search failed');
    const data = await res.json();

    return data.map((item: any) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.warn('Nominatim search error:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) throw new Error('Reverse geocode failed');
    const data = await res.json();

    const road = data.address?.road || data.address?.pedestrian || data.address?.suburb || '';
    const city = data.address?.city || data.address?.town || data.address?.village || '';
    const state = data.address?.state || '';

    if (road && city) {
      return `${road}, ${city}`;
    }
    return data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.warn('Reverse geocode error:', error);
    return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
