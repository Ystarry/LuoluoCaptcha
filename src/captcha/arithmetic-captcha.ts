import { ArithmeticCaptchaAbstract } from '../base/arithmetic-captcha-abstract';
import { FontManager } from '../utils/font-manager';
import {
  RgbaImage,
  drawTextWithFont,
  measureTextWithFont,
  computeBaselineY,
} from '../utils/draw';
import { encodePng } from '../utils/png';

/**
 * 算术验证码（PNG）。
 *
 * 绘制 `a op b = ?`（如 `5+3=?`）——正确答案由
 * `ArithmeticCaptchaAbstract.text()` 返回（如 "8"）。
 *
 * 支持配置字体：
 * - 传入 fontPath 时，使用 TTF/OTF 字体渲染；
 * - 未传入或传入 null 时，不生成算术验证码。
 */
export class ArithmeticCaptcha extends ArithmeticCaptchaAbstract {
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
    if (len !== undefined) this.setLen(len);

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

  private _render(expr: string): Buffer {
    const w = this.getWidth();
    const h = this.getHeight();
    const img = new RgbaImage(w, h, [255, 255, 255]);

    const palette = this._palette();
    // 干扰圆
    for (let i = 0; i < 4 + this.num(4); i++) {
      img.drawOval(
        this.num(w),
        this.num(h),
        2 + this.num(12),
        2 + this.num(8),
        palette[this.num(palette.length)],
      );
    }
    // 干扰线
    for (let i = 0; i < 1 + this.num(2); i++) {
      const c = palette[this.num(palette.length)];
      img.drawQuad(
        5,
        this.num(5, Math.floor(h / 2)),
        this.num(Math.floor(w / 4), Math.floor(w / 4) * 3),
        this.num(5, h - 5),
        w - 5,
        this.num(Math.floor(h / 2), h - 5),
        c,
      );
    }

    // 居中绘制算术式
    const chars = expr.split('');
    const renderChar = (ch: string): string => (ch === '×' ? 'x' : ch);

    if (!this._ttfPath) {
      throw new Error('算术验证码需要配置可用的 TTF/OTF 字体');
    }

    // 全部字符使用 TTF；字体没有 × 时，用 TTF 中的 x 作为乘号显示
    const fontSize = Math.max(
      16,
      Math.min(h - 4, Math.floor((w / chars.length) * 1.65)),
    );
    const baselineY = computeBaselineY(this._ttfPath, fontSize, h);

    // 先计算总宽度
    let totalW = 0;
    const charWidths: number[] = [];
    for (const ch of chars) {
      const cw = measureTextWithFont(renderChar(ch), this._ttfPath, fontSize);
      charWidths.push(cw);
      totalW += cw;
    }

    let baseX = Math.max(2, Math.floor((w - totalW) / 2));
    for (let i = 0; i < chars.length; i++) {
      const color = palette[this.num(palette.length)];
      drawTextWithFont(
        img,
        renderChar(chars[i]),
        baseX,
        baselineY,
        this._ttfPath,
        fontSize,
        color,
      );
      baseX += charWidths[i];
    }

    return encodePng(w, h, img.toRgb24());
  }

  public out(os: {
    write: (chunk: Buffer | Uint8Array | string) => unknown;
  }): boolean {
    os.write(this.toBuffer());
    return true;
  }

  public toBuffer(): Buffer {
    return this._render(this.getArithmeticString());
  }

  public toBase64(): string {
    return this.toBase64DataUri('data:image/png;base64,');
  }

  private _palette(): [number, number, number][] {
    return [
      [231, 76, 60],
      [52, 152, 219],
      [46, 204, 113],
      [241, 196, 15],
      [155, 89, 182],
      [52, 73, 94],
      [230, 126, 34],
      [26, 188, 156],
      [41, 128, 185],
    ];
  }
}
