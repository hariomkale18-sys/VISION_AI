import { NavigationRoute, NavigationStep } from '../types';

/**
 * Public OSRM Walking Route Service (foot profile)
 */
export async function getWalkingRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  destinationName: string
): Promise<NavigationRoute | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);

    if (!res.ok) throw new Error('OSRM routing failed');
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );

    const steps: NavigationStep[] = [];
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      for (const legStep of route.legs[0].steps) {
        const stepCoords: [number, number] = [
          legStep.maneuver.location[1],
          legStep.maneuver.location[0],
        ];

        let instruction = legStep.maneuver.instruction || '';
        if (!instruction) {
          const type = legStep.maneuver.type || 'turn';
          const modifier = legStep.maneuver.modifier || '';
          const name = legStep.name ? ` onto ${legStep.name}` : '';

          if (type === 'depart') {
            instruction = `Head ${modifier || 'forward'}${name}`;
          } else if (type === 'arrive') {
            instruction = `You have arrived at ${destinationName}`;
          } else {
            instruction = `Turn ${modifier || 'ahead'}${name}`;
          }
        }

        steps.push({
          instruction,
          distance: Math.round(legStep.distance),
          duration: Math.round(legStep.duration),
          location: stepCoords,
          type: legStep.maneuver.type || 'turn',
          modifier: legStep.maneuver.modifier,
        });
      }
    }

    return {
      destinationName,
      destinationCoords: [destLat, destLng],
      coordinates,
      totalDistanceMeters: Math.round(route.distance),
      totalDurationSeconds: Math.round(route.duration),
      steps,
    };
  } catch (error) {
    console.warn('OSRM walking route error:', error);
    // Provide a calculated direct line route if OSRM is blocked/offline
    const dist = calculateDistanceBetweenPoints(startLat, startLng, destLat, destLng);
    return {
      destinationName,
      destinationCoords: [destLat, destLng],
      coordinates: [
        [startLat, startLng],
        [destLat, destLng],
      ],
      totalDistanceMeters: Math.round(dist),
      totalDurationSeconds: Math.round((dist / 1.3)), // ~1.3 m/s walking speed
      steps: [
        {
          instruction: `Walk straight towards ${destinationName}`,
          distance: Math.round(dist),
          duration: Math.round(dist / 1.3),
          location: [startLat, startLng],
          type: 'depart',
        },
        {
          instruction: `You have arrived at ${destinationName}`,
          distance: 0,
          duration: 0,
          location: [destLat, destLng],
          type: 'arrive',
        },
      ],
    };
  }
}

export function calculateDistanceBetweenPoints(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
