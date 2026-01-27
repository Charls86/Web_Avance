const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, '..', 'Levantamiento Zonal.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.trim().split('\n');
const header = lines[0].split(';');

// Generate data array
const data = [];
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (cols.length >= 4) {
    const vkonto = cols[1]; // numero cliente
    const lat = cols[2];    // COORX = latitud
    const lng = cols[3];    // COORY = longitud

    if (vkonto && lat && lng) {
      data.push({
        numeroCliente: vkonto.trim(),
        latitud: parseFloat(lat.trim()),
        longitud: parseFloat(lng.trim())
      });
    }
  }
}

// Generate JS file content
const jsContent = `// Auto-generated from Levantamiento Zonal.csv
// Total: ${data.length} registros zonales con coordenadas

export const ZONAL_COORDS = [
${data.map(d => `  { numeroCliente: "${d.numeroCliente}", latitud: ${d.latitud}, longitud: ${d.longitud} }`).join(',\n')}
];

// Create a Map for O(1) lookup by numeroCliente (as integer)
const coordsMap = new Map();
ZONAL_COORDS.forEach(item => {
  const num = parseInt(item.numeroCliente, 10);
  if (!isNaN(num)) {
    coordsMap.set(num, item);
  }
});

export const getZonalCoords = (numeroCliente) => {
  const num = parseInt(numeroCliente, 10);
  if (isNaN(num)) return null;
  return coordsMap.get(num) || null;
};

export const getAllZonalCoords = () => ZONAL_COORDS;
`;

// Write output file
const outputPath = path.join(__dirname, '..', 'src', 'data', 'zonalCoords.js');
fs.writeFileSync(outputPath, jsContent, 'utf-8');

console.log(`Generated ${outputPath} with ${data.length} records`);
