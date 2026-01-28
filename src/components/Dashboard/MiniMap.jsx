import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Tooltip, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Maximize2, Minimize2 } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
// (Mantener solo por si acaso se usa en otro lado, pero ya no usaremos Marker iconos pesados aquí)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

import { isTargetClient } from '../../data/zonalData';
import { ZONAL_COORDS } from '../../data/zonalCoords';

// Colores para los círculos
const COLORS = {
  registered: { fillColor: "#156082", color: "#ffffff" },
  zonal: { fillColor: "#22c55e", color: "#ffffff" },
  pending: { fillColor: "#dc2626", color: "#ffffff" }
};

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
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Effect to handle escape key to exit full screen
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    if (isExpanded) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isExpanded]);


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
    <div
      className={`
        rounded-lg overflow-hidden border border-gray-200 relative bg-white
        transition-all duration-300 ease-in-out
        ${isExpanded
          ? 'fixed inset-0 z-[2000] h-screen w-screen rounded-none border-0'
          : 'h-full w-full'
        }
      `}
    >


      {/* Leyenda minimalista */}
      {/* Leyenda minimalista */}
      <div className="absolute bottom-4 left-4 z-[2000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-100 ring-1 ring-black/5">
        <p className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Registro Aplicación Formularios</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[10px] text-gray-600 font-medium">
          <div className="flex items-center gap-1.5" title="Registro App General (No del levantamiento Zonal)">
            <div className="w-3 h-3 rounded-full bg-[#156082] opacity-80 border border-white shadow-sm"></div>
            <span>Registrado General</span>
          </div>
          <div className="flex items-center gap-1.5" title="Siniestrado Registrado en App">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm"></div>
            <span>Siniestrado Registrado</span>
          </div>
          <div className="flex items-center gap-1.5" title="Siniestrado Pendiente de Registro en App">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-80 border border-white shadow-sm"></div>
            <span>Siniestrado NO Registrado</span>
          </div>
        </div>
      </div>

      <MapContainer
        key={isExpanded ? 'expanded' : 'normal'}
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        preferCanvas={true} // IMPORTANTE: Usa Canvas en lugar de DOM para performance brutal
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Pending zonal clients (red circles) */}
        {pendingZonal.map((pending) => (
          <CircleMarker
            key={`pending-${pending.numeroCliente}`}
            center={[pending.latitud, pending.longitud]}
            radius={4}
            fillColor={COLORS.pending.fillColor}
            color={COLORS.pending.color}
            weight={1}
            opacity={1}
            fillOpacity={0.7}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
              <div className="text-xs font-sans">
                <p className="font-bold text-red-600 leading-tight">Pendiente Zonal</p>
                <p className="text-gray-600 mt-0.5">N°: {pending.numeroCliente.replace(/^0+/, '')}</p>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Registered clients */}
        {clientesWithCoords.map((cliente) => {
          const isZonal = isTargetClient(cliente.numeroCliente);
          const style = isZonal ? COLORS.zonal : COLORS.registered;

          return (
            <CircleMarker
              key={cliente.id}
              center={[parseFloat(cliente.latitud), parseFloat(cliente.longitud)]}
              radius={isZonal ? 6 : 5} // Un poco más grandes los zonales
              fillColor={style.fillColor}
              color={style.color}
              weight={1}
              opacity={1}
              fillOpacity={0.8}
              eventHandlers={{
                click: () => onClienteClick && onClienteClick(cliente)
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                <div className="text-xs font-sans">
                  <p className="font-bold text-gray-900 leading-tight">{cliente.nombre || 'Sin nombre'}</p>
                  <p className="text-gray-600 mt-0.5">{cliente.direccion}</p>
                  {isZonal && <p className="text-green-600 text-[10px] mt-0.5 font-bold">Zonal Registrado</p>}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        <FitBounds positions={allPositions.length > 0 ? allPositions : positions} />
      </MapContainer>
    </div>
  );
}
