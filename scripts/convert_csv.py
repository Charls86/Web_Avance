import csv
import json

csv_path = r'c:\Users\cezunigaa\Desktop\PAGINA_INCENDIOS\Levantamiento Zonal.csv'
output_path = r'c:\Users\cezunigaa\Desktop\PAGINA_INCENDIOS\src\data\zonalData.js'

vkontos = []

try:
    with open(csv_path, 'r', encoding='utf-8') as f:
        # Check delimiter
        line = f.readline()
        f.seek(0)
        delimiter = ';' if ';' in line else ','
        
        reader = csv.DictReader(f, delimiter=delimiter)
        for row in reader:
            if 'VKONTO' in row:
                vkontos.append(row['VKONTO'].strip())
except Exception as e:
    print(f"Error: {e}")

# Javascript content with optimized Set lookup
js_content = f"""export const ZONAL_TARGETS = {json.dumps(vkontos, indent=2)};

// Create Set once for performance (O(1) lookup)
const targetInts = ZONAL_TARGETS.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
const TARGET_SET = new Set(targetInts.map(String));

export const isTargetClient = (numeroCliente) => {{
  if (!numeroCliente) return false;
  const num = parseInt(numeroCliente, 10);
  if (isNaN(num)) return false;
  return TARGET_SET.has(String(num));
}};
"""

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Successfully wrote {len(vkontos)} records to {output_path}")
