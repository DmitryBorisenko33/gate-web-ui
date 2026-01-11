export function formatTs(ms) {
  if (!ms) return '--';
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds}`;
}

export function formatValue(v) {
  if (v === undefined || v === null) return '--';
  const num = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(num)) return '--';
  if (Math.abs(num) < 1) {
    return num.toFixed(3).replace(/\.?0+$/, '');
  } else if (Math.abs(num) < 100) {
    return num.toFixed(2).replace(/\.?0+$/, '');
  } else {
    return num.toFixed(1).replace(/\.?0+$/, '');
  }
}

export function macToStr(mac) {
  if (typeof mac === 'string') return mac;
  if (Array.isArray(mac)) {
    return mac.map(b => String(b).padStart(2, '0')).join(':');
  }
  return '--';
}





