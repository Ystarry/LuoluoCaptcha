/**
 * 颜色类型 / Color type
 * @Description 颜色类型，定义颜色的基本属性和方法 / Color type, defines basic properties and methods of a color
 */
export class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
  ) {}

  toHex(): string {
    const h = (n: number) =>
      Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, '0');
    return `#${h(this.r)}${h(this.g)}${h(this.b)}`;
  }

  toRgb(): string {
    const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    return `rgb(${c(this.r)}, ${c(this.g)}, ${c(this.b)})`;
  }

  toArray(): [number, number, number] {
    const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    return [c(this.r), c(this.g), c(this.b)];
  }
}

/**
 * 在 [fc, bc] 区间内生成随机颜色（三通道独立随机）。 / Generates a random color within [fc, bc] (independent randomness for three channels).
 * @param fc 最小值（0-255） / Minimum value (0-255)
 * @param bc 最大值（0-255） / Maximum value (0-255)
 * @param nextInt 无偏随机函数 [0, n) / Unbiased random function [0, n)
 */
export function randomColor(
  fc: number,
  bc: number,
  nextInt: (n: number) => number,
): Color {
  fc = Math.max(0, Math.min(255, fc));
  bc = Math.max(0, Math.min(255, bc));
  if (bc <= fc) return new Color(fc, fc, fc);
  const range = bc - fc;
  const r = fc + nextInt(range);
  const g = fc + nextInt(range);
  const b = fc + nextInt(range);
  return new Color(r, g, b);
}

/**
 * 在 [fc, bc] 区间内生成随机灰度色（三通道使用相同的偏移量）。 / Generates a random grayscale within [fc, bc] (three channels use the same offset).
 */
export function randomGrayColor(
  fc: number,
  bc: number,
  nextInt: (n: number) => number,
): Color {
  fc = Math.max(0, Math.min(255, fc));
  bc = Math.max(0, Math.min(255, bc));
  if (bc <= fc) return new Color(fc, fc, fc);
  const offset = nextInt(bc - fc);
  return new Color(fc + offset, fc + offset, fc + offset);
}
