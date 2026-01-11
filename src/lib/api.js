import { parseExport } from './protocol.js';

// Get gate IP from environment variable, URL params, or use current hostname
function getGateIP() {
  // In dev mode, use VITE_GATE_IP env var or default to 192.168.88.77
  if (import.meta.env.DEV) {
    const envIP = import.meta.env.VITE_GATE_IP;
    if (envIP) return envIP;
    // Default gate IP for development
    return '192.168.88.81';
  }
  // In production, always use current hostname (the gate's IP when served from the gate)
  // window.location.hostname will be the IP of the ESP32 gate
  return window.location.hostname;
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ca4f2af1-1a02-4219-869c-f5832180426e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:38',message:'fetchNodeData entry',data:{mac,limit,offset},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Do not encode ':' so it matches /api/nodes/<mac>/data on the gate
    const url = `${API_BASE}/nodes/${mac}/data?limit=${limit}&offset=${offset}`;
    console.log('[API] Fetching node data from:', url);
    const res = await fetch(url, {
      headers: {
        Accept: 'application/octet-stream',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET /api/nodes/${mac}/data failed: ${res.status} - ${text}`);
    }
    
    // Get binary data
    const buf = await res.arrayBuffer();
    const parsed = parseExport(buf);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ca4f2af1-1a02-4219-869c-f5832180426e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:56',message:'fetchNodeData parsed',data:{mac,limit,offset,itemsCount:parsed.items?.length,footerCount:parsed.footer.count,lastId:parsed.footer.lastId,firstRecordId:parsed.items?.[0]?.recordId,lastRecordId:parsed.items?.[parsed.items?.length-1]?.recordId,hasMore:parsed.footer.count===limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Return structure compatible with existing code
    return {
      items: parsed.items,
      total: parsed.footer.totalRecordsForMac || parsed.footer.count, // Use totalRecordsForMac if available
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

// Fetch meta information (head_id, interval_ms, etc.)
export async function fetchMeta() {
  try {
    const url = `${API_BASE}/meta`;
    console.log('[API] Fetching meta from:', url);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET /api/meta failed: ${res.status} - ${text}`);
    }
    return await res.json();
  } catch (e) {
    console.error('[API] fetchMeta error:', e);
    throw e;
  }
}

export async function fetchSystem() {
  try {
    const url = `${API_BASE}/system`;
    console.log('[API] Fetching system info from:', url);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET /api/system failed: ${res.status} - ${text}`);
    }
    return await res.json();
  } catch (e) {
    console.error('[API] fetchSystem error:', e);
    throw e;
  }
}

export async function resetGate() {
  try {
    const url = `${API_BASE}/admin/reset`;
    console.log('[API] Reset gate via:', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`POST /api/admin/reset failed: ${res.status} - ${text}`);
    }
    return await res.json();
  } catch (e) {
    console.error('[API] resetGate error:', e);
    throw e;
  }
}

// Calculate record_id range for a specific day
// Returns { sinceId, untilId } or null if intervalMs is 0
// oldestId is optional; if provided, sinceId will not go below oldestId
export function calculateDayRecordRange(selectedDate, headId, intervalMs, nowMs, oldestId) {
  if (intervalMs === 0 || intervalMs === undefined) {
    return null; // Cannot calculate without interval
  }
  
  // Normalize selected date to start of day (00:00:00) and end of day (23:59:59.999) in local time
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  // Если день в будущем — вернем пустой диапазон
  if (dayStartMs > nowMs) {
    return { sinceId: headId, untilId: headId };
  }

  // Алгоритм (UTC опираемся на локальное время браузера):
  // 1) until_id (верхняя граница, более новые):
  //    - если день выбран сегодня: до текущего момента => until_id = headId
  //    - если день в прошлом: до конца того дня => headId - floor((nowMs - dayEndMs)/intervalMs)
  // 2) since_id (нижняя граница, более старые):
  //    - от 00:00 выбранного дня: headId - floor((nowMs - dayStartMs)/intervalMs)
  // 3) гарантируем since_id < until_id

  const intervalsFromNowToStart = Math.floor((nowMs - dayStartMs) / intervalMs);
  const intervalsFromNowToEnd =
    nowMs >= dayEndMs ? Math.floor((nowMs - dayEndMs) / intervalMs) : 0;

  let sinceId = headId - intervalsFromNowToStart;
  let untilId = nowMs >= dayEndMs ? headId - intervalsFromNowToEnd : headId; // если сегодня, до текущего headId

  // Ограничиваем sinceId по старейшему индексу базы, если он известен
  if (typeof oldestId === 'number' && oldestId > 0 && sinceId < oldestId) {
    console.warn('[API] Обнаружен неполный день: sinceId ниже oldest_id, сдвигаю up', {
      oldestId,
      calculatedSince: sinceId,
    });
    sinceId = oldestId;
  }

  // Ограничения: не ниже 0 и упорядочить
  sinceId = Math.max(0, sinceId);
  untilId = Math.max(0, untilId);
  if (untilId <= sinceId) {
    untilId = sinceId + 1;
  }

  console.log('[API] calculateDayRecordRange:', {
    selectedDate: selectedDate.toISOString(),
    dayStart: dayStart.toISOString(),
    dayEnd: dayEnd.toISOString(),
    nowMs: new Date(nowMs).toISOString(),
    intervalsFromNowToStart,
    intervalsFromNowToEnd,
    headId,
    oldestId: oldestId ?? null,
    calculatedSinceId: sinceId,
    calculatedUntilId: untilId,
    rangeSize: untilId - sinceId,
    estimatedHours: (untilId - sinceId) * (intervalMs / (1000 * 60 * 60))
  });
  
  // Ensure sinceId < untilId for range (since_id, until_id]
  // since_id is the lower bound (older), until_id is the upper bound (newer)
  if (sinceId >= untilId) {
    console.warn('[API] Invalid range: sinceId >= untilId', { sinceId, untilId });
    return { sinceId: headId, untilId: headId }; // Empty range
  }
  
  return {
    sinceId: sinceId,
    untilId: untilId
  };
}

// Fetch node data for a specific day using record_id range
export async function fetchNodeDataForDay(mac, selectedDate, meta) {
  try {
    const { head_id: headId, oldest_id: oldestId, interval_ms: intervalMs } = meta;
    const nowMs = Date.now(); // Local browser time
    
    // Calculate record_id range for the selected day
    const range = calculateDayRecordRange(selectedDate, headId, intervalMs, nowMs, oldestId);
    
    if (!range) {
      throw new Error('Cannot calculate record range: interval_ms is 0 or invalid');
    }
    
    // Limit for one day: 24 hours = 86400 seconds, interval 30s = 2880 records
    // With 20% reserve: 2880 * 1.2 = 3456, rounded to 3500
    const url = `${API_BASE}/nodes/${mac}/data?since=${range.sinceId}&until=${range.untilId}&limit=3500`;
    const dayStartDate = new Date(selectedDate);
    dayStartDate.setHours(0, 0, 0, 0);
    const dayEndDate = new Date(selectedDate);
    dayEndDate.setHours(23, 59, 59, 999);
    
    console.log('[API] Fetching data for day:', { 
      date: selectedDate.toISOString(),
      dayStart: dayStartDate.toISOString(),
      dayEnd: dayEndDate.toISOString(),
      nowMs: new Date(nowMs).toISOString(),
      headId,
      intervalMs,
      msFromNowToDayStart: nowMs - dayStartDate.getTime(),
      msFromNowToDayEnd: nowMs - dayEndDate.getTime(),
      sinceId: range.sinceId, 
      untilId: range.untilId,
      recordsRange: range.untilId - range.sinceId,
      estimatedRecords: Math.ceil((range.untilId - range.sinceId) / (intervalMs > 0 ? (86400000 / intervalMs) : 1)),
      url 
    });
    
    const res = await fetch(url, {
      headers: {
        Accept: 'application/octet-stream',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 416) {
        // OUT_OF_RANGE
        return {
          items: [],
          total: 0,
          hasMore: false,
          lastId: 0,
          outOfRange: true
        };
      }
      throw new Error(`GET /api/nodes/${mac}/data failed: ${res.status} - ${text}`);
    }
    
    // Get binary data
    const buf = await res.arrayBuffer();
    const parsed = parseExport(buf);
    
    return {
      items: parsed.items || [],
      total: parsed.footer?.count || 0,
      hasMore: false,
      lastId: parsed.footer?.lastId || 0,
      outOfRange: false
    };
  } catch (e) {
    console.error('[API] fetchNodeDataForDay error:', e);
    throw e;
  }
}

// Find available dates by sampling records from different parts of the range
export async function findAvailableDates(mac, meta) {
  try {
    const { head_id: headId, oldest_id: oldestId, interval_ms: intervalMs } = meta;
    
    if (intervalMs === 0) {
      return []; // Cannot calculate dates without interval
    }
    
    const nowMs = Date.now();
    const dateSet = new Set();
    
    // Sample from different parts: head (newest), middle, oldest
    // Use smaller ranges to avoid loading too much data
    const samplePoints = [
      headId, // Newest
      headId > oldestId ? Math.floor((headId + oldestId) / 2) : headId, // Middle
      oldestId > 0 ? oldestId : headId // Oldest
    ];
    
    console.log('[API] Finding available dates, sampling at points:', samplePoints);
    
    // For each sample point, request a small range and calculate dates
    for (const sampleId of samplePoints) {
      if (sampleId === 0) continue;
      
      // Request small range around sample point (max 50 records per sample)
      const rangeSize = 25; // Half range on each side
      const sinceId = Math.max(oldestId, sampleId - rangeSize);
      const untilId = Math.min(headId, sampleId + rangeSize);
      
      if (sinceId >= untilId) continue;
      
      try {
        const url = `${API_BASE}/nodes/${mac}/data?since=${sinceId}&until=${untilId}`;
        console.log('[API] Sampling dates from range:', { sinceId, untilId, sampleId });
        const res = await fetch(url, {
          headers: {
            Accept: 'application/octet-stream',
          },
          cache: 'no-store',
        });
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const parsed = parseExport(buf);
          
          if (parsed.items && parsed.items.length > 0) {
            // Calculate time for each item (simplified - assume sequential)
            // Items are sorted by recordId ascending, so last item is newest
            const items = parsed.items.map((item, idx) => {
              const recordOffset = parsed.items.length - 1 - idx;
              const calculatedTs = nowMs - (recordOffset * intervalMs);
              return {
                ...item,
                sampleTsMs: calculatedTs
              };
            });
            
            // Extract dates
            items.forEach(item => {
              if (item.sampleTsMs && item.sampleTsMs > 0) {
                const itemDate = new Date(item.sampleTsMs);
                const dateKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}-${itemDate.getDate()}`;
                dateSet.add(dateKey);
              }
            });
          }
        }
      } catch (e) {
        console.warn('[API] Error sampling dates at', sampleId, e);
        // Continue with other samples
      }
    }
    
    // Convert to sorted array of Date objects
    // Important: create dates in local timezone to avoid timezone issues
    const dates = Array.from(dateSet)
      .map(key => {
        const [year, month, day] = key.split('-').map(Number);
        // Create date in local timezone (month is 0-indexed in JS Date)
        const date = new Date(year, month, day);
        // Normalize to start of day
        date.setHours(0, 0, 0, 0);
        return date;
      })
      .sort((a, b) => b.getTime() - a.getTime()); // Sort descending (newest first)
    
    console.log('[API] Found available dates:', dates.length, dates.map(d => {
      const localDate = new Date(d);
      return `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    }));
    return dates;
  } catch (e) {
    console.error('[API] findAvailableDates error:', e);
    return [];
  }
}
