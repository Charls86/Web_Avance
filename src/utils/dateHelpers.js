// Format date to DD/MM/YYYY
export function formatDate(date) {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

// Format date to YYYY-MM-DD (for inputs)
export function formatDateISO(date) {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return '';

  return d.toISOString().split('T')[0];
}

// Check if date is today
export function isToday(date) {
  if (!date) return false;

  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();

  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
}

// Check if date is within last N days
export function isWithinDays(date, days) {
  if (!date) return false;

  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= days && diffDays >= 0;
}

// Check if date is this week (last 7 days)
export function isThisWeek(date) {
  return isWithinDays(date, 7);
}

// Get stats from dates
export function getDateStats(clientes) {
  const stats = {
    today: 0,
    week: 0,
    total: clientes.length
  };

  clientes.forEach(cliente => {
    const fecha = cliente.fechaRegistro;
    if (isToday(fecha)) {
      stats.today++;
      stats.week++;
    } else if (isThisWeek(fecha)) {
      stats.week++;
    }
  });

  return stats;
}
