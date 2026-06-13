import { Randoms } from '../utils/randoms';
import {
  Color,
  randomColor as _randomColor,
  randomGrayColor as _randomGrayColor,
} from '../utils/color';
import { CaptchaGraphics } from '../utils/graphics';
import { CaptchaFont, FontManager, FontStyle } from '../utils/font-manager';

/**
 * 验证码抽象类 / Captcha abstract class
 * @Author ystarry 2023-08-10
 * @Description 验证码抽象类，定义验证码的基本属性和方法 / Captcha abstract class, defines basic properties and methods of captcha
 */
export abstract class Captcha extends Randoms {
  // 暴露内部类型给子类 / Expose internal types to subclasses
  protected static readonly Color = Color;
  protected static readonly FontManager = FontManager;
  protected static readonly FontStyle = FontStyle;
  // 常用颜色 [R, G, B] / Common colors [R, G, B]
  public static readonly COLOR: number[][] = [
    [0, 135, 255],
    [51, 153, 51],
    [255, 102, 102],
    [255, 153, 0],
    [153, 102, 0],
    [153, 102, 153],
    [51, 153, 153],
    [102, 102, 255],
    [0, 102, 204],
    [204, 51, 51],
    [0, 153, 204],
    [0, 51, 102],
  ];

  // 验证码文本类型 / Captcha text types
  public static readonly TYPE_DEFAULT = 1; // 字母数字混合 / Alphanumeric
  public static readonly TYPE_ONLY_NUMBER = 2; // 纯数字 / Numbers only
  public static readonly TYPE_ONLY_CHAR = 3; // 纯字母 / Letters only
  public static readonly TYPE_ONLY_UPPER = 4; // 纯大写字母 / Uppercase letters only
  public static readonly TYPE_ONLY_LOWER = 5; // 纯小写字母 / Lowercase letters only
  public static readonly TYPE_NUM_AND_UPPER = 6; // 数字大写字母 / Numbers and uppercase letters

  // 内置字体索引 / Built-in font indices
  public static readonly FONT_1 = 0;
  public static readonly FONT_2 = 1;
  public static readonly FONT_3 = 2;
  public static readonly FONT_4 = 3;
  public static readonly FONT_5 = 4;
  public static readonly FONT_6 = 5;
  public static readonly FONT_7 = 6;
  public static readonly FONT_8 = 7;
  public static readonly FONT_9 = 8;
  public static readonly FONT_10 = 9;
  private static readonly FONT_NAMES: string[] = [
    'actionj.ttf',
    'epilog.ttf',
    'fresnel.ttf',
    'headache.ttf',
    'lexo.ttf',
    'prefix.ttf',
    'progbot.ttf',
    'ransom.ttf',
    'robot.ttf',
    'scandal.ttf',
  ];

  private font: CaptchaFont | null = null; // 验证码的字体（由 FontManager 提供） / Captcha font (provided by FontManager)
  protected len = 5; // 验证码随机字符长度 / Random character length of captcha
  protected width = 130; // 验证码显示宽度 / Captcha display width
  protected height = 48; // 验证码显示高度 / Captcha display height
  protected charType = Captcha.TYPE_DEFAULT; // 验证码类型 / Captcha type
  protected chars: string | null = null; // 当前验证码 / Current captcha text

  /**
   * 生成随机验证码字符数组 / Generate random captcha character array
   * @returns 验证码字符数组 / Captcha character array
   */
  protected alphas(): string[] {
    const cs: string[] = new Array(this.len);
    for (let i = 0; i < this.len; i++) {
      switch (this.charType) {
        case Captcha.TYPE_ONLY_NUMBER:
          cs[i] = this.alpha(this.numMaxIndex);
          break;
        case Captcha.TYPE_ONLY_CHAR:
          cs[i] = this.alpha(this.charMinIndex, this.charMaxIndex);
          break;
        case Captcha.TYPE_ONLY_UPPER:
          cs[i] = this.alpha(this.upperMinIndex, this.upperMaxIndex);
          break;
        case Captcha.TYPE_ONLY_LOWER:
          cs[i] = this.alpha(this.lowerMinIndex, this.lowerMaxIndex);
          break;
        case Captcha.TYPE_NUM_AND_UPPER:
          cs[i] = this.alpha(this.upperMaxIndex);
          break;
        default:
          cs[i] = this.alpha();
      }
    }
    this.chars = cs.join('');
    return cs;
  }

  /**
   * 给定范围获得随机颜色（三通道独立随机）。 / Get random color within a given range (three channels randomized independently).
   * @param fc 0-255，较小值；与 bc 顺序不敏感 / 0-255, smaller value; order insensitive with bc
   * @param bc 0-255，较大值 / 0-255, larger value
   * @returns 随机颜色 / Random color
   */
  protected randomColor(fc: number, bc: number): Color {
    const [lo, hi] = fc <= bc ? [fc, bc] : [bc, fc];
    return _randomColor(lo, hi, (n) => this.nextInt(n));
  }

  /**
   * 从预设色板 (Captcha.COLOR) 中随机取一个颜色。 / Randomly pick a color from the preset palette (Captcha.COLOR).
   * @returns 随机常用颜色 / Random common color
   */
  protected color(): Color {
    const palette = Captcha.COLOR;
    const rgb = palette[this.nextInt(palette.length)];
    return new Color(rgb[0], rgb[1], rgb[2]);
  }

  /**
   * 验证码输出，抽象方法，由子类实现（如 PngCaptcha / GifCaptcha）。 / Captcha output, abstract method, implemented by subclasses (e.g. PngCaptcha / GifCaptcha).
   * @param os 可写流 (NodeJS.WritableStream / Writable) / Writable stream (NodeJS.WritableStream / Writable)
   * @return 是否成功写入 / Whether write was successful
   */
  public abstract out(os: {
    write: (chunk: Buffer | Uint8Array | string) => unknown;
  }): boolean;

  /**
   * 直接以 Buffer 的形式获取验证码图像。 / Get captcha image directly as a Buffer.
   */
  public abstract toBuffer(): Buffer;

  /**
   * 输出 base64 编码字符串（不含 data URL 前缀）。 / Output base64 encoded string (without data URL prefix).
   * 默认实现：对 {@link toBuffer} 的结果做 base64 编码，子类可按需覆盖。 / Default implementation: base64 encodes the result of {@link toBuffer}, subclasses may override as needed.
   */
  public toBase64(): string {
    return this.toBuffer().toString('base64');
  }

  /**
   * 输出带前缀的 data URL 形式的 base64 字符串。 / Output base64 string in data URL form with prefix.
   * @param type data URL 前缀，如 "data:image/png;base64," / data URL prefix, e.g. "data:image/png;base64,"
   */
  public toBase64DataUri(type: string): string {
    return type + this.toBase64();
  }

  /**
   * 获取当前的验证码文本（若尚未生成则立即生成）。 / Get current captcha text (generate immediately if not yet generated).
   */
  public text(): string {
    this.checkAlpha();
    return this.chars as string;
  }

  /**
   * 获取当前验证码的字符数组（若尚未生成则立即生成）。 / Get current captcha character array (generate immediately if not yet generated).
   */
  public textArray(): string[] {
    this.checkAlpha();
    return (this.chars as string).split('');
  }

  /**
   * 检查验证码是否生成，没有则立即生成。 / Check if captcha is generated, generate immediately if not.
   */
  public checkAlpha(): void {
    if (this.chars == null) {
      this.alphas();
    }
  }

  /**
   * 随机画 num 条干扰线（颜色随机）。 / Randomly draw `num` interference lines (random colors).
   */
  public drawLine(num: number, g: CaptchaGraphics): void;
  /**
   * 随机画 num 条干扰线。若 color 为 null / 未指定，每条线随机取色。 / Randomly draw `num` interference lines. If color is null / not specified, each line uses a random color.
   */
  public drawLine(num: number, g: CaptchaGraphics, color: Color | null): void;
  public drawLine(num: number, g: CaptchaGraphics, color?: Color | null): void {
    for (let i = 0; i < num; i++) {
      g.setStrokeColor(color ?? this.color());
      const x1 = this.num(-10, this.width - 10);
      const y1 = this.num(5, this.height - 5);
      const x2 = this.num(10, this.width + 10);
      const y2 = this.num(2, this.height - 2);
      g.drawLine(x1, y1, x2, y2);
    }
  }

  /**
   * 随机画 num 个干扰圆（颜色随机）。 / Randomly draw `num` interference circles (random colors).
   */
  public drawOval(num: number, g: CaptchaGraphics): void;
  /** 随机画 num 个干扰圆。若 color 为 null / 未指定，每个圆随机取色 / Randomly draw `num` interference circles. If color is null / not specified, each circle uses a random color */
  public drawOval(num: number, g: CaptchaGraphics, color: Color | null): void;
  public drawOval(num: number, g: CaptchaGraphics, color?: Color | null): void {
    for (let i = 0; i < num; i++) {
      g.setStrokeColor(color ?? this.color());
      const w = 5 + this.num(10);
      g.drawOval(this.num(this.width - 25), this.num(this.height - 15), w, w);
    }
  }

  /**
   * 随机画 num 条贝塞尔曲线（颜色随机）。 / Randomly draw `num` Bezier curves (random colors).
   */
  public drawBesselLine(num: number, g: CaptchaGraphics): void;
  /**
   * 随机画 num 条贝塞尔曲线： / Randomly draw `num` Bezier curves:
   *   - 50% 概率画二阶（二次） / 50% chance to draw quadratic (second-order)
   *   - 50% 概率画三阶（三次） / 50% chance to draw cubic (third-order)
   *   - 50% 概率交换 y1 / y2（使曲线上下弯曲更随机） / 50% chance to swap y1 / y2 (making curves bend more randomly)
   */
  public drawBesselLine(
    num: number,
    g: CaptchaGraphics,
    color: Color | null,
  ): void;
  public drawBesselLine(
    num: number,
    g: CaptchaGraphics,
    color?: Color | null,
  ): void {
    for (let i = 0; i < num; i++) {
      g.setStrokeColor(color ?? this.color());
      let x1 = 5,
        y1 = this.num(5, Math.floor(this.height / 2));
      const x2 = this.width - 5;
      let y2 = this.num(Math.floor(this.height / 2), this.height - 5);
      const ctrlx = this.num(
        Math.floor(this.width / 4),
        Math.floor(this.width / 4) * 3,
      );
      const ctrly = this.num(5, this.height - 5);
      if (this.num(2) === 0) {
        const ty = y1;
        y1 = y2;
        y2 = ty;
      }
      if (this.num(2) === 0) {
        g.drawQuadCurve(x1, y1, ctrlx, ctrly, x2, y2);
      } else {
        const ctrlx1 = this.num(
          Math.floor(this.width / 4),
          Math.floor(this.width / 4) * 3,
        );
        const ctrly1 = this.num(5, this.height - 5);
        g.drawCubicCurve(x1, y1, ctrlx, ctrly, ctrlx1, ctrly1, x2, y2);
      }
    }
  }

  /**
   * 获取当前字体（首次调用若未设置，默认使用 FONT_1；FONT_1 加载失败则退化为 Arial 32）。 / Get current font (if not set on first call, default to FONT_1; fall back to Arial 32 if FONT_1 fails to load).
   */
  public getFont(): CaptchaFont {
    if (this.font == null) {
      try {
        this.setFont(Captcha.FONT_1);
      } catch {
        this.font = {
          family: 'Arial',
          size: 32,
          style: FontStyle.BOLD,
          fileName: 'Arial',
          filePath: '',
        };
      }
    }
    return this.font as CaptchaFont;
  }

  /** 直接设置字体对象 / Set font object directly */
  public setFont(font: CaptchaFont): void;
  /** 按内置字体索引设置字体（默认 size=32, style=BOLD） / Set font by built-in font index (default size=32, style=BOLD) */
  public setFont(font: number): void;
  /** 按内置字体索引 + (style, size) 设置字体（与 Java API 对齐） / Set font by built-in index + (style, size) (aligned with Java API) */
  public setFont(font: number, style: number, size: number): void;
  public setFont(
    font: number | CaptchaFont,
    style?: number,
    size?: number,
  ): void {
    if (typeof font !== 'number') {
      this.font = font;
      return;
    }
    const finalStyle = style ?? FontStyle.BOLD;
    const finalSize = size ?? 32;
    this.font = FontManager.getFont(font, finalStyle, finalSize);
  }

  /* ------ 基本属性的 getter / setter / Basic property getters / setters ------ */

  public getLen(): number {
    return this.len;
  }
  public setLen(len: number): void {
    this.len = len;
  }

  public getWidth(): number {
    return this.width;
  }
  public setWidth(width: number): void {
    this.width = width;
  }

  public getHeight(): number {
    return this.height;
  }
  public setHeight(height: number): void {
    this.height = height;
  }

  public getCharType(): number {
    return this.charType;
  }
  public setCharType(charType: number): void {
    this.charType = charType;
  }
}
