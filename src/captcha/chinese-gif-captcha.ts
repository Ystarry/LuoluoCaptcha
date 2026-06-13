import * as fs from 'fs';
import * as path from 'path';
import { Captcha } from '../base/captcha';
import { FontManager } from '../utils/font-manager';
import {
  RgbaImage,
  drawTextWithFont,
  measureTextWithFont,
  computeBaselineY,
} from '../utils/draw';
import { GifEncoder } from '../utils/gif';

/** 判断是否为项目内置英文字体（不含中文 glyph） / Determines whether the font is a built-in English font (without Chinese glyphs) */
function _isBuiltinEnglishFont(fontPath: string | null): boolean {
  if (!fontPath) return false;
  const builtin = new Set([
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
  ]);
  return builtin.has(path.basename(fontPath).toLowerCase());
}

// 系统中文字体候选路径 / System Chinese font candidate paths
const SYSTEM_FONT_CANDIDATES: string[] = [
  // macOS
  '/System/Library/Fonts/PingFang.ttc',
  '/System/Library/Fonts/STHeiti Light.ttc',
  '/System/Library/Fonts/STHeiti Medium.ttc',
  '/Library/Fonts/Songti.ttc',
  '/Library/Fonts/华文宋体.ttc',
  '/System/Library/Fonts/Hiragino Sans GB.ttc',
  '/System/Library/Fonts/Hiragino Sans GB W3.otf',
  // Windows
  'C:\\Windows\\Fonts\\msyh.ttc',
  'C:\\Windows\\Fonts\\msyh.ttf',
  'C:\\Windows\\Fonts\\msyhbd.ttc',
  'C:\\Windows\\Fonts\\simsun.ttc',
  'C:\\Windows\\Fonts\\simhei.ttf',
  'C:\\Windows\\Fonts\\simkai.ttf',
  'C:\\Windows\\Fonts\\simli.ttf',
  // Linux
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK.ttc',
  '/usr/share/fonts/truetype/arphic/uming.ttc',
  '/usr/share/fonts/truetype/arphic/ukai.ttc',
  '/usr/share/fonts/wqy-microhei/wqy-microhei.ttc',
  '/usr/share/fonts/wqy-zenhei/wqy-zenhei.ttc',
  '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
  '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
];

/**
 * 中文图形验证码（GIF）。每帧高亮一个字符，其他字符灰色。 / Chinese image CAPTCHA (GIF). Highlights one character per frame, others are gray.
 */
export class ChineseGifCaptcha extends Captcha {
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
      this._ttfPath = ChineseGifCaptcha._findChineseFont();
    } else if (fontPath === null) {
      // 明确不使用项目字体，仅查找系统字体 / Explicitly do not use project fonts, only search system fonts
      this._ttfPath = ChineseGifCaptcha._findSystemChineseFont();
    } else if (_isBuiltinEnglishFont(fontPath)) {
      // 内置英文字体无法渲染中文，改用系统中文字体 / Built-in English fonts cannot render Chinese, switch to system Chinese fonts
      this._ttfPath = ChineseGifCaptcha._findSystemChineseFont();
    } else {
      this._ttfPath = fontPath;
    }
  }

  /** 常用汉字池（约 200 个高频字），验证码从中随机选取 / Common Chinese character pool (~200 high-frequency characters), CAPTCHA randomly selects from it */
  private static readonly COMMON_CHINESE =
    '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取完举色采青';

  /** 生成中文验证码字符 / Generates Chinese CAPTCHA characters */
  protected alphas(): string[] {
    const pool = ChineseGifCaptcha.COMMON_CHINESE;
    const cs: string[] = new Array(this.len);
    for (let i = 0; i < this.len; i++) {
      cs[i] = pool[this.num(pool.length)];
    }
    this.chars = cs.join('');
    return cs;
  }

  private static _findProjectChineseFont(): string | null {
    try {
      const files = FontManager.listAllFontFiles();
      const builtinNames = new Set([
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
      ]);
      for (const f of files) {
        const base = f.split(/[\\/]/).pop()!.toLowerCase();
        if (builtinNames.has(base)) continue;
        return f;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  private static _findSystemChineseFont(): string | null {
    for (const p of SYSTEM_FONT_CANDIDATES) {
      try {
        if (fs.existsSync(p)) return p;
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  private static _findChineseFont(): string | null {
    return (
      ChineseGifCaptcha._findProjectChineseFont() ??
      ChineseGifCaptcha._findSystemChineseFont()
    );
  }

  private _render(text: string): Buffer {
    const w = this.getWidth();
    const h = this.getHeight();
    const palette = this._palette();
    const encoder = new GifEncoder(w, h, 200, 0); // 每帧 200ms / 200ms per frame
    const chars = text.split('');

    const cellW = Math.max(12, Math.floor(w / chars.length));
    const fontSize = Math.max(12, Math.min(h - 6, Math.floor(cellW * 0.9)));
    const baselineY = computeBaselineY(this._ttfPath, fontSize, h);

    for (let frame = 0; frame < chars.length; frame++) {
      const img = new RgbaImage(w, h, [255, 255, 255]);

      for (let i = 0; i < 5 + this.num(4); i++) {
        img.drawOval(
          this.num(w),
          this.num(h),
          2 + this.num(12),
          2 + this.num(8),
          palette[this.num(palette.length)],
        );
      }
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

      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const isActive = i === frame;
        const color: [number, number, number] = isActive
          ? palette[this.num(palette.length)]
          : [170, 170, 170];
        const cellCenterX = i * cellW + Math.floor(cellW / 2);

        if (!this._ttfPath) {
          throw new Error('中文 GIF 验证码需要配置可用的中文 TTF/OTF/TTC 字体');
        }

        const charW = measureTextWithFont(ch, this._ttfPath, fontSize);
        const x = Math.max(2, Math.floor(cellCenterX - charW / 2));
        drawTextWithFont(img, ch, x, baselineY, this._ttfPath, fontSize, color);
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
