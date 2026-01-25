import { useState } from 'react';
import { Loader2, AlertCircle, RefreshCw, LayoutDashboard, Users, MapPin } from 'lucide-react';

// Hooks
import { useClientes } from './hooks/useClientes';

// Utils
import { getDateStats } from './utils/dateHelpers';

// Components
import StatsCards from './components/Dashboard/StatsCards';
import MiniMap from './components/Dashboard/MiniMap';
import ClientTable from './components/DataTable/ClientTable';
import ExcelExport from './components/DataTable/ExcelExport';
import ClientDetail from './components/ClientSearch/ClientDetail';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCliente, setSelectedCliente] = useState(null);

  const { clientes, loading, error, refetch } = useClientes();
  const stats = getDateStats(clientes);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#156082] animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Error al cargar datos
          </h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#156082]
                       text-white rounded-lg hover:bg-[#0d4a66] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 flex flex-col ${activeTab === 'dashboard' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* Header Hero */}
      <header className="bg-[#156082] text-white flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Sistema de Catastro</h1>
                <p className="text-white/70 text-xs">Gestión de clientes y registros</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm
                  ${activeTab === 'dashboard'
                    ? 'bg-white text-[#156082] shadow-lg'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('clientes')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm
                  ${activeTab === 'clientes'
                    ? 'bg-white text-[#156082] shadow-lg'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <Users className="h-4 w-4" />
                Clientes
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 ${activeTab === 'dashboard' ? 'min-h-0 overflow-hidden' : ''}`}>
        {activeTab === 'dashboard' && (
          <div className="h-full flex flex-col gap-4">
            {/* Stats */}
            <div className="flex-shrink-0">
              <StatsCards stats={stats} />
            </div>

            {/* Map and Sidebar - fills remaining space */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
              {/* Map - takes 2/3 */}
              <div className="lg:col-span-2 flex flex-col min-h-0">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#156082]" />
                      <h3 className="text-base font-semibold text-gray-900">Mapa de Clientes</h3>
                    </div>
                    <span className="text-xs text-gray-500">
                      {clientes.filter(c => c.latitud && c.longitud).length} ubicaciones
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <MiniMap
                      clientes={clientes}
                      onClienteClick={(cliente) => setSelectedCliente(cliente)}
                      fullHeight
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar - takes 1/3 */}
              <div className="flex flex-col gap-3 min-h-0">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex-shrink-0">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    Acciones Rápidas
                  </h3>
                  <div className="space-y-2">
                    <ExcelExport clientes={clientes} />

                    <button
                      onClick={() => setActiveTab('clientes')}
                      className="w-full px-3 py-2 text-sm border border-gray-300
                                 rounded-lg hover:bg-gray-50 transition-colors
                                 text-left font-medium text-gray-700"
                    >
                      Ver todos los clientes ({clientes.length})
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex-1 overflow-hidden flex flex-col min-h-0">
                  <h3 className="text-base font-semibold text-gray-900 mb-2 flex-shrink-0">
                    Últimos Registros
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                    {clientes.slice(0, 15).map((cliente) => (
                      <div
                        key={cliente.id}
                        onClick={() => setSelectedCliente(cliente)}
                        className="flex items-center gap-2 p-2 rounded-lg
                                   hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#156082]/10
                                        flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-[#156082]">
                            {(cliente.nombre || 'N')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {cliente.nombre || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {cliente.direccion || cliente.numeroCliente || '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Listado de Clientes
                </h2>
                <p className="text-gray-600">
                  {clientes.length} clientes registrados
                </p>
              </div>
              <ExcelExport clientes={clientes} />
            </div>

            {/* Table */}
            <ClientTable
              clientes={clientes}
              onViewCliente={(cliente) => setSelectedCliente(cliente)}
            />
          </div>
        )}
      </main>

      {/* Client Detail Modal */}
      {selectedCliente && (
        <ClientDetail
          cliente={selectedCliente}
          onClose={() => setSelectedCliente(null)}
        />
      )}
    </div>
  );
}

export default App;
