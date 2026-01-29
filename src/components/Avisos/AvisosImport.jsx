import { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { Upload, FileText, Check, AlertCircle, Trash2, Loader2, Search, X, Image, AlertTriangle } from 'lucide-react';

// Normalizar numeroCliente a 12 dígitos con ceros a la izquierda
const normalizarNumeroCliente = (numero) => {
  if (!numero) return '';
  return numero.toString().replace(/\D/g, '').padStart(12, '0');
};

// Parsear CSV
const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase());
  const numClienteIdx = headers.findIndex(h =>
    h.includes('cliente') || h.includes('numero') || h === 'numerocliente'
  );
  const avisoIdx = headers.findIndex(h => h.includes('aviso'));

  if (numClienteIdx === -1 || avisoIdx === -1) {
    throw new Error('CSV debe tener columnas: numeroCliente, aviso');
  }

  const registros = [];
  for (let i = 1; i < lines.length; i++) {
    const valores = lines[i].split(/[,;]/).map(v => v.trim().replace(/"/g, ''));
    const numeroCliente = normalizarNumeroCliente(valores[numClienteIdx]);
    const aviso = valores[avisoIdx]?.trim() || '';

    if (numeroCliente && aviso) {
      registros.push({ numeroCliente, aviso });
    }
  }

  return registros;
};

// Extraer path de Storage desde URL de Firebase
const getStoragePathFromUrl = (url) => {
  try {
    const decodedUrl = decodeURIComponent(url);
    const matches = decodedUrl.match(/\/o\/(.+?)\?/);
    if (matches && matches[1]) {
      return matches[1];
    }
  } catch (e) {
    console.error('Error parsing storage URL:', e);
  }
  return null;
};

// Usuario autorizado para eliminar registros
const ADMIN_DELETE_EMAIL = 'admin_cge@cge.cl';

export default function AvisosImport({ userEmail }) {
  const [archivo, setArchivo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [avisosExistentes, setAvisosExistentes] = useState([]);
  const [cargandoExistentes, setCargandoExistentes] = useState(true);

  // Estados para gestión de clientes
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteAEliminar, setClienteAEliminar] = useState(null);
  const [eliminandoCliente, setEliminandoCliente] = useState(false);

  // Verificar si el usuario puede eliminar
  const canDelete = userEmail?.toLowerCase() === ADMIN_DELETE_EMAIL.toLowerCase();

  // Cargar avisos existentes al montar
  useEffect(() => {
    cargarAvisosExistentes();
  }, []);

  // Cargar clientes cuando se busca
  const buscarClientes = async () => {
    if (!busquedaCliente.trim()) return;

    setCargandoClientes(true);
    try {
      const snapshot = await getDocs(collection(db, 'clientes'));
      const todos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrar por búsqueda
      const busqueda = busquedaCliente.toLowerCase().trim();
      const filtrados = todos.filter(c =>
        c.numeroCliente?.toLowerCase().includes(busqueda) ||
        c.nombre?.toLowerCase().includes(busqueda) ||
        c.direccion?.toLowerCase().includes(busqueda)
      ).slice(0, 20); // Limitar a 20 resultados

      setClientes(filtrados);
    } catch (error) {
      console.error('Error buscando clientes:', error);
    } finally {
      setCargandoClientes(false);
    }
  };

  // Obtener fotos de un cliente
  const getClientePhotos = (cliente) => {
    const photos = [];
    if (cliente?.fotoUrl) photos.push(cliente.fotoUrl);
    if (cliente?.fotoUrls && Array.isArray(cliente.fotoUrls)) {
      cliente.fotoUrls.forEach(url => {
        if (!photos.includes(url)) photos.push(url);
      });
    }
    return photos;
  };

  // Eliminar cliente y sus fotos
  const eliminarCliente = async () => {
    if (!clienteAEliminar || !canDelete) return;

    setEliminandoCliente(true);

    try {
      // 1. Eliminar fotos de Storage
      const fotos = getClientePhotos(clienteAEliminar);
      for (const fotoUrl of fotos) {
        const storagePath = getStoragePathFromUrl(fotoUrl);
        if (storagePath) {
          try {
            const fotoReference = storageRef(storage, storagePath);
            await deleteObject(fotoReference);
            console.log('Foto eliminada:', storagePath);
          } catch (err) {
            console.warn('No se pudo eliminar foto:', err.message);
          }
        }
      }

      // 2. Eliminar documento de Firestore (Cloud Function sincronizará con RTDB)
      await deleteDoc(doc(db, 'clientes', clienteAEliminar.id));

      // 3. Actualizar lista local y limpiar
      setClientes(prev => prev.filter(c => c.id !== clienteAEliminar.id));
      setClienteAEliminar(null);
      setResultado({ tipo: 'exito', mensaje: `Cliente ${clienteAEliminar.numeroCliente || clienteAEliminar.id} eliminado correctamente` });

    } catch (error) {
      console.error('Error eliminando cliente:', error);
      setResultado({ tipo: 'error', mensaje: 'Error al eliminar: ' + error.message });
    } finally {
      setEliminandoCliente(false);
    }
  };

  // Limpiar al cerrar modal
  const cerrarModalEliminar = () => {
    setClienteAEliminar(null);
  };

  const cargarAvisosExistentes = async () => {
    setCargandoExistentes(true);
    try {
      const snapshot = await getDocs(collection(db, 'avisos'));
      const avisos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvisosExistentes(avisos);
    } catch (error) {
      console.error('Error cargando avisos:', error);
    } finally {
      setCargandoExistentes(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivo(file);
    setResultado(null);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setRegistros(parsed);
    } catch (error) {
      setResultado({ tipo: 'error', mensaje: error.message });
      setRegistros([]);
    }
  };

  const subirAvisos = async () => {
    if (registros.length === 0) return;

    setCargando(true);
    setResultado(null);

    try {
      let exitosos = 0;
      let errores = 0;

      for (const registro of registros) {
        try {
          // Usar numeroCliente como ID del documento para fácil consulta
          const docRef = doc(db, 'avisos', registro.numeroCliente);
          await setDoc(docRef, {
            numeroCliente: registro.numeroCliente,
            aviso: registro.aviso,
            fechaCarga: new Date().toISOString()
          });
          exitosos++;
        } catch (err) {
          console.error('Error guardando aviso:', err);
          errores++;
        }
      }

      setResultado({
        tipo: 'exito',
        mensaje: `${exitosos} avisos cargados correctamente${errores > 0 ? `, ${errores} errores` : ''}`
      });

      // Recargar lista de avisos existentes
      await cargarAvisosExistentes();

      // Limpiar formulario
      setArchivo(null);
      setRegistros([]);

    } catch (error) {
      setResultado({ tipo: 'error', mensaje: error.message });
    } finally {
      setCargando(false);
    }
  };

  const eliminarAviso = async (id) => {
    if (!confirm('¿Eliminar este aviso?')) return;

    try {
      await deleteDoc(doc(db, 'avisos', id));
      await cargarAvisosExistentes();
    } catch (error) {
      console.error('Error eliminando aviso:', error);
    }
  };

  const eliminarTodos = async () => {
    if (!confirm(`¿Eliminar los ${avisosExistentes.length} avisos? Esta acción no se puede deshacer.`)) return;

    setCargando(true);
    try {
      for (const aviso of avisosExistentes) {
        await deleteDoc(doc(db, 'avisos', aviso.id));
      }
      await cargarAvisosExistentes();
      setResultado({ tipo: 'exito', mensaje: 'Todos los avisos eliminados' });
    } catch (error) {
      setResultado({ tipo: 'error', mensaje: error.message });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Avisos</h2>
          <p className="text-gray-600">Importar avisos desde SAP para actualizar la app</p>
        </div>
      </div>

      {/* Importar CSV */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-[#156082]" />
          Importar CSV
        </h3>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="csv-input"
            />
            <label
              htmlFor="csv-input"
              className="cursor-pointer flex flex-col items-center"
            >
              <FileText className="h-12 w-12 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                {archivo ? archivo.name : 'Seleccionar archivo CSV'}
              </span>
              <span className="text-xs text-gray-400 mt-1">
                Columnas requeridas: numeroCliente, aviso
              </span>
            </label>
          </div>

          {registros.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Vista previa ({registros.length} registros)
              </p>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">N° Cliente</th>
                      <th className="px-3 py-2 text-left">Aviso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-t border-gray-200">
                        <td className="px-3 py-2 font-mono">{r.numeroCliente}</td>
                        <td className="px-3 py-2">{r.aviso}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {registros.length > 10 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    ... y {registros.length - 10} más
                  </p>
                )}
              </div>

              <button
                onClick={subirAvisos}
                disabled={cargando}
                className="mt-4 w-full px-4 py-2 bg-[#156082] text-white rounded-lg
                         hover:bg-[#0d4a66] transition-colors disabled:opacity-50
                         flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Subir {registros.length} avisos
                  </>
                )}
              </button>
            </div>
          )}

          {resultado && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${
              resultado.tipo === 'exito'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {resultado.tipo === 'exito'
                ? <Check className="h-5 w-5" />
                : <AlertCircle className="h-5 w-5" />
              }
              {resultado.mensaje}
            </div>
          )}
        </div>
      </div>

      {/* Avisos existentes */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Avisos en App ({avisosExistentes.length})
          </h3>
          {avisosExistentes.length > 0 && (
            <button
              onClick={eliminarTodos}
              disabled={cargando}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar todos
            </button>
          )}
        </div>

        {cargandoExistentes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : avisosExistentes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay avisos cargados</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">N° Cliente</th>
                  <th className="px-3 py-2 text-left">Aviso</th>
                  <th className="px-3 py-2 text-left">Fecha Carga</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {avisosExistentes.map((aviso) => (
                  <tr key={aviso.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono">{aviso.numeroCliente}</td>
                    <td className="px-3 py-2">{aviso.aviso}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {aviso.fechaCarga
                        ? new Date(aviso.fechaCarga).toLocaleDateString('es-CL')
                        : '-'
                      }
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => eliminarAviso(aviso.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Eliminar Registros de Clientes - Solo para admin */}
      {canDelete && (
      <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Eliminar Registros de Clientes
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Busca un cliente por número, nombre o dirección para eliminarlo junto con sus fotos.
        </p>

        {/* Buscador */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarClientes()}
              placeholder="Buscar por número, nombre o dirección..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>
          <button
            onClick={buscarClientes}
            disabled={cargandoClientes || !busquedaCliente.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {cargandoClientes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>

        {/* Resultados */}
        {clientes.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">N° Cliente</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Dirección</th>
                  <th className="px-3 py-2 text-center">Fotos</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-t border-gray-200 hover:bg-red-50">
                    <td className="px-3 py-2 font-mono text-xs">{cliente.numeroCliente || '-'}</td>
                    <td className="px-3 py-2">{cliente.nombre || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]">{cliente.direccion || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Image className="h-3 w-3" />
                        {getClientePhotos(cliente).length}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setClienteAEliminar(cliente)}
                        className="text-red-600 hover:text-red-800 p-1 hover:bg-red-100 rounded"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {busquedaCliente && clientes.length === 0 && !cargandoClientes && (
          <p className="text-gray-500 text-center py-4">No se encontraron clientes</p>
        )}
      </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {clienteAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
              <button
                onClick={cerrarModalEliminar}
                className="ml-auto p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">N° Cliente:</span>{' '}
                  <span className="font-mono">{clienteAEliminar.numeroCliente || '-'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Nombre:</span>{' '}
                  {clienteAEliminar.nombre || '-'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Dirección:</span>{' '}
                  {clienteAEliminar.direccion || '-'}
                </p>
              </div>

              {getClientePhotos(clienteAEliminar).length > 0 && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                  <Image className="h-5 w-5" />
                  <span className="text-sm">
                    Se eliminarán {getClientePhotos(clienteAEliminar).length} foto(s) asociadas
                  </span>
                </div>
              )}

              <p className="text-sm text-red-600 font-medium">
                ¿Estás seguro de que deseas eliminar este registro permanentemente?
              </p>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={cerrarModalEliminar}
                disabled={eliminandoCliente}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarCliente}
                disabled={eliminandoCliente}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {eliminandoCliente ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
