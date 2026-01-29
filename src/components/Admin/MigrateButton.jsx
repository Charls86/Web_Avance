import { useState } from 'react';
import { migrateToRTDB } from '../../scripts/migrateToRTDB';

export default function MigrateButton() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);

  const handleMigrate = async () => {
    if (!confirm('¿Migrar datos de Firestore a Realtime Database?\n\nEsto copiará todos los clientes y avisos. Los datos en Firestore NO se borran.')) {
      return;
    }

    setMigrating(true);
    setResult(null);

    try {
      const res = await migrateToRTDB();
      setResult(res);
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-semibold text-yellow-800 mb-2">Migración a Realtime Database</h3>
      <p className="text-sm text-yellow-700 mb-3">
        Copia los datos de Firestore a Realtime Database para reducir costos de lectura.
      </p>

      <button
        onClick={handleMigrate}
        disabled={migrating}
        className={`px-4 py-2 rounded font-medium ${migrating
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-yellow-500 text-white hover:bg-yellow-600'
          }`}
      >
        {migrating ? 'Migrando...' : 'Ejecutar Migración'}
      </button>

      {result && (
        <div className={`mt-3 p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result.success ? (
            <>
              <p className="font-medium">✓ Migración exitosa</p>
              <p className="text-sm">{result.clientes} clientes, {result.avisos} avisos migrados</p>
            </>
          ) : (
            <>
              <p className="font-medium">✗ Error en migración</p>
              <p className="text-sm">{result.error}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
