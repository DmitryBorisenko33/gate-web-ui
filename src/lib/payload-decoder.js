// Decode binary payload by schema into JavaScript object
// Comments in English per project rule

// Field type constants (must match device_schema.h)
const FIELD_I8 = 0;
const FIELD_U8 = 1;
const FIELD_I16 = 2;
const FIELD_U16 = 3;
const FIELD_I32 = 4;
const FIELD_U32 = 5;

/**
 * Decode binary payload according to sensor schema
 * @param {Uint8Array} payload - Binary payload data
 * @param {Object} schema - Sensor schema with fields array
 * @returns {Object} Decoded values object {key: value}
 */
export function decodePayload(payload, schema) {
  if (!payload || !schema || !schema.fields) {
    return {};
  }

  const values = {};
  let payloadOffset = 0;
  // Create DataView from payload directly (payload is already a Uint8Array with correct bounds)
  const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  for (let i = 0; i < schema.fields.length; i++) {
    const field = schema.fields[i];
    if (!field || !field.key) continue;
    if (payloadOffset >= payload.length) break;

    let raw = 0;
    let valid = false;
    const fieldType = field.type || (field.type === 'i8' ? FIELD_I8 :
                                    field.type === 'u8' ? FIELD_U8 :
                                    field.type === 'i16' ? FIELD_I16 :
                                    field.type === 'u16' ? FIELD_U16 :
                                    field.type === 'i32' ? FIELD_I32 :
                                    field.type === 'u32' ? FIELD_U32 : -1);

    // Handle string type names from API (e.g., "i8", "u16")
    let typeNum = fieldType;
    if (typeof fieldType === 'string') {
      typeNum = fieldType === 'i8' ? FIELD_I8 :
                fieldType === 'u8' ? FIELD_U8 :
                fieldType === 'i16' ? FIELD_I16 :
                fieldType === 'u16' ? FIELD_U16 :
                fieldType === 'i32' ? FIELD_I32 :
                fieldType === 'u32' ? FIELD_U32 : -1;
    }

    switch (typeNum) {
      case FIELD_I8:
        if (payloadOffset + 1 <= payload.length) {
          raw = dv.getInt8(payloadOffset);
          payloadOffset += 1;
          valid = true;
        }
        break;
      case FIELD_U8:
        if (payloadOffset + 1 <= payload.length) {
          raw = dv.getUint8(payloadOffset);
          payloadOffset += 1;
          valid = true;
        }
        break;
      case FIELD_I16:
        if (payloadOffset + 2 <= payload.length) {
          raw = dv.getInt16(payloadOffset, true); // little-endian
          payloadOffset += 2;
          valid = true;
        }
        break;
      case FIELD_U16:
        if (payloadOffset + 2 <= payload.length) {
          raw = dv.getUint16(payloadOffset, true); // little-endian
          payloadOffset += 2;
          valid = true;
        }
        break;
      case FIELD_I32:
        if (payloadOffset + 4 <= payload.length) {
          raw = dv.getInt32(payloadOffset, true); // little-endian
          payloadOffset += 4;
          valid = true;
        }
        break;
      case FIELD_U32:
        if (payloadOffset + 4 <= payload.length) {
          raw = dv.getUint32(payloadOffset, true); // little-endian
          payloadOffset += 4;
          valid = true;
        }
        break;
    }

    if (valid) {
      let val = raw;
      const scale = field.scale || 1.0;
      if (scale !== 0.0 && scale !== 1.0) {
        val = val * scale;
      }
      values[field.key] = val;
    }
  }

  return values;
}

