import { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Upload, FileText, Check, AlertCircle, Trash2, Loader2 } from 'lucide-react';

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

export default function AvisosImport() {
  const [archivo, setArchivo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [avisosExistentes, setAvisosExistentes] = useState([]);
  const [cargandoExistentes, setCargandoExistentes] = useState(true);

  // Cargar avisos existentes al montar
  useEffect(() => {
    cargarAvisosExistentes();
  }, []);

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
    </div>
  );
}
