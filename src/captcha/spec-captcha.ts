import { Captcha } from '../base/captcha';
import { FontManager } from '../utils/font-manager';
import {
  RgbaImage,
  drawTextWithFont,
  measureTextWithFont,
  computeBaselineY,
} from '../utils/draw';
import { encodePng } from '../utils/png';

/**
 * 普通（PNG）图形验证码。 / Standard (PNG) image CAPTCHA.
 * 风格与 Java 版一致：白色背景，每个字符独立颜色，干扰线 + 圆， / Style consistent with Java version: white background, each character with independent color, interference lines + circles,
 * 画一条贯穿的贝塞尔曲线。 / draws a full-length Bézier curve.
 *
 * 支持配置字体： / Supports font configuration:
 * - 传入 fontPath 时，使用 TTF/OTF 字体渲染； / - When fontPath is provided, renders with TTF/OTF font;
 * - 未传入或传入 null 时，不生成验证码。 / - When not provided or null, does not generate CAPTCHA.
 */
export class SpecCaptcha extends Captcha {
  private _ttfPath: string | null = null;

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
      try {
        const files = FontManager.listFontFiles();
        this._ttfPath = files[0] ?? null;
      } catch {
        this._ttfPath = null;
      }
    } else {
      this._ttfPath = fontPath ?? null;
    }
  }

  /** 绘制一帧 PNG。 / Renders a PNG frame. */
  private _render(text: string): Buffer {
    const w = this.getWidth();
    const h = this.getHeight();
    const img = new RgbaImage(w, h, [255, 255, 255]);

    // 1) 干扰圆 / 1) Interference circles
    const palette = this._randomPalette();
    for (let i = 0; i < 4 + this.num(4); i++) {
      const color = palette[this.num(palette.length)];
      const rx = 3 + this.num(12);
      const ry = 3 + this.num(8);
      const cx = this.num(w);
      const cy = this.num(h);
      img.drawOval(cx, cy, rx, ry, color);
    }

    // 2) 干扰线（贝塞尔曲线） / 2) Interference lines (Bézier curves)
    for (let i = 0; i < 1 + this.num(2); i++) {
      const color = palette[this.num(palette.length)];
      const x1 = 5;
      const y1 = this.num(5, Math.floor(h / 2));
      const x2 = w - 5;
      const y2 = this.num(Math.floor(h / 2), h - 5);
      const cx = this.num(Math.floor(w / 4), Math.floor(w / 4) * 3);
      const cy = this.num(5, h - 5);
      const cx1 = this.num(Math.floor(w / 4), Math.floor(w / 4) * 3);
      const cy1 = this.num(5, h - 5);
      img.drawCubic(x1, y1, cx, cy, cx1, cy1, x2, y2, color);
    }

    // 3) 绘制字符（每个字符一种随机颜色） / 3) Draw characters (each character in a random color)
    const chars = text.split('');
    const cellW = Math.floor(w / chars.length);

    if (!this._ttfPath) {
      throw new Error('验证码需要配置可用的 TTF/OTF 字体');
    }

    // 使用 TTF/OTF 字体 / Use TTF/OTF font
    const fontSize = Math.max(14, Math.min(h - 4, Math.floor(cellW * 0.9)));
    const baselineY = computeBaselineY(this._ttfPath, fontSize, h);
    for (let i = 0; i < chars.length; i++) {
      const color = palette[this.num(palette.length)];
      const ch = chars[i];
      const charW = measureTextWithFont(ch, this._ttfPath, fontSize);
      const xStart = Math.max(1, i * cellW + Math.floor((cellW - charW) / 2));
      drawTextWithFont(
        img,
        ch,
        xStart,
        baselineY,
        this._ttfPath,
        fontSize,
        color,
      );
    }

    return encodePng(w, h, img.toRgb24());
  }

  /** 给外部调用：画出图形并输出到可写流 / For external calls: draws the image and outputs to a writable stream */
  public out(os: {
    write: (chunk: Buffer | Uint8Array | string) => unknown;
  }): boolean {
    const text = this.text();
    const buf = this._render(text);
    os.write(buf);
    return true;
  }

  public toBuffer(): Buffer {
    return this._render(this.text());
  }

  public toBase64(): string {
    return this.toBase64DataUri('data:image/png;base64,');
  }

  private _randomPalette(): [number, number, number][] {
    return [
      [231, 76, 60],
      [52, 152, 219],
      [46, 204, 113],
      [241, 196, 15],
      [155, 89, 182],
      [52, 73, 94],
      [230, 126, 34],
      [26, 188, 156],
      [22, 160, 133],
      [41, 128, 185],
    ];
  }
}
