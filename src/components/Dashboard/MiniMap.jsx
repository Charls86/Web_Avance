import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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

  const positions = clientesWithCoords.map(c => [
    parseFloat(c.latitud),
    parseFloat(c.longitud)
  ]);

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
    <div className="h-full rounded-lg overflow-hidden border border-gray-200">
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

        {clientesWithCoords.map((cliente) => (
          <Marker
            key={cliente.id}
            position={[parseFloat(cliente.latitud), parseFloat(cliente.longitud)]}
            icon={customIcon}
            eventHandlers={{
              click: () => onClienteClick && onClienteClick(cliente)
            }}
          >
            <Popup>
              <div className="min-w-[150px]">
                <p className="font-semibold text-gray-900">
                  {cliente.nombre || 'Sin nombre'}
                </p>
                {cliente.numeroCliente && (
                  <p className="text-sm text-gray-600">
                    N° {cliente.numeroCliente}
                  </p>
                )}
                {cliente.direccion && (
                  <p className="text-sm text-gray-500 mt-1">
                    {cliente.direccion}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        <FitBounds positions={positions} />
      </MapContainer>
    </div>
  );
}
