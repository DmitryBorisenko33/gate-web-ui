import { parseExport } from './protocol.js';

// Get gate IP from environment variable, URL params, or use current hostname
function getGateIP() {
  // In dev mode, use VITE_GATE_IP env var or default to 192.168.88.77
  if (import.meta.env.DEV) {
    const envIP = import.meta.env.VITE_GATE_IP;
    if (envIP) return envIP;
    // Default gate IP for development
    return '192.168.88.77';
  }
  // In production, use URL param or current hostname
  const params = new URLSearchParams(window.location.search);
  const gateIP = params.get('gate') || window.location.hostname;
  return gateIP;
}

const API_BASE = `http://${getGateIP()}:8081/api`;

console.log('[API] Base URL:', API_BASE);

export async function fetchNodes() {
  try {
    console.log('[API] Fetching nodes from:', `${API_BASE}/nodes`);
    const res = await fetch(`${API_BASE}/nodes`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET /api/nodes failed: ${res.status} - ${text}`);
    }
    const data = await res.json();
    console.log('[API] Nodes response:', data);
    return data;
  } catch (e) {
    console.error('[API] fetchNodes error:', e);
    throw e;
  }
}

export async function fetchNodeData(mac, limit = 200, offset = 0) {
  try {
    // Do not encode ':' so it matches /api/nodes/<mac>/data on the gate
    const url = `${API_BASE}/nodes/${mac}/data?limit=${limit}&offset=${offset}`;
    console.log('[API] Fetching node data from:', url);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET /api/nodes/${mac}/data failed: ${res.status} - ${text}`);
    }
    
    // Get binary data
    const buf = await res.arrayBuffer();
    const parsed = parseExport(buf);
    
    // Return structure compatible with existing code
    return {
      items: parsed.items,
      total: parsed.footer.count,
      hasMore: parsed.footer.count === limit,
      lastId: parsed.footer.lastId
    };
  } catch (e) {
    console.error('[API] fetchNodeData error:', e);
    throw e;
  }
}

export async function fetchNodeLatest(mac) {
  try {
    // Do not encode ':' so it matches /api/nodes/<mac>/latest on the gate
    const url = `${API_BASE}/nodes/${mac}/latest`;
    console.log('[API] Fetching node latest from:', url);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET /api/nodes/${mac}/latest failed: ${res.status} - ${text}`);
    }
    return await res.json();
  } catch (e) {
    console.error('[API] fetchNodeLatest error:', e);
    throw e;
  }
}

export async function fetchSchema(sensorTypeId) {
  try {
    const url = `${API_BASE}/schema?type=${sensorTypeId}`;
    console.log('[API] Fetching schema from:', url);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET /api/schema failed: ${res.status} - ${text}`);
    }
    return await res.json();
  } catch (e) {
    console.error('[API] fetchSchema error:', e);
    throw e;
  }
}

