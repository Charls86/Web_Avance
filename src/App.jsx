import { useState } from 'react';
import { Loader2, AlertCircle, RefreshCw, LayoutDashboard, Users, MapPin, Bell, LogOut, User, FileSpreadsheet, ArrowRight, Folder, TrendingUp, Calendar, CalendarDays } from 'lucide-react';
import { migrateToRTDB } from './scripts/migrateToRTDB';

// Hooks
import { useClientes } from './hooks/useClientes';
import { useAuth } from './hooks/useAuth';

// Utils
import { getDateStats } from './utils/dateHelpers';
import { exportToExcel } from './utils/excelFormatter';
import { ZONAL_TARGETS, isTargetClient } from './data/zonalData';

// Components
import StatsCards from './components/Dashboard/StatsCards';
import MiniMap from './components/Dashboard/MiniMap';
import ClientTable from './components/DataTable/ClientTable';
import ExcelExport from './components/DataTable/ExcelExport';
import ClientDetail from './components/ClientSearch/ClientDetail';
import AvisosImport from './components/Avisos/AvisosImport';
import Login from './components/Auth/Login';
import excelIcon from './assets/4202106excellogomicrosoftms-115582_115719.png';

// Usuario administrador que puede acceder a Avisos
const ADMIN_EMAIL = 'admin_cge@cge.cl';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCliente, setSelectedCliente] = useState(null);

  const { user, loading: authLoading, error: authError, loginMicrosoft, loginEmail, logout } = useAuth();
  const { clientes, loading, error, refetch } = useClientes();
  const [refreshing, setRefreshing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);
  const stats = getDateStats(clientes);

  // Función de migración a Realtime Database
  const handleMigrate = async () => {
    if (!confirm('¿Migrar datos de Firestore a Realtime Database?\n\nEsto copiará todos los clientes y avisos.')) {
      return;
    }
    setMigrating(true);
    setMigrateResult(null);
    try {
      const result = await migrateToRTDB();
      setMigrateResult(result);
      if (result.success) {
        alert(`✓ Migración exitosa!\n${result.clientes} clientes, ${result.avisos} avisos`);
      }
    } catch (err) {
      setMigrateResult({ success: false, error: err.message });
      alert('Error en migración: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  // Calculate Zonal Progress
  const totalZonalTargets = ZONAL_TARGETS.length;
  const registeredZonal = clientes.filter(c => isTargetClient(c.numeroCliente)).length;
  const zonalProgress = totalZonalTargets > 0 ? ((registeredZonal / totalZonalTargets) * 100).toFixed(1) : '0';
  const zonalPending = totalZonalTargets - registeredZonal;

  // Verificar si el usuario es admin
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#156082] animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    return (
      <Login
        onLoginMicrosoft={loginMicrosoft}
        onLoginEmail={loginEmail}
        error={authError}
        loading={authLoading}
      />
    );
  }

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
            onClick={handleRefresh}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#156082]
                       text-white rounded-lg hover:bg-[#0d4a66] transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Reintentar'}
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
            <div className="flex items-center gap-3">
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
                {isAdmin && (
                <button
                  onClick={() => setActiveTab('avisos')}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm
                    ${activeTab === 'avisos'
                      ? 'bg-white text-[#156082] shadow-lg'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <Bell className="h-4 w-4" />
                  Avisos
                </button>
                )}
              </div>

              {/* User info & Logout */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                  <div className="relative">
                    <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-white uppercase">
                        {user.email.split('@')[0].charAt(0)}
                      </span>
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#156082]"></span>
                  </div>
                  <span className="text-sm text-white/90">
                    {user.email.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-white/60 hover:text-white/90 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Stats Cards inline */}
                <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl">
                      <Calendar className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ingresos Hoy</p>
                      <p className="text-3xl font-bold text-green-600">{stats.today.toLocaleString('es-CL')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <CalendarDays className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Últimos 7 días</p>
                      <p className="text-3xl font-bold text-blue-600">{stats.week.toLocaleString('es-CL')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#156082]/20 p-4 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#156082]/10 rounded-xl">
                      <Users className="h-6 w-6 text-[#156082]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Registros</p>
                      <p className="text-3xl font-bold text-[#156082]">{stats.total.toLocaleString('es-CL')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-green-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <p className="text-sm font-medium text-gray-500">Levantamiento Zonal</p>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-3xl font-bold text-green-600">{zonalProgress}%</p>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 rounded-full">
                          <span className="text-xs font-medium text-green-600">{registeredZonal}</span>
                          <span className="text-xs text-gray-400">/</span>
                          <span className="text-xs text-gray-500">{totalZonalTargets}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        <span className="text-[10px] text-gray-500">Pendientes: <span className="font-medium text-red-600">{zonalPending.toLocaleString('es-CL')}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refresh Button Card */}
                <button
                  onClick={handleRefresh}
                  className={`bg-gradient-to-br from-[#156082]/5 to-[#156082]/10 rounded-lg border border-[#156082]/20 p-5 shadow-sm hover:shadow-md hover:border-[#156082]/40 transition-all flex flex-col items-center justify-center gap-2 group ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={refreshing}
                >
                  <div className="p-3 bg-[#156082]/10 rounded-full group-hover:bg-[#156082]/20 transition-colors">
                    <RefreshCw className={`h-6 w-6 text-[#156082] ${refreshing ? 'animate-spin' : ''}`} />
                  </div>
                  <span className="text-sm font-medium text-[#156082]">
                    {refreshing ? 'Actualizando...' : 'Actualizar'}
                  </span>
                </button>
              </div>
            </div>


            {/* Map and Sidebar - fills remaining space */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
              {/* Map - takes 2/3 */}
              <div className="lg:col-span-2 flex flex-col min-h-0">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#156082]" />
                      <h3 className="text-base font-semibold text-gray-900">Mapa de Clientes Registrados</h3>
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
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex-shrink-0">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActiveTab('clientes')}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#156082]/5 hover:bg-[#156082]/10 transition-colors group"
                    >
                      <div className="p-2 bg-[#156082]/10 rounded-lg group-hover:bg-[#156082]/20 transition-colors">
                        <Users className="h-5 w-5 text-[#156082]" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">Clientes</p>
                        <p className="text-xs text-gray-500">{clientes.length}</p>
                      </div>
                    </button>

                    <div
                      onClick={() => {
                        if (clientes.length > 0) {
                          exportToExcel(clientes);
                        }
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group cursor-pointer"
                    >
                      <img src={excelIcon} alt="Excel" className="h-10 w-10 object-contain drop-shadow-sm" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">Exportar</p>
                        <p className="text-xs text-gray-500">Excel</p>
                      </div>
                    </div>

                    <a
                      href="https://grupocge-my.sharepoint.com/:f:/g/personal/cezunigaa_grupocge_cl/IgDZu-iprGeRTaFlUO4qkbohAZP04SEhU6h22KWn14pov2M?e=AAUCrc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all group cursor-pointer"
                    >
                      <Folder className="h-4 w-4 text-gray-500 group-hover:text-[#156082] transition-colors" />
                      <span className="text-xs font-medium text-gray-600 group-hover:text-[#156082] transition-colors">
                        Respaldo SharePoint
                      </span>
                    </a>
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
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-900 truncate pr-2">
                              {cliente.nombre || 'Sin nombre'}
                            </p>
                            {cliente.fechaRegistro && (
                              <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap pt-0.5">
                                {new Date(cliente.fechaRegistro).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
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
        )
        }

        {
          activeTab === 'clientes' && (
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
          )
        }

        {
          activeTab === 'avisos' && isAdmin && (
            <AvisosImport
              onMigrate={handleMigrate}
              migrating={migrating}
              userEmail={user?.email}
            />
          )
        }
      </main >

      {/* Client Detail Modal */}
      {
        selectedCliente && (
          <ClientDetail
            cliente={selectedCliente}
            onClose={() => setSelectedCliente(null)}
          />
        )
      }

    </div >
  );
}

export default App;
