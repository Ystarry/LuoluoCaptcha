import * as fs from 'fs';
import * as path from 'path';
import {
  RgbaImage,
  drawTextWithFont,
  measureTextWithFont,
  computeBaselineY,
} from '../utils/draw';
import { encodePng } from '../utils/png';

// 常见系统中文字体路径（覆盖 macOS / Windows / 主流 Linux 发行版） / Common system Chinese font paths (covering macOS / Windows / major Linux distributions)
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

function _findFile(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

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

/** 项目中文字体路径（非内置英文字体） / Project Chinese font path (non-built-in English fonts) */
function _findProjectChineseFont(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(
      dir,
      'src',
      'luoluo-common',
      'luoluo-captcha',
      'fonts',
    );
    if (_findFile(candidate)) {
      try {
        const files = fs.readdirSync(candidate);
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
        for (const name of files) {
          const lower = name.toLowerCase();
          if (builtin.has(lower)) continue;
          if (
            lower.endsWith('.ttf') ||
            lower.endsWith('.otf') ||
            lower.endsWith('.ttc')
          )
            return path.join(candidate, name);
        }
      } catch {
        /* ignore */
      }
    }
    const candidate2 = path.join(dir, 'fonts');
    if (_findFile(candidate2)) {
      try {
        const files = fs.readdirSync(candidate2);
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
        for (const name of files) {
          const lower = name.toLowerCase();
          if (builtin.has(lower)) continue;
          if (
            lower.endsWith('.ttf') ||
            lower.endsWith('.otf') ||
            lower.endsWith('.ttc')
          )
            return path.join(candidate2, name);
        }
      } catch {
        /* ignore */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** 查找系统字体路径 / Finds system font path */
function _findSystemChineseFont(): string | null {
  for (const p of SYSTEM_FONT_CANDIDATES) {
    if (_findFile(p)) return p;
  }
  return null;
}

/** 查找可用的中文 TTF/OTF 路径。按优先级：项目 fonts/ > 系统路径 / Finds available Chinese TTF/OTF paths. Priority: project fonts/ > system paths */
function findChineseFont(): string | null {
  return _findProjectChineseFont() ?? _findSystemChineseFont();
}

/**
 * 中文图形验证码（PNG）。 / Chinese image CAPTCHA (PNG).
 *
 * - 当传入的 fontPath 是中文字体文件路径：使用 TTF 绘制真实汉字 / - When fontPath is a Chinese font file path: draws real Chinese characters with TTF
 * - 当 fontPath 为 null：不加载项目字体，仅查找系统字体 / - When fontPath is null: does not load project fonts, only searches system fonts
 * - 当 fontPath 为 undefined：使用默认逻辑（项目字体 > 系统字体） / - When fontPath is undefined: uses default logic (project fonts > system fonts)
 * - 否则：使用 ASCII 内置 6x7 字形（仅英文/数字可见）或占位方框 / - Otherwise: uses built-in ASCII 6x7 glyphs (English/numbers only) or placeholder boxes
 */
export class ChineseCaptcha {
  private _width = 130;
  private _height = 48;
  private _len = 4;
  private _fontPath: string | null;
  private _text: string | null = null;

  constructor(
    width?: number,
    height?: number,
    len?: number,
    fontPath?: string | null,
  ) {
    if (width !== undefined) this._width = width;
    if (height !== undefined) this._height = height;
    if (len !== undefined) this._len = len;

    if (fontPath === undefined) {
      this._fontPath = findChineseFont();
    } else if (fontPath === null) {
      // 明确不使用项目字体，仅查找系统字体 / Explicitly do not use project fonts, only search system fonts
      this._fontPath = _findSystemChineseFont();
    } else if (_isBuiltinEnglishFont(fontPath)) {
      // 内置英文字体无法渲染中文，改用系统中文字体 / Built-in English fonts cannot render Chinese, switch to system Chinese fonts
      this._fontPath = _findSystemChineseFont();
    } else {
      this._fontPath = fontPath;
    }
  }

  /** 3500 常用汉字，从中随机选取 / 3500 common Chinese characters, randomly selected from this pool */
  private static readonly COMMON_CHINESE =
    '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取完举色采青';

  private _randomText(): string {
    const pool = ChineseCaptcha.COMMON_CHINESE;
    const chars: string[] = [];
    for (let i = 0; i < this._len; i++) {
      chars.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return chars.join('');
  }

  private _render(text: string): Buffer {
    const w = this._width;
    const h = this._height;
    const img = new RgbaImage(w, h, [255, 255, 255]);
    const palette: [number, number, number][] = [
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

    // 干扰圆 / Interference circles
    for (let i = 0; i < 5 + Math.floor(Math.random() * 5); i++) {
      const rx = 2 + Math.floor(Math.random() * 10);
      const ry = 2 + Math.floor(Math.random() * 8);
      img.drawOval(
        Math.floor(Math.random() * w),
        Math.floor(Math.random() * h),
        rx,
        ry,
        palette[Math.floor(Math.random() * palette.length)],
      );
    }
    // 干扰曲线 / Interference curves
    for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
      img.drawQuad(
        5,
        Math.floor(Math.random() * (h / 2 + 1)),
        Math.floor(w / 4 + Math.random() * (w / 2)),
        Math.floor(Math.random() * h),
        w - 5,
        Math.floor(h / 2 + Math.random() * (h / 2)),
        palette[Math.floor(Math.random() * palette.length)],
      );
    }

    // 文本 / Text
    const chars = text.split('');
    const cellW = Math.max(12, Math.floor(w / chars.length));
    // 字体大小：占图像高度的 70%（但不超过 cellW 的 85%） / Font size: 70% of image height (but no more than 85% of cellW)
    const fontSize = Math.max(14, Math.min(h - 6, Math.floor(cellW * 0.85)));
    const baselineY = computeBaselineY(this._fontPath, fontSize, h);

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const color = palette[Math.floor(Math.random() * palette.length)];
      const cellCenterX = i * cellW + Math.floor(cellW / 2);

      if (!this._fontPath) {
        throw new Error('中文验证码需要配置可用的中文 TTF/OTF/TTC 字体');
      }

      const charW = measureTextWithFont(ch, this._fontPath, fontSize);
      const x = Math.max(2, cellCenterX - Math.floor(charW / 2));
      drawTextWithFont(img, ch, x, baselineY, this._fontPath, fontSize, color);
    }

    return encodePng(w, h, img.toRgb24());
  }

  public text(): string {
    if (this._text == null) {
      this._text = this._randomText();
    }
    return this._text;
  }

  public toBuffer(): Buffer {
    return this._render(this.text());
  }

  public toBase64(): string {
    return this.toBuffer().toString('base64');
  }

  public toBase64DataUri(): string {
    return 'data:image/png;base64,' + this.toBase64();
  }
}
