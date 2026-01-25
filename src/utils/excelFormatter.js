import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatDate } from './dateHelpers';

// Column order and labels for Excel export
const EXCEL_COLUMNS = [
  { key: 'numeroCliente', label: 'N° Cliente' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'rut', label: 'RUT' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'correo', label: 'Correo' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'telefono2', label: 'Teléfono 2' },
  { key: 'marca', label: 'Marca' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'medidorInstalado', label: 'Medidor Instalado' },
  { key: 'medidorRetirado', label: 'Medidor Retirado' },
  { key: 'poste', label: 'Poste' },
  { key: 'aviso', label: 'Aviso' },
  { key: 'comentarios', label: 'Comentarios' },
  { key: 'latitud', label: 'Latitud' },
  { key: 'longitud', label: 'Longitud' },
  { key: 'fechaRegistro', label: 'Fecha Registro' },
  { key: 'solicitante', label: 'Solicitante' },
  { key: 'origenDatos', label: 'Origen Datos' },
  { key: 'relacion', label: 'Relación' }
];

// Fields to exclude from export
const EXCLUDE_FIELDS = ['fotoUrl', 'fotoUrls', 'id'];

export function exportToExcel(clientes, filename) {
  // Transform data for Excel
  const excelData = clientes.map(cliente => {
    const row = {};

    EXCEL_COLUMNS.forEach(col => {
      let value = cliente[col.key];

      // Format dates
      if (col.key === 'fechaRegistro' && value) {
        value = formatDate(value);
      }

      // Handle undefined/null
      if (value === undefined || value === null) {
        value = '';
      }

      row[col.label] = value;
    });

    return row;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = EXCEL_COLUMNS.map(col => ({
    wch: Math.max(col.label.length, 15)
  }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

  // Generate filename with date
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const finalFilename = filename || `catastro_${dateStr}.xlsx`;

  // Write and download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, finalFilename);
}

// Export with custom columns
export function exportToExcelCustom(clientes, columns, filename) {
  const excelData = clientes.map(cliente => {
    const row = {};

    columns.forEach(col => {
      let value = cliente[col.key];

      // Format dates
      if (value instanceof Date) {
        value = formatDate(value);
      }

      // Handle undefined/null
      if (value === undefined || value === null) {
        value = '';
      }

      // Skip excluded fields
      if (!EXCLUDE_FIELDS.includes(col.key)) {
        row[col.label] = value;
      }
    });

    return row;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, filename || 'export.xlsx');
}
