import { FileSpreadsheet, Download } from 'lucide-react';
import { exportToExcel } from '../../utils/excelFormatter';

export default function ExcelExport({ clientes, disabled }) {
  const handleExport = () => {
    if (clientes.length === 0) return;
    exportToExcel(clientes);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || clientes.length === 0}
      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white
                 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm
                 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      <FileSpreadsheet className="h-4 w-4" />
      Exportar Excel
      {clientes.length > 0 && (
        <span className="bg-green-700 px-2 py-0.5 rounded text-xs">
          {clientes.length}
        </span>
      )}
    </button>
  );
}
