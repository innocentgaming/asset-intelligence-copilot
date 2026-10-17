import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import { MapPoint } from '../../types';

// Fix Leaflet's broken default icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapVizProps {
  points: MapPoint[];
  title?: string;
}

const BoundsHandler: React.FC<{ points: MapPoint[] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    try {
      const validPoints = points.filter(p => !isNaN(p.lat) && !isNaN(p.lon));
      if (validPoints.length === 0) return;

      if (validPoints.length === 1) {
        map.setView([validPoints[0].lat, validPoints[0].lon], 13);
      } else {
        const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lon]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    } catch (e) {
      console.warn('Map fit bounds warning:', e);
    }
  }, [points, map]);

  return null;
};

export const MapViz: React.FC<MapVizProps> = ({ points = [], title }) => {
  const validPoints = points.filter(p => p && !isNaN(p.lat) && !isNaN(p.lon));
  const defaultCenter: [number, number] = validPoints.length > 0
    ? [validPoints[0].lat, validPoints[0].lon]
    : [31.8, -102.3]; // Default Permian Basin coordinates

  const showPermanentLabels = validPoints.length <= 8;

  return (
    <div className="bg-industrial-900 light:bg-white border border-industrial-800 light:border-slate-200 rounded-xl p-4 shadow-lg my-3">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200 light:text-slate-800">
            {title || `Geospatial Incident Map (${validPoints.length} locations)`}
          </h4>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {validPoints.length} assets mapped
        </span>
      </div>

      {/* Map view */}
      <div className="h-80 w-full rounded-lg overflow-hidden border border-industrial-800 light:border-slate-300 relative z-0">
        <MapContainer
          center={defaultCenter}
          zoom={10}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsHandler points={validPoints} />

          {validPoints.map((pt, idx) => {
            const markerColor = pt.color || '#ef4444';
            return (
              <CircleMarker
                key={`${pt.lat}-${pt.lon}-${idx}`}
                center={[pt.lat, pt.lon]}
                radius={8}
                pathOptions={{
                  color: markerColor,
                  fillColor: markerColor,
                  fillOpacity: 0.85,
                  weight: 2,
                }}
              >
                {showPermanentLabels && (
                  <LeafletTooltip
                    permanent
                    direction="top"
                    offset={[0, -10]}
                    className="font-mono text-[10px] font-semibold"
                  >
                    {pt.label}
                  </LeafletTooltip>
                )}
                <Popup>
                  <div className="p-1 space-y-1">
                    <p className="font-bold text-amber-400 font-mono text-xs border-b border-industrial-700 pb-1">
                      {pt.label}
                    </p>
                    <p className="text-slate-200 text-xs leading-relaxed">
                      {pt.detail}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Coord: {pt.lat.toFixed(4)}, {pt.lon.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
