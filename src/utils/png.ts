import { deflateSync } from 'zlib';

/**
 * 最小的 PNG 编码器。 / Minimal PNG encoder.
 * 支持：24bit RGB，无透明通道；直接从 `number[][]`（RGB 三元组）或 / Supports: 24-bit RGB, no alpha channel; directly produces PNG byte stream from `number[][]` (RGB triples) or
 * `Buffer` (length = width*height*3) 产生 PNG 字节流。 / `Buffer` (length = width*height*3).
 *
 * 这个实现只需要 Node.js 内建能力，避免了 @napi-rs/canvas 的安装负担， / This implementation only requires Node.js built-in capabilities, avoiding the installation burden of @napi-rs/canvas,
 * 对验证码这种场景足够快。 / fast enough for captcha scenarios.
 */
export function encodePng(
  width: number,
  height: number,
  pixels: number[] | Uint8Array,
): Buffer {
  // 1) PNG signature
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  // 2) IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type = RGB
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method = none

  // 3) IDAT chunk: 每行前加一个 filter byte (0), 然后是 RGB 数据 / 3) IDAT chunk: prepend a filter byte (0) per row, then RGB data
  const raw = Buffer.alloc((width * 3 + 1) * height);
  const src = Buffer.isBuffer(pixels)
    ? pixels
    : Array.isArray(pixels)
      ? Buffer.from(pixels)
      : Buffer.from(pixels as any);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter byte: none
    src.copy(
      raw,
      y * (width * 3 + 1) + 1,
      y * width * 3,
      y * width * 3 + width * 3,
    );
  }
  const idat = deflateSync(raw);

  // 4) IEND chunk
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    _chunk('IHDR', ihdr),
    _chunk('IDAT', idat),
    _chunk('IEND', iend),
  ]);
}

function _chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(_crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Standard CRC32 (PNG uses this polynomial)
let _crcTable: Uint32Array | null = null;
function _crc32(buf: Buffer): number {
  if (!_crcTable) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    _crcTable = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = _crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
