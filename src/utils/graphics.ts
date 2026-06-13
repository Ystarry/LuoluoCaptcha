import { Color } from './color';

/**
 * 验证码绘图接口（与具体绘图实现解耦）。 / Captcha drawing interface (decoupled from specific drawing implementation).
 *
 * 可由以下后端实现： / Can be implemented by the following backends:
 * - Node canvas (@napi-rs/canvas / node-canvas)：CanvasRenderingContext2D
 * - SVG：DOM/字符串构造 / SVG: DOM/string construction
 * - PNG 原生：pngjs / sharp / PNG native: pngjs / sharp
 *
 * 接口故意与 Java 的 Graphics2D 相似，便于沿用原图元逻辑。 / The interface is intentionally similar to Java's Graphics2D for easy reuse of original primitive logic.
 */
export interface CaptchaGraphics {
  /** 设置描边颜色（后续 drawXxx 用）。 / Set stroke color (for subsequent drawXxx calls). */
  setStrokeColor(color: Color): void;
  /** 设置描边宽度（像素）。默认 1。 / Set stroke width (pixels). Default 1. */
  setStrokeWidth(width: number): void;
  /** 画一条直线 [(x1, y1) → (x2, y2)]。 / Draw a straight line [(x1, y1) → (x2, y2)]. */
  drawLine(x1: number, y1: number, x2: number, y2: number): void;
  /** 画一个椭圆的轮廓，外接矩形左上角 (x, y)、宽 w 高 h。 / Draw an ellipse outline with bounding box top-left (x, y), width w and height h. */
  drawOval(x: number, y: number, w: number, h: number): void;
  /** 画一条二阶贝塞尔曲线（二次）：(x1, y1) → (x2, y2)，控制点 (cx, cy)。 / Draw a quadratic Bézier curve: (x1, y1) → (x2, y2), control point (cx, cy). */
  drawQuadCurve(
    x1: number,
    y1: number,
    cx: number,
    cy: number,
    x2: number,
    y2: number,
  ): void;
  /** 画一条三阶贝塞尔曲线（三次）：(x1, y1) → (x2, y2)，两个控制点。 / Draw a cubic Bézier curve: (x1, y1) → (x2, y2), two control points. */
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
