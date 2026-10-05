import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, MapPin, Compass, Search, X, CornerUpRight, Clock, Milestone } from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';

interface NavigationCardProps {
  onSearchDestination: (query: string) => void;
  onStopNavigation: () => void;
}

export const NavigationCard: React.FC<NavigationCardProps> = ({
  onSearchDestination,
  onStopNavigation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const userLocation = useVisionStore((s) => s.userLocation);
  const userAddress = useVisionStore((s) => s.userAddress);
  const activeRoute = useVisionStore((s) => s.activeRoute);
  const isNavigating = useVisionStore((s) => s.isNavigating);
  const currentStepIndex = useVisionStore((s) => s.currentStepIndex);
  const remainingDistanceMeters = useVisionStore((s) => s.remainingDistanceMeters);
  const etaMinutes = useVisionStore((s) => s.etaMinutes);
  const highContrast = useVisionStore((s) => s.highContrast);

  const [destInput, setDestInput] = useState('');

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCoords = userLocation || [40.7128, -74.006];

    const map = L.map(mapContainerRef.current, {
      center: initialCoords,
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    // OpenStreetMap tile layer (cached by Service Worker)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Custom pulsing blue dot marker for live position
    const pulsingDotIcon = L.divIcon({
      className: 'custom-pulsing-marker',
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker(initialCoords, { icon: pulsingDotIcon }).addTo(map);
    markerRef.current = marker;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map on userLocation change
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    if (markerRef.current) {
      markerRef.current.setLatLng(userLocation);
    }

    if (!activeRoute) {
      mapInstanceRef.current.setView(userLocation, mapInstanceRef.current.getZoom(), {
        animate: true,
      });
    }
  }, [userLocation, activeRoute]);

  // Draw or clear route polyline
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (activeRoute && activeRoute.coordinates.length > 0) {
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
      }

      const polyline = L.polyline(activeRoute.coordinates, {
        color: '#2563EB',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapInstanceRef.current);

      routePolylineRef.current = polyline;
      mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    } else {
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
    }
  }, [activeRoute]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destInput.trim()) {
      onSearchDestination(destInput.trim());
      setDestInput('');
    }
  };

  const currentStep = activeRoute?.steps[currentStepIndex];

  return (
    <div
      className={`rounded-[24px] p-6 shadow-sm border transition mb-6 ${
        highContrast
          ? 'bg-black text-white border-yellow-400 border-2'
          : 'bg-white border-slate-200/60'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-md">
            <Navigation className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
              Live Location & Safe Navigation
            </h2>
            <p className="text-xs text-slate-500 font-medium truncate max-w-sm sm:max-w-md">
              {userAddress}
            </p>
          </div>
        </div>

        {/* Destination Search or Cancel Button */}
        {isNavigating ? (
          <button
            onClick={onStopNavigation}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition min-h-[44px]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span>Stop Route</span>
          </button>
        ) : (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                placeholder="Walk to place / address..."
                aria-label="Enter walking destination"
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-3.5 pr-8 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-2.5 text-slate-400 hover:text-blue-600"
                aria-label="Search destination"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Turn-by-Turn Instruction Banner if Navigating */}
      {isNavigating && currentStep && (
        <div className="mb-4 bg-blue-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <CornerUpRight className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Next Instruction ({currentStep.distance}m)
              </div>
              <div className="text-sm sm:text-base font-extrabold leading-tight">
                {currentStep.instruction}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-blue-200 block">Remaining</span>
            <span className="text-base font-extrabold">{remainingDistanceMeters} m</span>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden shadow-inner border border-slate-200/80">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Live Trip Stat Floating Pill */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-slate-200/80 flex items-center gap-4 text-xs font-bold text-slate-800">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span>GPS: High Accuracy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Milestone className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>{isNavigating ? `${remainingDistanceMeters}m Left` : 'Walking Standby'}</span>
          </div>
          {isNavigating && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-violet-600" aria-hidden="true" />
              <span>ETA {etaMinutes} min</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
