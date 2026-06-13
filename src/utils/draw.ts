/**
 * 绘图工具（纯 JS，无需 canvas 原生模块）。
 *
 * 提供：
 *   - 32 位 RGBA 帧缓冲 + `toRgb24()` -> PNG 字节
 *   - 画点、画线、画圆、画椭圆、画二次/三次贝塞尔曲线
 *   - TTF/OTF/TTC 字体渲染
 *
 * 设计目标：可读性优先、纯 JS，无需 canvas 原生模块。
 */

/**
 * 一张用于在内存中绘制的图像。
 * RGBA 8 位深度。
 */
export class RgbaImage {
  public readonly width: number;
  public readonly height: number;
  public readonly stride: number; // bytes per row
  public readonly buffer: Buffer;

  /** 背景色，填充整个画布。 */
  constructor(
    width: number,
    height: number,
    bg: [number, number, number] = [255, 255, 255],
  ) {
    this.width = width;
    this.height = height;
    this.stride = width * 4;
    this.buffer = Buffer.alloc(this.stride * height);
    for (let i = 0; i < this.buffer.length; i += 4) {
      this.buffer[i] = bg[0];
      this.buffer[i + 1] = bg[1];
      this.buffer[i + 2] = bg[2];
      this.buffer[i + 3] = 255;
    }
  }

  /** 画点 */
  public setPixel(
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    a = 255,
  ): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = y * this.stride + x * 4;
    this.buffer[i] = r;
    this.buffer[i + 1] = g;
    this.buffer[i + 2] = b;
    if (a < 255) {
      // 简单 alpha 混合
      const inv = a / 255;
      this.buffer[i] = Math.round(this.buffer[i] * (1 - inv) + r * inv);
      this.buffer[i + 1] = Math.round(this.buffer[i + 1] * (1 - inv) + g * inv);
      this.buffer[i + 2] = Math.round(this.buffer[i + 2] * (1 - inv) + b * inv);
    }
  }

  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: [number, number, number],
    alpha = 255,
  ): void {
    // Bresenham
    const dx = Math.abs(x2 - x1);
    const dy = -Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    let x = x1,
      y = y1;
    while (true) {
      this.setPixel(x, y, color[0], color[1], color[2], alpha);
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  public drawOval(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: [number, number, number],
  ): void {
    // midpoint ellipse
    rx = Math.max(1, Math.floor(rx));
    ry = Math.max(1, Math.floor(ry));
    let x = 0,
      y = ry;
    const rx2 = rx * rx,
      ry2 = ry * ry;
    let p = ry2 - rx2 * ry + rx2 / 4;
    let dx = 0,
      dy = 2 * rx2 * y;
    while (dx < dy) {
      this._plot4(cx, cy, x, y, color);
      if (p < 0) {
        x++;
        dx += 2 * ry2;
        p += ry2 + dx;
      } else {
        x++;
        y--;
        dx += 2 * ry2;
        dy -= 2 * rx2;
        p += ry2 + dx - dy;
      }
    }
    p = Math.round(
      ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2,
    );
    while (y >= 0) {
      this._plot4(cx, cy, x, y, color);
      if (p > 0) {
        y--;
        dy -= 2 * rx2;
        p += rx2 - dy;
      } else {
        x++;
        y--;
        dx += 2 * ry2;
        dy -= 2 * rx2;
        p += rx2 - dy + dx;
      }
    }
  }

  private _plot4(
    cx: number,
    cy: number,
    x: number,
    y: number,
    color: [number, number, number],
  ): void {
    this.setPixel(cx + x, cy + y, color[0], color[1], color[2]);
    this.setPixel(cx - x, cy + y, color[0], color[1], color[2]);
    this.setPixel(cx + x, cy - y, color[0], color[1], color[2]);
    this.setPixel(cx - x, cy - y, color[0], color[1], color[2]);
  }

  /** 二次贝塞尔曲线：(x1, y1) -> (x2, y2), 控制点 (cx, cy) */
  public drawQuad(
    x1: number,
    y1: number,
    cx: number,
    cy: number,
    x2: number,
    y2: number,
    color: [number, number, number],
  ): void {
    const steps = Math.max(10, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 2));
    let px = x1,
      py = y1;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const nx = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
      const ny = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
      this.drawLine(
        Math.round(px),
        Math.round(py),
        Math.round(nx),
        Math.round(ny),
        color,
      );
      px = nx;
      py = ny;
    }
  }

  /** 三次贝塞尔曲线（两个控制点） */
  public drawCubic(
    x1: number,
    y1: number,
    cx1: number,
    cy1: number,
    cx2: number,
    cy2: number,
    x2: number,
    y2: number,
    color: [number, number, number],
  ): void {
    const steps = Math.max(12, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 2));
    let px = x1,
      py = y1;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const nx =
        mt * mt * mt * x1 +
        3 * mt * mt * t * cx1 +
        3 * mt * t * t * cx2 +
        t * t * t * x2;
      const ny =
        mt * mt * mt * y1 +
        3 * mt * mt * t * cy1 +
        3 * mt * t * t * cy2 +
        t * t * t * y2;
      this.drawLine(
        Math.round(px),
        Math.round(py),
        Math.round(nx),
        Math.round(ny),
        color,
      );
      px = nx;
      py = ny;
    }
  }

  /**
   * 导出为 24-bit RGB 字节流（去掉 alpha，用于 PNG encoder）。
   * 顺序：左上到右下，每像素 3 字节。
   */
  public toRgb24(): Buffer {
    const out = Buffer.alloc(this.width * this.height * 3);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const src = y * this.stride + x * 4;
        const dst = (y * this.width + x) * 3;
        out[dst] = this.buffer[src];
        out[dst + 1] = this.buffer[src + 1];
        out[dst + 2] = this.buffer[src + 2];
      }
    }
    return out;
  }
}

// ————————————————————————————————————————————
// TTF/OTF 渲染（基于 opentype.js 纯 JS 实现）
// ————————————————————————————————————————————

import * as fs from 'fs';
import * as path from 'path';
import { extractFontFromTtc, isTtcFile } from './ttc-extract';

/** 单个点（坐标是整数像素） */
interface Point {
  x: number;
  y: number;
}

/** 已加载字体的缓存 */
const fontCache = new Map<string, any>();

/** 从文件路径加载字体（同步，带缓存）；失败返回 null。
 *  自动识别 TTC（TrueType Collection）文件。
 */
function loadFont(filePath: string): any | null {
  if (fontCache.has(filePath)) {
    const cached = fontCache.get(filePath)!;
    if (cached !== null) return cached;
    // 之前缓存了 null（加载失败），现在清除缓存重试
    fontCache.delete(filePath);
  }
  try {
    const opentype = require('opentype.js');
    let font: any;
    if (isTtcFile(filePath)) {
      const bytes = extractFontFromTtc(filePath, 0);
      if (!bytes || bytes.byteLength === 0) {
        return null;
      }
      const ab = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
      font = opentype.parse(ab);
    } else {
      const buffer = fs.readFileSync(filePath);
      const ab = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
      font = opentype.parse(ab);
    }
    fontCache.set(filePath, font);
    return font;
  } catch (e) {
    return null;
  }
}

/** 把 opentype.Path 转成"子路径 + 点数组"，方便扫描线填充 */
function pathToSubpaths(fontPath: any): Point[][] {
  const subpaths: Point[][] = [];
  let current: Point[] = [];
  // opentype.Path 的 commands 数组形如：
  // [{ type: "M", x, y }, { type: "L", x, y }, { type: "C", x1, y1, x2, y2, x, y },
  //  { type: "Q", x1, y1, x, y }, { type: "Z" }]
  for (const cmd of fontPath.commands) {
    const t = cmd.type || cmd.type;
    if (t === 'M') {
      if (current.length > 0) subpaths.push(current);
      current = [{ x: cmd.x, y: cmd.y }];
    } else if (t === 'L') {
      current.push({ x: cmd.x, y: cmd.y });
    } else if (t === 'C') {
      // 三次 Bezier → 用 10 段折线近似
      const p0 = current[current.length - 1];
      const p1 = { x: cmd.x1, y: cmd.y1 };
      const p2 = { x: cmd.x2, y: cmd.y2 };
      const p3 = { x: cmd.x, y: cmd.y };
      for (let i = 1; i <= 10; i++) {
        const u = i / 10;
        const um = 1 - u;
        const x =
          um * um * um * p0.x +
          3 * um * um * u * p1.x +
          3 * um * u * u * p2.x +
          u * u * u * p3.x;
        const y =
          um * um * um * p0.y +
          3 * um * um * u * p1.y +
          3 * um * u * u * p2.y +
          u * u * u * p3.y;
        current.push({ x, y });
      }
    } else if (t === 'Q') {
      // 二次 Bezier
      const p0 = current[current.length - 1];
      const p1 = { x: cmd.x1, y: cmd.y1 };
      const p2 = { x: cmd.x, y: cmd.y };
      for (let i = 1; i <= 10; i++) {
        const u = i / 10;
        const um = 1 - u;
        const x = um * um * p0.x + 2 * um * u * p1.x + u * u * p2.x;
        const y = um * um * p0.y + 2 * um * u * p1.y + u * u * p2.y;
        current.push({ x, y });
      }
    } else if (t === 'Z') {
      if (current.length > 0) subpaths.push(current);
      current = [];
    }
  }
  if (current.length > 0) subpaths.push(current);
  return subpaths;
}

/** 扫描线填充：给定若干子路径，返回 (x,y) 点集（整数像素坐标） */
function rasterizeSubpaths(
  subpaths: Point[][],
  w: number,
  h: number,
): Set<number> {
  // 找到 y 范围
  let minY = Infinity,
    maxY = -Infinity;
  for (const sp of subpaths) {
    for (const p of sp) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!isFinite(minY) || !isFinite(maxY)) return new Set();

  const y0 = Math.max(0, Math.floor(minY) - 1);
  const y1 = Math.min(h - 1, Math.ceil(maxY) + 1);

  const filled = new Set<number>();

  // 对每条扫描线，收集与所有边的交点 x，然后在奇偶区间填充
  for (let y = y0; y <= y1; y++) {
    const scanY = y + 0.5; // 在像素中心扫描
    const xs: number[] = [];
    for (const sp of subpaths) {
      const n = sp.length;
      for (let i = 0; i < n; i++) {
        const a = sp[i];
        const b = sp[(i + 1) % n];
        // 只有在边跨越扫描线时才相交
        if ((a.y <= scanY && b.y > scanY) || (a.y > scanY && b.y <= scanY)) {
          const t = (scanY - a.y) / (b.y - a.y);
          const x = a.x + t * (b.x - a.x);
          xs.push(x);
        }
      }
    }
    xs.sort((p, q) => p - q);
    // even-odd fill：每两个交点之间是一个内部区间
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xStart = Math.max(0, Math.floor(xs[i]));
      const xEnd = Math.min(w - 1, Math.floor(xs[i + 1]));
      for (let x = xStart; x <= xEnd; x++) {
        filled.add(y * w + x);
      }
    }
  }
  return filled;
}

/**
 * 用外部 TTF/OTF 字体把 text 绘制到 RgbaImage。
 *
 * y 参数是 baseline 的 y 坐标（像素坐标系中 y 越大越靠下）。
 * 字形会在 baseline 上下分布：
 *   - top = y - ascender * fontSize / unitsPerEm
 *   - bottom = y + |descender| * fontSize / unitsPerEm
 *
 * 性能说明：每次调用都会重新生成路径（字符数 × ~100 个点），对验证码场景（几
 * 个字符、100×50 左右的画布）是足够快的，毫秒级完成。
 */
export function drawTextWithFont(
  img: RgbaImage,
  text: string,
  x: number,
  y: number,
  fontPath: string,
  fontSize: number,
  color: [number, number, number],
): void {
  const font = loadFont(fontPath);
  if (!font) {
    // 字体不可用：退化成"装饰方框"。
    // y 被当作 baseline，字符占 [y - fontSize*0.85, y + fontSize*0.15]
    const boxW = Math.max(4, Math.floor(fontSize * 0.7));
    const boxH = Math.max(6, Math.floor(fontSize));
    const top = Math.max(0, y - boxH + Math.floor(fontSize * 0.15));
    let cx = x;
    for (const ch of text) {
      for (let py = 0; py < boxH; py++) {
        for (let px = 0; px < boxW; px++) {
          const isBorder =
            px === 0 || px === boxW - 1 || py === 0 || py === boxH - 1;
          const isCross =
            px === Math.floor(boxW / 2) || py === Math.floor(boxH / 2);
          if (isBorder || isCross) {
            img.setPixel(cx + px, top + py, color[0], color[1], color[2]);
          }
        }
      }
      cx += boxW + 2;
    }
    return;
  }

  const textPath = font.getPath(text, x, y, fontSize);
  const subpaths = pathToSubpaths(textPath);
  const pixels = rasterizeSubpaths(subpaths, img.width, img.height);
  for (const idx of pixels) {
    const px = idx % img.width;
    const py = Math.floor(idx / img.width);
    img.setPixel(px, py, color[0], color[1], color[2]);
  }
}

/** 基于字体 ascender/descender 计算最合适的 baseline y，让字符在 h 内垂直居中 */
export function computeBaselineY(
  fontPath: string | null,
  fontSize: number,
  h: number,
): number {
  if (!fontPath) return Math.floor((h + fontSize) / 2);
  const font = loadFont(fontPath);
  if (!font) return Math.floor((h + fontSize) / 2);
  const asc = (font.ascender / font.unitsPerEm) * fontSize;
  const desc = Math.abs(font.descender / font.unitsPerEm) * fontSize;
  const glyphH = asc + desc;
  const top = Math.floor((h - glyphH) / 2);
  // baseline = top + asc
  return Math.max(Math.ceil(asc), Math.floor(top + asc));
}

/** 用外部 TTF/OTF 字体估算 text 的宽度（用于居中/分段布局） */
export function measureTextWithFont(
  text: string,
  fontPath: string,
  fontSize: number,
): number {
  const font = loadFont(fontPath);
  if (!font) return text.length * Math.max(4, Math.floor(fontSize * 0.7));
  const path = font.getPath(text, 0, 0, fontSize);
  const box = path.getBoundingBox();
  if (box.x2 === box.x1)
    return text.length * Math.max(4, Math.floor(fontSize * 0.7));
  return Math.max(4, Math.ceil(box.x2 - box.x1));
}
