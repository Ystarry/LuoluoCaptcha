/**
 * GIF 编码器包装（基于 omggif）。 / GIF encoder wrapper (based on omggif).
 */
import { GifWriter } from 'omggif';

export class GifEncoder {
  private readonly width: number;
  private readonly height: number;
  private readonly delay: number; // centiseconds (1/100 s)
  private readonly loop: number;

  private writer: GifWriter | null = null;
  private buf: Buffer;
  private palette: number[];

  constructor(width: number, height: number, delayMs = 100, loopCount = 0) {
    this.width = width;
    this.height = height;
    this.delay = Math.max(1, Math.round(delayMs / 10));
    this.loop = loopCount;

    // 6x6x6 cube palette + grays
    const pal: number[] = [];
    const levels = [0, 51, 102, 153, 204, 255];
    for (const r of levels) {
      for (const g of levels) {
        for (const b of levels) {
          pal.push((r << 16) | (g << 8) | b);
        }
      }
    }
    while (pal.length < 256) {
      const gray = Math.floor(pal.length * (255 / 128));
      pal.push((gray << 16) | (gray << 8) | gray);
    }
    this.palette = pal;

    // 预分配一个足够大的 buffer（验证码 GIF 通常 < 100KB） / Pre-allocate a sufficiently large buffer (captcha GIFs are usually < 100KB)
    this.buf = Buffer.alloc(1024 * 1024);
    this.writer = new GifWriter(this.buf, width, height, {
      palette: this.palette,
      loop: this.loop,
      background: 215,
    });
  }

  public addFrame(pixels: number[] | Uint8Array): void {
    const w = this.width;
    const h = this.height;
    const indexed = new Uint8Array(w * h);
    for (let i = 0; i < indexed.length; i++) {
      indexed[i] = this._nearest(
        (pixels as any)[i * 3],
        (pixels as any)[i * 3 + 1],
        (pixels as any)[i * 3 + 2],
      );
    }

    this.writer!.addFrame(0, 0, w, h, Array.from(indexed), {
      delay: this.delay,
      disposal: 2,
    });
  }

  public finish(): Buffer {
    this.writer!.end();
    const pos = (this.writer as any).getOutputBufferPosition();
    return this.buf.slice(0, pos);
  }

  private _nearest(r: number, g: number, b: number): number {
    const r6 = Math.min(5, Math.floor((r | 0) / 51));
    const g6 = Math.min(5, Math.floor((g | 0) / 51));
    const b6 = Math.min(5, Math.floor((b | 0) / 51));
    return (36 * r6 + 6 * g6 + b6) & 0xff;
  }
}
