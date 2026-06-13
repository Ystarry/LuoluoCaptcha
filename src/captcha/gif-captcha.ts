import { Captcha } from '../base/captcha';
import { FontManager } from '../utils/font-manager';
import {
  RgbaImage,
  drawTextWithFont,
  measureTextWithFont,
  computeBaselineY,
} from '../utils/draw';
import { GifEncoder } from '../utils/gif';

/**
 * 英文图形验证码（GIF）。每帧高亮一个字符，其他字符灰色。
 * 逐帧绘制，200ms/帧。
 */
export class GifCaptcha extends Captcha {
  private _ttfPath: string | null = null;

  constructor();
  constructor(width: number, height: number);
  constructor(width: number, height: number, len: number);
  constructor(
    width: number,
    height: number,
    len: number,
    fontPath: string | null | undefined,
  );
  constructor(
    width?: number,
    height?: number,
    len?: number,
    fontPath?: string | null,
  ) {
    super();
    if (width !== undefined) this.setWidth(width);
    if (height !== undefined) this.setHeight(height);
    this.setLen(len ?? 4);

    if (fontPath === undefined) {
      // 默认逻辑：优先使用内置字体
      try {
        const files = FontManager.listFontFiles();
        this._ttfPath = files[0] ?? null;
      } catch {
        this._ttfPath = null;
      }
    } else if (fontPath === null) {
      // 明确不使用项目字体（系统字体模式）
      this._ttfPath = null;
    } else {
      this._ttfPath = fontPath;
    }
  }

  private _render(text: string): Buffer {
    const w = this.getWidth();
    const h = this.getHeight();
    const palette = this._palette();
    const encoder = new GifEncoder(w, h, 200, 0);
    const chars = text.split('');

    const cellW = Math.max(10, Math.floor(w / chars.length));
    const ttfFontSize = Math.max(14, Math.min(h - 4, Math.floor(cellW * 0.9)));
    const ttfBaselineY = computeBaselineY(this._ttfPath, ttfFontSize, h);

    for (let frame = 0; frame < chars.length; frame++) {
      const img = new RgbaImage(w, h, [255, 255, 255]);

      // 干扰圆
      for (let i = 0; i < 5 + this.num(4); i++) {
        img.drawOval(
          this.num(w),
          this.num(h),
          2 + this.num(10),
          2 + this.num(8),
          palette[this.num(palette.length)],
        );
      }
      // 干扰曲线
      for (let i = 0; i < 1 + this.num(2); i++) {
        img.drawQuad(
          5,
          this.num(5, Math.floor(h / 2)),
          this.num(Math.floor(w / 4), Math.floor(w / 4) * 3),
          this.num(5, h - 5),
          w - 5,
          this.num(Math.floor(h / 2), h - 5),
          palette[this.num(palette.length)],
        );
      }

      // 字符
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const isActive = i === frame;
        const color: [number, number, number] = isActive
          ? palette[this.num(palette.length)]
          : [180, 180, 180];
        const cellCenterX = i * cellW + Math.floor(cellW / 2);

        if (!this._ttfPath) {
          throw new Error('GIF 验证码需要配置可用的 TTF/OTF 字体');
        }

        const charW = measureTextWithFont(ch, this._ttfPath, ttfFontSize);
        const x = Math.max(2, Math.floor(cellCenterX - charW / 2));
        drawTextWithFont(
          img,
          ch,
          x,
          ttfBaselineY,
          this._ttfPath,
          ttfFontSize,
          color,
        );
      }
      encoder.addFrame(img.toRgb24());
    }
    return encoder.finish();
  }

  public out(os: {
    write: (chunk: Buffer | Uint8Array | string) => unknown;
  }): boolean {
    os.write(this.toBuffer());
    return true;
  }

  public toBuffer(): Buffer {
    return this._render(this.text());
  }

  public toBase64(): string {
    return this.toBase64DataUri('data:image/gif;base64,');
  }

  private _palette(): [number, number, number][] {
    return [
      [220, 50, 47],
      [41, 128, 185],
      [39, 174, 96],
      [241, 196, 15],
      [155, 89, 182],
      [52, 73, 94],
      [230, 126, 34],
      [26, 188, 156],
      [211, 84, 0],
      [0, 150, 199],
    ];
  }
}
