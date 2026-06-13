import { Injectable, StreamableFile } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SpecCaptcha } from './spec-captcha';
import { GifCaptcha } from './gif-captcha';
import { ChineseCaptcha } from './chinese-captcha';
import { ChineseGifCaptcha } from './chinese-gif-captcha';
import { ArithmeticCaptcha } from './arithmetic-captcha';
import { FontManager } from '../utils/font-manager';

export type CaptchaType =
  | 'spec'
  | 'gif'
  | 'chinese'
  | 'chinese-gif'
  | 'arithmetic';

export interface CaptchaImageResult {
  image: Buffer;
  contentType: string;
  text: string;
  /** 调试信息：实际使用的字体路径或模式 / Debug info: actual font path or pattern used */
  debugFont?: string;
}

export interface LuoluoConfigType {
  captcha?: {
    enable?: boolean;
    expire?: number;
    length?: number;
    type?: CaptchaType;
    font?: string;
    arithmetic?: {
      length?: number;
      digits?: number;
    };
  };
}

/**
 * 验证码服务：生成图片，不保存答案，由调用方自行管理。 / CAPTCHA service: generates images, does not store answers; managed by the caller.
 *
 * 设计要点： / Design highlights:
 * - 不保存验证码，生成后立即返回 text，由调用方自行存储（session / redis / memory）。 / - Does not store CAPTCHA; returns text immediately after generation for caller to store (session / redis / memory).
 * - 支持 5 种风格：spec（默认）、gif、chinese、chinese-gif、arithmetic。 / - Supports 5 styles: spec (default), gif, chinese, chinese-gif, arithmetic.
 * - 配置从 luoluo.yaml 读取，支持动态调整长度、字体、算术运算参数。 / - Configuration read from luoluo.yaml, supports dynamic adjustment of length, font, and arithmetic parameters.
 */
@Injectable()
export class CaptchaService {
  /** 图片默认宽 / Default image width */
  public static readonly WIDTH = 130;
  /** 图片默认高 / Default image height */
  public static readonly HEIGHT = 48;
  /** 字符数（算术验证码忽略，固定显示一个算式） / Number of characters (ignored by arithmetic CAPTCHA, which shows a fixed expression) */
  public static readonly LEN = 4;

  /** 返回配置中设置的默认验证码类型 / Returns the default CAPTCHA type set in configuration */
  getDefaultType(): CaptchaType {
    const config = this.readConfig();
    const cfgType = config.captcha?.type;
    const valid: CaptchaType[] = [
      'spec',
      'gif',
      'chinese',
      'chinese-gif',
      'arithmetic',
    ];
    return valid.includes(cfgType as CaptchaType)
      ? (cfgType as CaptchaType)
      : 'spec';
  }

  /** 生成一张验证码图片，并把答案直接返回。 / Generates a CAPTCHA image and returns the answer directly. */
  create(type?: CaptchaType): CaptchaImageResult {
    const config = this.readConfig();
    const t = type ?? this.getDefaultTypeFromConfig(config);
    const captcha = this.createCaptcha(t, config);
    const buffer = captcha.toBuffer();
    // text() 是一个方法，会惰性生成 chars / text() is a method that lazily generates chars
    const text =
      typeof (captcha as unknown as { text: () => string }).text === 'function'
        ? (captcha as unknown as { text: () => string }).text()
        : String((captcha as unknown as { chars?: string }).chars ?? '');

    const fontPath = this.resolveFont(config.captcha?.font);

    // 部分验证码类（如 ChineseCaptcha）可能在内部替换字体，获取实际使用的字体 / Some CAPTCHA classes (e.g. ChineseCaptcha) may replace fonts internally; get the actually used font
    let actualFont: string | null | undefined = fontPath;
    const c = captcha as any;
    if (c._fontPath) {
      actualFont = c._fontPath;
    } else if (c._ttfPath) {
      actualFont = c._ttfPath;
    }
    const debugFont =
      actualFont === null
        ? 'system-font'
        : actualFont === undefined
          ? 'default'
          : path.basename(actualFont);

    return {
      image: buffer,
      contentType: this.getContentType(t),
      text,
      debugFont,
    };
  }

  private getDefaultTypeFromConfig(config: LuoluoConfigType): CaptchaType {
    const cfgType = config.captcha?.type;
    const valid: CaptchaType[] = [
      'spec',
      'gif',
      'chinese',
      'chinese-gif',
      'arithmetic',
    ];
    return valid.includes(cfgType as CaptchaType)
      ? (cfgType as CaptchaType)
      : 'spec';
  }

  /** 把验证码以 Nest StreamableFile 形式返回，便于直接在 Controller 里使用。 / Returns the CAPTCHA as a Nest StreamableFile for direct use in Controller. */
  createAsStreamable(type?: CaptchaType): {
    streamable: StreamableFile;
    contentType: string;
    text: string;
  } {
    const { image, contentType, text } = this.create(type);
    // StreamableFile 接受 Buffer / StreamableFile accepts Buffer
    const streamable = new StreamableFile(image);
    return { streamable, contentType, text };
  }

  // —— 私有工具 ———————————————————————————————————— / Private utilities

  private readConfig(): LuoluoConfigType {
    const projectRoot = process.cwd();
    const candidates = [
      path.join(projectRoot, 'src', 'luoluo.yaml'),
      path.join(projectRoot, 'luoluo.yaml'),
      path.join(__dirname, '..', '..', 'luoluo.yaml'),
      path.join(__dirname, '..', '..', '..', 'src', 'luoluo.yaml'),
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const content = fs.readFileSync(p, 'utf8');
          return (yaml.load(content) as LuoluoConfigType) || {};
        }
      } catch {
        /* ignore */
      }
    }
    return {};
  }

  private createCaptcha(
    type: CaptchaType,
    config: LuoluoConfigType,
  ): { text: () => string; toBuffer: () => Buffer } {
    const w = CaptchaService.WIDTH;
    const h = CaptchaService.HEIGHT;
    const cfg = config.captcha || {};

    // 验证码长度：spec/gif/chinese/chinese-gif 使用 cfg.length，arithmetic 使用 cfg.arithmetic.length / CAPTCHA length: spec/gif/chinese/chinese-gif use cfg.length, arithmetic uses cfg.arithmetic.length
    const len =
      type === 'arithmetic'
        ? cfg.arithmetic?.length || 2
        : cfg.length || CaptchaService.LEN;

    // 字体处理：项目字体返回路径，系统字体返回 null，未配置返回 undefined / Font handling: project fonts return path, system fonts return null, unconfigured returns undefined
    const fontPath = this.resolveFont(cfg.font);

    switch (type) {
      case 'gif':
        return new GifCaptcha(w, h, len, fontPath);
      case 'chinese':
        return new ChineseCaptcha(w, h, len, fontPath);
      case 'chinese-gif':
        return new ChineseGifCaptcha(w, h, len, fontPath);
      case 'arithmetic': {
        const captcha = new ArithmeticCaptcha(w, h, len, fontPath);
        captcha.setLen(len);
        captcha.setDigits(cfg.arithmetic?.digits || 1);
        return captcha;
      }
      case 'spec':
      default:
        return new SpecCaptcha(w, h, len, fontPath);
    }
  }

  /**
   * 解析字体配置： / Resolves font configuration:
   * - 空 / 未配置：返回 undefined（让各验证码类使用默认逻辑） / - Empty / not configured: returns undefined (lets each CAPTCHA class use default logic)
   * - 项目 fonts 目录下的文件：返回完整路径 / - Files under project fonts directory: returns full path
   * - 其他（系统字体名）：返回 null（明确不加载项目字体） / - Others (system font names): returns null (explicitly do not load project fonts)
   */
  private resolveFont(font?: string): string | undefined | null {
    if (!font) return undefined;
    const fontsDir = FontManager.getFontsDir();
    const projectFont = path.join(fontsDir, font);
    if (fs.existsSync(projectFont)) {
      return projectFont;
    }
    // 系统字体：不加载项目字体，返回 null / System font: do not load project fonts, return null
    return null;
  }

  private getContentType(type: CaptchaType): string {
    if (type === 'gif' || type === 'chinese-gif') return 'image/gif';
    return 'image/png';
  }
}
