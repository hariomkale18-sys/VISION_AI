import { useEffect, useRef } from 'react';
import { useVisionStore } from '../stores/useVisionStore';
import { useStatsStore } from '../store/statsStore';
import { reverseGeocode } from '../services/geocode';

// Haversine formula for exact distance between two GPS coordinates in metres
function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
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

export function useGeolocation() {
  const setUserLocation = useVisionStore((s) => s.setUserLocation);
  const setUserHeading = useVisionStore((s) => s.setUserHeading);
  const setUserAddress = useVisionStore((s) => s.setUserAddress);

  const lastValidFixRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const lastGeocodeTimeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading } = pos.coords;
        const now = Date.now();

        // 1. Ignore readings with accuracy worse than 25 m
        if (accuracy > 25) {
          console.debug(`Skipping GPS reading: accuracy too low (${accuracy}m > 25m)`);
          return;
        }

        const currentCoords: [number, number] = [latitude, longitude];
        setUserLocation(currentCoords);

        if (heading !== null && !isNaN(heading)) {
          setUserHeading(heading);
        }

        // 2. Real Distance Walked calculation
        if (lastValidFixRef.current) {
          const timeElapsedSec = (now - lastValidFixRef.current.time) / 1000;
          const distMeters = haversineDistanceMeters(
            lastValidFixRef.current.lat,
            lastValidFixRef.current.lng,
            latitude,
            longitude
          );

          if (timeElapsedSec > 0) {
            const speedMps = distMeters / timeElapsedSec;

            // Ignore jumps that imply a speed above 10 m/s (36 km/h)
            if (speedMps > 10) {
              console.debug(
                `Skipping GPS jump: implied speed ${speedMps.toFixed(1)} m/s > 10 m/s`
              );
              // Reset baseline without adding jump distance
              lastValidFixRef.current = { lat: latitude, lng: longitude, time: now };
            } else if (distMeters >= 2.5) {
              // Valid walking movement (> 2.5m threshold to avoid GPS standing jitter)
              useStatsStore.getState().addDistanceWalked(distMeters);
              lastValidFixRef.current = { lat: latitude, lng: longitude, time: now };
            }
          }
        } else {
          lastValidFixRef.current = { lat: latitude, lng: longitude, time: now };
        }

        // Reverse geocode throttle (every 30 seconds)
        if (now - lastGeocodeTimeRef.current > 30000) {
          lastGeocodeTimeRef.current = now;
          reverseGeocode(latitude, longitude).then((addr) => {
            setUserAddress(addr);
          });
        }
      },
      (err) => {
        console.warn('Geolocation watchPosition error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [setUserAddress, setUserHeading, setUserLocation]);
}
