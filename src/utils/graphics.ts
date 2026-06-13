import { Color } from './color';

/**
 * 验证码绘图接口（与具体绘图实现解耦）。
 *
 * 可由以下后端实现：
 * - Node canvas (@napi-rs/canvas / node-canvas)：CanvasRenderingContext2D
 * - SVG：DOM/字符串构造
 * - PNG 原生：pngjs / sharp
 *
 * 接口故意与 Java 的 Graphics2D 相似，便于沿用原图元逻辑。
 */
export interface CaptchaGraphics {
  /** 设置描边颜色（后续 drawXxx 用）。 */
  setStrokeColor(color: Color): void;
  /** 设置描边宽度（像素）。默认 1。 */
  setStrokeWidth(width: number): void;
  /** 画一条直线 [(x1, y1) → (x2, y2)]。 */
  drawLine(x1: number, y1: number, x2: number, y2: number): void;
  /** 画一个椭圆的轮廓，外接矩形左上角 (x, y)、宽 w 高 h。 */
  drawOval(x: number, y: number, w: number, h: number): void;
  /** 画一条二阶贝塞尔曲线（二次）：(x1, y1) → (x2, y2)，控制点 (cx, cy)。 */
  drawQuadCurve(
    x1: number,
    y1: number,
    cx: number,
    cy: number,
    x2: number,
    y2: number,
  ): void;
  /** 画一条三阶贝塞尔曲线（三次）：(x1, y1) → (x2, y2)，两个控制点。 */
  drawCubicCurve(
    x1: number,
    y1: number,
    cx1: number,
    cy1: number,
    cx2: number,
    cy2: number,
    x2: number,
    y2: number,
  ): void;
}
