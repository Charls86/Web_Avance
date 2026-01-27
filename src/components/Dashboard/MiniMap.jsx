import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

import { isTargetClient } from '../../data/zonalData';
import { ZONAL_COORDS } from '../../data/zonalCoords';

// Custom marker icon - small circle (blue for non-zonal registered)
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 10px;
    height: 10px;
    background-color: rgba(21, 96, 130, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
    cursor: pointer;
  " class="marker-dot"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
  popupAnchor: [0, -5]
});

// Green icon for registered zonal clients
const greenIcon = L.divIcon({
  className: 'custom-marker-green',
  html: `<div style="
    width: 10px;
    height: 10px;
    background-color: rgba(34, 197, 94, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
    cursor: pointer;
  " class="marker-dot-green"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
  popupAnchor: [0, -5]
});

// Red icon for pending zonal clients (not yet registered)
const redIcon = L.divIcon({
  className: 'custom-marker-red',
  html: `<div style="
    width: 8px;
    height: 8px;
    background-color: rgba(220, 38, 38, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
    cursor: pointer;
  " class="marker-dot-red"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4],
  popupAnchor: [0, -4]
});

// Component to fit bounds to markers
function FitBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [positions, map]);

  return null;
}

export default function MiniMap({ clientes, onClienteClick, fullHeight }) {
  // Filter clients with valid coordinates
  const clientesWithCoords = clientes.filter(c => {
    const lat = parseFloat(c.latitud);
    const lng = parseFloat(c.longitud);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  // Create a Set of registered client numbers for fast lookup
  const registeredClientNumbers = new Set(
    clientes.map(c => parseInt(c.numeroCliente, 10)).filter(n => !isNaN(n))
  );

  // Calculate pending zonal clients (in ZONAL_COORDS but not registered)
  const pendingZonal = ZONAL_COORDS.filter(z => {
    const num = parseInt(z.numeroCliente, 10);
    return !isNaN(num) && !registeredClientNumbers.has(num) &&
           !isNaN(z.latitud) && !isNaN(z.longitud) &&
           z.latitud !== 0 && z.longitud !== 0;
  });

  const positions = clientesWithCoords.map(c => [
    parseFloat(c.latitud),
    parseFloat(c.longitud)
  ]);

  // Include pending positions for bounds calculation
  const allPositions = [
    ...positions,
    ...pendingZonal.map(p => [p.latitud, p.longitud])
  ];

  // Default center (Chile)
  const defaultCenter = [-33.4489, -70.6693];
  const center = positions.length > 0 ? positions[0] : defaultCenter;

  if (clientesWithCoords.length === 0) {
    return (
      <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No hay clientes con coordenadas válidas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg overflow-hidden border border-gray-200 relative">
      {/* Leyenda minimalista */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-gray-200">
        <div className="flex items-center gap-4 text-[10px] text-gray-600">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#156082] opacity-70"></div>
            <span>Registrado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span>Zonal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 opacity-80"></div>
            <span>Pendiente</span>
          </div>
        </div>
      </div>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Pending zonal clients (red markers) */}
        {pendingZonal.map((pending) => (
          <Marker
            key={`pending-${pending.numeroCliente}`}
            position={[pending.latitud, pending.longitud]}
            icon={redIcon}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              <div className="text-xs font-sans">
                <p className="font-bold text-red-600 leading-tight">
                  Pendiente Zonal
                </p>
                <p className="text-gray-600 mt-0.5">
                  N° Cliente: {pending.numeroCliente.replace(/^0+/, '')}
                </p>
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* Registered clients */}
        {clientesWithCoords.map((cliente) => (
          <Marker
            key={cliente.id}
            position={[parseFloat(cliente.latitud), parseFloat(cliente.longitud)]}
            icon={isTargetClient(cliente.numeroCliente) ? greenIcon : customIcon}
            eventHandlers={{
              click: () => onClienteClick && onClienteClick(cliente)
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="text-xs font-sans">
                <p className="font-bold text-gray-900 leading-tight">
                  {cliente.nombre || 'Sin nombre'}
                </p>
                {cliente.numeroCliente && (
                  <p className="text-gray-600 mt-0.5">
                    N° Cliente: {cliente.numeroCliente.toString().replace(/^0+/, '')}
                  </p>
                )}
                {isTargetClient(cliente.numeroCliente) && (
                  <p className="text-green-600 text-[10px] mt-0.5 font-medium">
                    Zonal Registrado
                  </p>
                )}
              </div>
            </Tooltip>
          </Marker>
        ))}

        <FitBounds positions={allPositions.length > 0 ? allPositions : positions} />
      </MapContainer>
    </div>
  );
}
