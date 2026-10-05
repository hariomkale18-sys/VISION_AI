import { useCallback, useEffect, useRef } from 'react';
import { useVisionStore } from '../stores/useVisionStore';
import { searchAddress } from '../services/geocode';
import { calculateDistanceBetweenPoints, getWalkingRoute } from '../services/routing';

export function useNavigation(speak: (text: string, isUrgent?: boolean) => void) {
  const userLocation = useVisionStore((s) => s.userLocation);
  const activeRoute = useVisionStore((s) => s.activeRoute);
  const isNavigating = useVisionStore((s) => s.isNavigating);
  const currentStepIndex = useVisionStore((s) => s.currentStepIndex);
  const setActiveRoute = useVisionStore((s) => s.setActiveRoute);
  const setNavigating = useVisionStore((s) => s.setNavigating);
  const setCurrentStepIndex = useVisionStore((s) => s.setCurrentStepIndex);
  const setRemainingDistanceMeters = useVisionStore((s) => s.setRemainingDistanceMeters);
  const setEtaMinutes = useVisionStore((s) => s.setEtaMinutes);
  const addRecentActivity = useVisionStore((s) => s.addRecentActivity);

  const announcedWithin20mRef = useRef<boolean>(false);
  const isReroutingRef = useRef<boolean>(false);

  // Start route to destination
  const navigateToDestination = useCallback(
    async (destinationQuery: string) => {
      if (!destinationQuery) return;
      const startLoc = userLocation || [40.7128, -74.006]; // default NYC if GPS not yet granted

      speak(`Searching walking route to ${destinationQuery}`);

      try {
        const results = await searchAddress(destinationQuery);
        let destCoords: [number, number];
        let destName = destinationQuery;

        if (results.length > 0) {
          destCoords = [results[0].lat, results[0].lng];
          destName = results[0].displayName.split(',')[0];
        } else {
          // Offsets for demo if geocoder returns no direct hit
          destCoords = [startLoc[0] + 0.005, startLoc[1] + 0.005];
        }

        const route = await getWalkingRoute(startLoc[0], startLoc[1], destCoords[0], destCoords[1], destName);

        if (route) {
          setActiveRoute(route);
          setNavigating(true);
          setCurrentStepIndex(0);
          setRemainingDistanceMeters(route.totalDistanceMeters);
          setEtaMinutes(Math.ceil(route.totalDurationSeconds / 60));
          announcedWithin20mRef.current = false;

          const firstStep = route.steps[0]?.instruction || `Head towards ${destName}`;
          speak(`Route found to ${destName}. Distance: ${route.totalDistanceMeters} metres. ${firstStep}`);

          addRecentActivity({
            action: 'Walking Route Started',
            details: `Navigating to ${destName} (${route.totalDistanceMeters}m)`,
            status: 'Active',
            iconType: 'nav',
          });
        } else {
          speak(`Sorry, could not calculate a walking route to ${destinationQuery}`);
        }
      } catch (err) {
        console.warn('Navigation planning error:', err);
        speak(`Error planning route to ${destinationQuery}`);
      }
    },
    [addRecentActivity, setActiveRoute, setCurrentStepIndex, setEtaMinutes, setNavigating, setRemainingDistanceMeters, speak, userLocation]
  );

  const stopNavigation = useCallback(() => {
    setNavigating(false);
    setActiveRoute(null);
    setCurrentStepIndex(0);
    speak('Walking navigation ended');
    addRecentActivity({
      action: 'Navigation Ended',
      details: 'Route ended by user',
      status: 'Completed',
      iconType: 'nav',
    });
  }, [addRecentActivity, setActiveRoute, setCurrentStepIndex, setNavigating, speak]);

  // Turn-by-turn guidance loop
  useEffect(() => {
    if (!isNavigating || !activeRoute || !userLocation) return;

    const steps = activeRoute.steps;
    if (!steps || steps.length === 0) return;

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    // Check distance to next step location
    const distToStep = calculateDistanceBetweenPoints(
      userLocation[0],
      userLocation[1],
      currentStep.location[0],
      currentStep.location[1]
    );

    // If within 10 metres of step, advance to next step
    if (distToStep < 10) {
      if (currentStepIndex < steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        announcedWithin20mRef.current = false;
        const nextStep = steps[nextIndex];
        speak(`In ${nextStep.distance} metres, ${nextStep.instruction}`);
      } else {
        // Arrived!
        speak(`You have arrived at your destination, ${activeRoute.destinationName}`);
        stopNavigation();
      }
      return;
    }

    // Re-announce when within 20m of next turn
    if (distToStep <= 20 && !announcedWithin20mRef.current) {
      announcedWithin20mRef.current = true;
      speak(`In 20 metres, ${currentStep.instruction}`);
    }

    // Check minimum distance to polyline for off-route (>30m)
    let minDistanceToRoute = Infinity;
    for (const point of activeRoute.coordinates) {
      const d = calculateDistanceBetweenPoints(userLocation[0], userLocation[1], point[0], point[1]);
      if (d < minDistanceToRoute) {
        minDistanceToRoute = d;
      }
    }

    if (minDistanceToRoute > 30 && !isReroutingRef.current) {
      isReroutingRef.current = true;
      speak('Off route. Rerouting.');
      getWalkingRoute(
        userLocation[0],
        userLocation[1],
        activeRoute.destinationCoords[0],
        activeRoute.destinationCoords[1],
        activeRoute.destinationName
      ).then((newRoute) => {
        isReroutingRef.current = false;
        if (newRoute) {
          setActiveRoute(newRoute);
          setCurrentStepIndex(0);
          announcedWithin20mRef.current = false;
          speak(`Rerouted. ${newRoute.steps[0]?.instruction || 'Continue walking'}`);
        }
      });
    }
  }, [
    activeRoute,
    currentStepIndex,
    isNavigating,
    setActiveRoute,
    setCurrentStepIndex,
    speak,
    stopNavigation,
    userLocation,
  ]);

  return {
    navigateToDestination,
    stopNavigation,
  };
}
