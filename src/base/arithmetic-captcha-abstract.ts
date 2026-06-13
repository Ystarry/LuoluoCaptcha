import { Captcha } from './captcha';

/**
 * 算术验证码抽象类：生成形如 `a op b` 的式子，答案由 `text()` 返回。
 * 比如： `5+3=?`  → text()="8"
 *
 * 一个简单安全的求值器：解析 `+` / `-` / `×`，
 * 支持 `num(10)` 即 0–9 数字拼接；不接受任意表达式，因此不存在
 * 代码注入风险。
 */
export abstract class ArithmeticCaptchaAbstract extends Captcha {
  private arithmeticString: string | null = null; // 计算公式字符串（如 "5+3=?"）
  private digits = 1; // 每个运算数的位数

  constructor() {
    super();
    this.setLen(2); // 默认 2 个数字参与运算
  }

  /** 设置每个运算数的位数（默认 1，即 0-9） */
  public setDigits(digits: number): void {
    this.digits = Math.max(1, digits);
  }

  public getDigits(): number {
    return this.digits;
  }

  /**
   * 生成随机算术验证码：
   *   取 `len` 个指定位数的整数，两两之间随机一个 `+`/`-`/`×`
   *   拼成 `a op b op c ...`，最后答案 = 从左到右顺序计算得到的值。
   *   chars = 答案字符串，arithmeticString = "a op b ... =?"
   */
  protected alphas(): string[] {
    const digits: number[] = [];
    for (let i = 0; i < this.len; i++) {
      const min = this.digits <= 1 ? 0 : 10 ** (this.digits - 1);
      const max = 10 ** this.digits - 1;
      digits.push(this.num(min, max + 1));
    }

    const ops: string[] = [];
    for (let i = 0; i < this.len - 1; i++) {
      const t = this.num(1, 4); // 1..3
      ops.push(t === 1 ? '+' : t === 2 ? '-' : '×');
    }

    // 计算值（从左到右，不处理优先级）
    // 若减法会导致负数，自动将该运算符改为加法，避免答案为负
    let value = digits[0];
    for (let i = 0; i < ops.length; i++) {
      const right = digits[i + 1];
      switch (ops[i]) {
        case '+':
          value += right;
          break;
        case '-':
          if (value < right) {
            ops[i] = '+';
            value += right;
          } else {
            value -= right;
          }
          break;
        case '×':
          value *= right;
          break;
      }
    }

    this.chars = String(value);

    // 展示字符串（图形上画这个）
    let expr = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0) expr += ops[i - 1];
      expr += String(digits[i]);
    }
    this.arithmeticString = expr + '=?';

    return this.chars.split('');
  }

  /**
   * 返回供绘图使用的算式（包含 `=?` 后缀）。
   */
  public getArithmeticString(): string {
    this.checkAlpha();
    return this.arithmeticString as string;
  }

  /** 允许外部设置显示字符串（用于测试/自定义场景） */
  public setArithmeticString(arithmeticString: string): void {
    this.arithmeticString = arithmeticString;
  }
}
