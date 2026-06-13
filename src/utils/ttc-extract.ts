// TTC (TrueType Collection) → 单个 TTF/OTF 提取 / Extract single TTF/OTF from TTC
//
// 因为 opentype.js 不支持 TTC 格式（签名 'ttcf'），我们手动解析 TTC， / Because opentype.js does not support TTC format (signature 'ttcf'), we manually parse TTC,
// 将其中一个字体重建为标准的 SFNT 文件（TTF/OTF）。 / rebuilding one font into a standard SFNT file (TTF/OTF).
//
// SFNT header 结构: / SFNT header structure:
//   sfntVersion:    4 bytes
//   numTables:      2 bytes
//   searchRange:    2 bytes
//   entrySelector:  2 bytes
//   rangeShift:     2 bytes
// Table directory (numTables × 16 bytes):
//   tag:            4 bytes
//   checkSum:       4 bytes
//   offset:         4 bytes
//   length:         4 bytes

import * as fs from 'fs';

function uint32TagToString(tag: number): string {
  return (
    String.fromCharCode((tag >> 24) & 0xff) +
    String.fromCharCode((tag >> 16) & 0xff) +
    String.fromCharCode((tag >> 8) & 0xff) +
    String.fromCharCode(tag & 0xff)
  );
}

function stringToUint32Tag(s: string): number {
  return (
    ((s.charCodeAt(0) & 0xff) << 24) |
    ((s.charCodeAt(1) & 0xff) << 16) |
    ((s.charCodeAt(2) & 0xff) << 8) |
    (s.charCodeAt(3) & 0xff)
  );
}

/**
 * 判断给定文件是否是 TTC 格式。 / Determine whether the given file is in TTC format.
 */
export function isTtcFile(path: string): boolean {
  try {
    const fd = fs.openSync(path, 'r');
    try {
      const header = Buffer.alloc(4);
      fs.readSync(fd, header, 0, 4, 0);
      return header.toString('ascii') === 'ttcf';
    } finally {
      fs.closeSync(fd);
    }
  } catch (e) {
    return false;
  }
}

/**
 * 从 TTC 文件中提取单个字体，返回其字节数组。 / Extract a single font from a TTC file and return its byte array.
 * @param ttcPath TTC 文件路径 / TTC file path
 * @param fontIndex 提取第几个字体（默认 0，建议用 0） / Which font to extract (default 0, recommended 0)
 * @returns 一个可被 opentype.js parse 的 Uint8Array（TTF 或 OTF） / A Uint8Array parseable by opentype.js (TTF or OTF)
 */
export function extractFontFromTtc(
  ttcPath: string,
  fontIndex: number = 0,
): Uint8Array | null {
  try {
    const raw = fs.readFileSync(ttcPath);
    const data = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // 1. 检查签名 / 1. Check signature
    const sig =
      String.fromCharCode(data[0]) +
      String.fromCharCode(data[1]) +
      String.fromCharCode(data[2]) +
      String.fromCharCode(data[3]);
    if (sig !== 'ttcf') {
      // 不是 TTC，可能是普通 TTF/OTF，直接返回 / Not TTC, may be a normal TTF/OTF, return directly
      return data;
    }

    // 2. TTC header: tag(4), version(4), numFonts(4), offset[numFonts](4 each)
    const numFonts = view.getUint32(8, false); // Big Endian
    if (fontIndex < 0 || fontIndex >= numFonts) return null;
    const fontOffset = view.getUint32(12 + fontIndex * 4, false);

    // 3. 解析该字体的 SFNT header / 3. Parse the font's SFNT header
    //    sfntVersion(4) | numTables(2) | searchRange(2) | entrySelector(2) | rangeShift(2)
    let p = fontOffset;
    const sfntVersion = view.getUint32(p, false);
    p += 4;
    const numTables = view.getUint16(p, false);
    p += 2;
    // searchRange/entrySelector/rangeShift 我们重算，直接跳过 / searchRange/entrySelector/rangeShift are recalculated, skip directly
    p += 6;

    // 4. 读取每个表的目录：tag | checkSum | offset | length / 4. Read each table directory: tag | checkSum | offset | length
    interface TableEntry {
      tag: string;
      offset: number;
      length: number;
      data: Uint8Array;
    }
    const tables: TableEntry[] = [];
    for (let i = 0; i < numTables; i++) {
      const tagValue = view.getUint32(p, false);
      p += 4;
      // skip checkSum
      p += 4;
      const offset = view.getUint32(p, false);
      p += 4;
      const length = view.getUint32(p, false);
      p += 4;
      const tag = uint32TagToString(tagValue);
      const tableData = data.slice(offset, offset + length);
      tables.push({ tag, offset, length, data: tableData });
    }

    // 5. 构造一个新的、干净的 SFNT (TTF/OTF) 文件 / 5. Construct a new, clean SFNT (TTF/OTF) file
    //    新文件结构： / New file structure:
    //      - SFNT header: 12 bytes
    //      - Table directory: numTables × 16 bytes
    //      - 表数据：每个表按 4 字节对齐后的数据 / Table data: each table aligned to 4 bytes
    //
    //    计算新的 offset 并写回。 / Calculate new offsets and write back.
    const headerSize = 12 + numTables * 16;
    // 每个表需要按 4 字节对齐 / Each table needs to be aligned to 4 bytes
    let dataOffset = headerSize;
    const tableOffsets: number[] = [];
    for (const t of tables) {
      tableOffsets.push(dataOffset);
      dataOffset += t.length;
      while (dataOffset % 4 !== 0) dataOffset++;
    }

    const out = new Uint8Array(dataOffset);
    const outView = new DataView(out.buffer, out.byteOffset, out.byteLength);

    // SFNT header
    outView.setUint32(0, sfntVersion, false);
    outView.setUint16(4, numTables, false);
    // 计算 searchRange / entrySelector / rangeShift
    let entrySelector = 0;
    let pow = 1;
    while (pow * 2 <= numTables) {
      pow *= 2;
      entrySelector++;
    }
    const searchRange = pow * 16;
    const rangeShift = numTables * 16 - searchRange;
    outView.setUint16(6, searchRange, false);
    outView.setUint16(8, entrySelector, false);
    outView.setUint16(10, rangeShift, false);

    // Table directory
    let pos = 12;
    for (let i = 0; i < numTables; i++) {
      const t = tables[i];
      outView.setUint32(pos, stringToUint32Tag(t.tag), false);
      pos += 4;
      // checkSum: 0（opentype.js 不强制校验） / checkSum: 0 (opentype.js does not enforce verification)
      outView.setUint32(pos, 0, false);
      pos += 4;
      // offset: 相对于新文件开头 / offset: relative to the beginning of the new file
      outView.setUint32(pos, tableOffsets[i], false);
      pos += 4;
      // length
      outView.setUint32(pos, t.length, false);
      pos += 4;
    }

    // Table data
    for (let i = 0; i < numTables; i++) {
      out.set(tables[i].data, tableOffsets[i]);
    }

    return out;
  } catch (e) {
    return null;
  }
}

/**
 * 加载字体：自动识别 TTC / TTF / OTF，返回 opentype.js 可用的字节数组。 / Load font: auto-detect TTC / TTF / OTF, return byte array usable by opentype.js.
 */
export function loadFontBytes(fontPath: string): Uint8Array | null {
  if (isTtcFile(fontPath)) {
    return extractFontFromTtc(fontPath, 0);
  }
  try {
    const raw = fs.readFileSync(fontPath);
    return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  } catch (e) {
    return null;
  }
}
