import * as fs from 'fs';
import * as path from 'path';

/**
 * 字体样式（复刻 java.awt.Font 常量）。 / Font style (replica of java.awt.Font constants).
 * 类型是 `number` 的别名以兼容直接传 int 调用， / The type is a `number` alias for compatibility with direct int passing,
 * 但通过常量暴露常用取值。 / but exposes common values through constants.
 */
export const FontStyle = {
  PLAIN: 0,
  BOLD: 1,
  ITALIC: 2,
} as const;

export type FontStyleValue = (typeof FontStyle)[keyof typeof FontStyle];

/** 已加载字体的描述：family + 大小 + 样式 + 源文件路径 / Description of loaded font: family + size + style + source file path */
export interface CaptchaFont {
  family: string;
  size: number;
  style: number;
  fileName: string;
  filePath: string;
}

/**
 * 字体管理： / Font manager:
 * - 内置 10 种字体（actionj.ttf / epilog.ttf / ...），统一位于 fonts/ 目录 / Built-in 10 fonts (actionj.ttf / epilog.ttf / ...), all located in the fonts/ directory
 *   （相对 base/font-manager.ts 的路径是 `../fonts/<name>.ttf`）。 / (relative to base/font-manager.ts, path is `../fonts/<name>.ttf`).
 * - 若运行时检测到 @napi-rs/canvas（或回退到 `canvas`）已安装， / If @napi-rs/canvas (or fallback `canvas`) is detected at runtime,
 *   会尝试注册该字体，之后 `ctx.font = "32px <family>"` 即可使用。 / it will try to register the font, then `ctx.font = "32px <family>"` can be used.
 * - 若渲染器未安装，仍然会返回 {family, file} 信息，调用方可用自己的渲染 API。 / If the renderer is not installed, it still returns {family, file} info for the caller to use its own rendering API.
 */
export class FontManager {
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

  /** fonts/ 目录绝对路径（惰性求值） / Absolute path of fonts/ directory (lazily evaluated) */
  private static _fontsDir: string | null = null;

  /** 上次探测 fonts 目录时尝试过的候选路径 / Candidate paths tried during the last fonts directory probe */
  private static _triedPaths: string[] = [];

  private static get fontsDir(): string {
    let dir = FontManager._fontsDir;
    if (dir == null) {
      const candidates: string[] = [];

      // 1) ts-node / 开发模式
      candidates.push(path.resolve(process.cwd(), 'fonts'));
      // 2) 开发模式备用
      candidates.push(path.resolve(process.cwd(), 'src', 'fonts'));
      // 3) dist/utils/font-manager.js → dist/fonts，生产模式
      candidates.push(path.resolve(__dirname, '..', 'fonts'));
      // 4) 如果目录结构更深
      candidates.push(path.resolve(__dirname, '..', '..', 'fonts'));

      // 5) npm 包根目录
      const pkgFonts = FontManager.resolvePackageFontsDir();
      if (pkgFonts) {
        candidates.push(pkgFonts);
      }

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          dir = p;
          FontManager._fontsDir = dir;
          return dir;
        }
      }

      // fallback：记录已尝试的路径并使用第一个候选
      FontManager._triedPaths = candidates;
      dir = candidates[0] ?? path.resolve(process.cwd(), 'fonts');
      FontManager._fontsDir = dir;
    }
    return dir;
  }

  /** 通过 require.resolve 定位 npm 包根目录下的 fonts / Locate fonts under npm package root via require.resolve */
  public static resolvePackageFontsDir(): string | null {
    try {
      const pkgJsonPath = require.resolve('luoluo-captcha/package.json');
      const pkgRoot = path.dirname(pkgJsonPath);
      const fontsDir = path.join(pkgRoot, 'fonts');
      if (fs.existsSync(fontsDir)) {
        return fontsDir;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  /** 已注册过的字体 family，避免重复调 register / Registered font families to avoid duplicate register calls */
  private static readonly _registered = new Set<string>();

  /** 返回字体总数，=10 / Returns total font count, =10 */
  public static get count(): number {
    return FontManager.FONT_NAMES.length;
  }

  /** 返回全部字体文件的绝对路径 / Returns absolute paths of all font files */
  public static listFontFiles(): string[] {
    return FontManager.FONT_NAMES.map((n) =>
      path.join(FontManager.fontsDir, n),
    );
  }

  /**
   * 获取第 idx 个内置字体。 / Get the idx-th built-in font.
   * @param idx 0..9
   * @param style 字体样式（FontStyle.PLAIN/BOLD/ITALIC），默认 BOLD / Font style (FontStyle.PLAIN/BOLD/ITALIC), default BOLD
   * @param size 字体大小（像素），默认 32 / Font size (pixels), default 32
   */
  public static getFont(
    idx: number,
    style: number = FontStyle.BOLD,
    size = 32,
  ): CaptchaFont {
    if (idx < 0 || idx >= FontManager.FONT_NAMES.length) {
      throw new RangeError(
        `font index out of range: ${idx} (expected 0..${FontManager.FONT_NAMES.length - 1})`,
      );
    }
    const fileName = FontManager.FONT_NAMES[idx];
    const fontsDir = FontManager.fontsDir;
    if (!fs.existsSync(fontsDir)) {
      const tried = FontManager._triedPaths;
      const msg =
        tried.length > 0
          ? `fonts directory not found: ${fontsDir}\nTried directories:\n${tried.map((p) => '  - ' + p).join('\n')}`
          : `fonts directory not found: ${fontsDir}`;
      throw new Error(msg);
    }
    const filePath = path.join(fontsDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`font file not found: ${filePath}`);
    }
    const family = FontManager._register(filePath, fileName);
    return { family, size, style, fileName, filePath };
  }

  /** 从指定的 TTF/OTF 文件路径直接构造一个 CaptchaFont（中文场景常用） / Directly construct a CaptchaFont from the specified TTF/OTF file path (commonly used in Chinese scenarios) */
  public static loadFromFile(
    filePath: string,
    size = 32,
    style: number = FontStyle.BOLD,
  ): CaptchaFont {
    if (!fs.existsSync(filePath)) {
      throw new Error(`font file not found: ${filePath}`);
    }
    const fileName = path.basename(filePath);
    const family = FontManager._register(filePath, fileName);
    return { family, size, style, fileName, filePath };
  }

  /** 返回 fonts 目录绝对路径（供外部直接读文件用） / Returns absolute path of fonts directory (for external direct file reading) */
  public static getFontsDir(): string {
    return FontManager.fontsDir;
  }

  /** 列出 fonts/ 目录下所有 ttf/otf 文件 / Lists all ttf/otf files in the fonts/ directory */
  public static listAllFontFiles(): string[] {
    try {
      const files = fs.readdirSync(FontManager.fontsDir);
      return files
        .filter((f) => /\.(ttf|otf|otc|ttc)$/i.test(f))
        .map((f) => path.join(FontManager.fontsDir, f));
    } catch {
      return [];
    }
  }

  /** 用动态 import 尝试注册到已安装的 canvas 实现。返回 family。 / Try to register to installed canvas implementation via dynamic require. Returns family. */
  private static _register(filePath: string, fileName: string): string {
    const family = `luoluo-${path.basename(fileName, path.extname(fileName))}`;
    if (FontManager._registered.has(family)) return family;

    // 1) 优先 @napi-rs/canvas（Rust 实现，性能好） / 1) Prefer @napi-rs/canvas (Rust implementation, better performance)
    try {
      const mod: any = require('@napi-rs/canvas');
      const gf = mod?.GlobalFonts;
      if (typeof gf?.registerFontFromPath === 'function') {
        gf.registerFontFromPath(filePath);
      } else if (typeof gf?.register === 'function') {
        gf.register(filePath, { family });
      }
      FontManager._registered.add(family);
      return family;
    } catch {
      // not installed / failed —— try next
    }

    // 2) 回退到旧版 node-canvas / 2) Fallback to legacy node-canvas
    try {
      const canvas: any = require('canvas');
      if (typeof canvas?.registerFont === 'function') {
        canvas.registerFont(filePath, { family });
        FontManager._registered.add(family);
        return family;
      }
    } catch {
      // not installed
    }

    // 3) 两者都没装 → 也记录 family，以便调用方自己渲染（如 sharp） / 3) Neither installed -> still record family so the caller can render itself (e.g., sharp)
    FontManager._registered.add(family);
    return family;
  }
}

/** 当尝试做 canvas 相关操作但 canvas 未安装时抛出。 / Thrown when attempting canvas-related operations but canvas is not installed. */
export class CanvasNotInstalledError extends Error {
  constructor(
    message = 'Captcha requires a canvas library to render. Install with `npm i @napi-rs/canvas` (or `canvas`).',
  ) {
    super(message);
    this.name = 'CanvasNotInstalledError';
  }
}
