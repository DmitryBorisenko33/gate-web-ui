// Binary protocol parser for ESP32 gate /export endpoint.
// Comments in English per project rule.

const MAGIC_HDR = 0x32424447; // 'GDB2'
const MAGIC_FOOTER = 0x32444e45; // 'END2'
const DB_RECORD_MAX_PAYLOAD_LEN = 40;

function readU64LEToNumber(dv, off) {
  const lo = dv.getUint32(off + 0, true);
  const hi = dv.getUint32(off + 4, true);
  // Safe as long as record_id stays below 2^53 (it will, in any realistic lifetime).
  return hi * 2 ** 32 + lo;
}

function macToStr(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':');
}

// Simple CRC32 implementation
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function parseExport(buf) {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);

  if (u8.byteLength < 8 + 20) {
    throw new Error('Export too small');
  }

  const magic = dv.getUint32(0, true);
  const ver = dv.getUint16(4, true);
  const recSize = dv.getUint16(6, true);
  if (magic !== MAGIC_HDR) throw new Error('Bad header magic');
  if (ver !== 2) throw new Error(`Unsupported version: ${ver}`);
  if (recSize < 20) throw new Error(`Unexpected record_size: ${recSize}`);

  const footerOff = u8.byteLength - 20;
  const footerMagic = dv.getUint32(footerOff + 0, true);
  if (footerMagic !== MAGIC_FOOTER) throw new Error('Bad footer magic');
  const count = dv.getUint32(footerOff + 4, true);
  const crc32Footer = dv.getUint32(footerOff + 8, true) >>> 0;
  const lastId = readU64LEToNumber(dv, footerOff + 12);

  const itemsOff = 8;
  const itemsLen = footerOff - itemsOff;
  const itemSize = 8 + recSize; // id + record
  if (itemsLen % itemSize !== 0) throw new Error('Bad items length');
  const n = itemsLen / itemSize;
  if (count !== n) {
    // Not fatal, but suspicious.
    // We trust the actual byte stream.
  }

  // CRC32 is computed over concatenated item bytes (id+record), same as on gate.
  const itemsBytes = u8.subarray(itemsOff, footerOff);
  const crcCalc = crc32(itemsBytes);
  if (crcCalc !== crc32Footer) {
    console.warn(`CRC32 mismatch: calc=0x${crcCalc.toString(16)} footer=0x${crc32Footer.toString(16)}`);
  }

  const items = [];
  let p = itemsOff;
  for (let i = 0; i < n; i++) {
    const recordId = readU64LEToNumber(dv, p);
    p += 8;

    const timestampMs = readU64LEToNumber(dv, p);
    p += 8;
    const sessionId = dv.getUint16(p, true);
    p += 2;
    const dtMs = dv.getUint32(p, true);
    p += 4;
    // db_record_t: mac[6], rssi(i8), format_version(u8), sensor_type_id(u16), payload_len(u8), payload[40]
    const mac = macToStr(u8.subarray(p, p + 6));
    p += 6;
    const rssi = dv.getInt8(p);
    p += 1;
    const formatVersion = dv.getUint8(p);
    p += 1;
    const sensorTypeId = dv.getUint16(p, true);
    p += 2;
    const payloadLen = dv.getUint8(p);
    p += 1;

    // payload is at offset p, length payloadLen (max 40)
    if (payloadLen > DB_RECORD_MAX_PAYLOAD_LEN) throw new Error('Payload out of bounds');
    const payload = u8.slice(p, p + payloadLen);
    // advance to next record: skip full payload area (40 bytes fixed)
    p += DB_RECORD_MAX_PAYLOAD_LEN;

    items.push({recordId, timestampMs, sessionId, dtMs, mac, rssi, formatVersion, sensorTypeId, payloadLen, payload});
  }

  return {items, footer: {count: n, crc32: crc32Footer, lastId}};
}

