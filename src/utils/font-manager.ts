import * as fs from 'fs';
import * as path from 'path';

/**
 * 字体样式（复刻 java.awt.Font 常量）。
 * 类型是 `number` 的别名以兼容直接传 int 调用，
 * 但通过常量暴露常用取值。
 */
export const FontStyle = {
  PLAIN: 0,
  BOLD: 1,
  ITALIC: 2,
} as const;

export type FontStyleValue = (typeof FontStyle)[keyof typeof FontStyle];

/** 已加载字体的描述：family + 大小 + 样式 + 源文件路径 */
export interface CaptchaFont {
  family: string;
  size: number;
  style: number;
  fileName: string;
  filePath: string;
}

/**
 * 字体管理：
 * - 内置 10 种字体（actionj.ttf / epilog.ttf / ...），统一位于 fonts/ 目录
 *   （相对 base/font-manager.ts 的路径是 `../fonts/<name>.ttf`）。
 * - 若运行时检测到 @napi-rs/canvas（或回退到 `canvas`）已安装，
 *   会尝试注册该字体，之后 `ctx.font = "32px <family>"` 即可使用。
 * - 若渲染器未安装，仍然会返回 {family, file} 信息，调用方可用自己的渲染 API。
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

  /** fonts/ 目录绝对路径（惰性求值） */
  private static _fontsDir: string | null = null;

  private static get fontsDir(): string {
    let dir = FontManager._fontsDir;
    if (dir == null) {
      const candidates: string[] = [];

      // 1) 当前项目结构的开发/生产模式：process.cwd()/src/fonts
      candidates.push(path.join(process.cwd(), 'src', 'fonts'));
      // 2) 项目根目录的 fonts（若打包工具将字体复制到了根目录）
      candidates.push(path.join(process.cwd(), 'fonts'));

      // 3) 从 __dirname 推断（ts-node 运行时 __dirname 在 src/xxx 下）
      try {
        const mod: any = module;
        if (mod?.filename) {
          const here = path.dirname(mod.filename);
          candidates.push(path.resolve(here, '..', 'fonts')); // src/fonts 当 here 是 src/captcha
          candidates.push(path.resolve(here, '..', '..', 'src', 'fonts')); // 当 here 是 dist/captcha
          candidates.push(path.resolve(here, '..', '..', 'fonts')); // 当 here 是 dist/captcha 且 fonts 在根目录
        }
      } catch {
        /* ignore */
      }

      // 4) ESM import.meta.url
      try {
        const meta: any = (globalThis as any).import?.meta;
        if (meta?.url) {
          const here = path.dirname(new URL(meta.url).pathname);
          candidates.push(path.resolve(here, '..', 'fonts'));
          candidates.push(path.resolve(here, '..', '..', 'src', 'fonts'));
          candidates.push(path.resolve(here, '..', '..', 'fonts'));
        }
      } catch {
        /* ignore */
      }

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          dir = p;
          FontManager._fontsDir = dir;
          return dir;
        }
      }

      // fallback：使用第一个候选路径（即使不存在，后续操作会报具体错误）
      dir = candidates[0] ?? path.join(process.cwd(), 'src', 'fonts');
      FontManager._fontsDir = dir;
    }
    return dir;
  }

  /** 已注册过的字体 family，避免重复调 register */
  private static readonly _registered = new Set<string>();

  /** 返回字体总数，=10 */
  public static get count(): number {
    return FontManager.FONT_NAMES.length;
  }

  /** 返回全部字体文件的绝对路径 */
  public static listFontFiles(): string[] {
    return FontManager.FONT_NAMES.map((n) =>
      path.join(FontManager.fontsDir, n),
    );
  }

  /**
   * 获取第 idx 个内置字体。
   * @param idx 0..9
   * @param style 字体样式（FontStyle.PLAIN/BOLD/ITALIC），默认 BOLD
   * @param size 字体大小（像素），默认 32
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
    const filePath = path.join(FontManager.fontsDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`font file not found: ${filePath}`);
    }
    const family = FontManager._register(filePath, fileName);
    return { family, size, style, fileName, filePath };
  }

  /** 从指定的 TTF/OTF 文件路径直接构造一个 CaptchaFont（中文场景常用） */
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

  /** 返回 fonts 目录绝对路径（供外部直接读文件用） */
  public static getFontsDir(): string {
    return FontManager.fontsDir;
  }

  /** 列出 fonts/ 目录下所有 ttf/otf 文件 */
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

  /** 用动态 import 尝试注册到已安装的 canvas 实现。返回 family。 */
  private static _register(filePath: string, fileName: string): string {
    const family = `luoluo-${path.basename(fileName, path.extname(fileName))}`;
    if (FontManager._registered.has(family)) return family;

    // 1) 优先 @napi-rs/canvas（Rust 实现，性能好）
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

    // 2) 回退到旧版 node-canvas
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

    // 3) 两者都没装 → 也记录 family，以便调用方自己渲染（如 sharp）
    FontManager._registered.add(family);
    return family;
  }
}

/** 当尝试做 canvas 相关操作但 canvas 未安装时抛出。 */
export class CanvasNotInstalledError extends Error {
  constructor(
    message = 'Captcha requires a canvas library to render. Install with `npm i @napi-rs/canvas` (or `canvas`).',
  ) {
    super(message);
    this.name = 'CanvasNotInstalledError';
  }
}
