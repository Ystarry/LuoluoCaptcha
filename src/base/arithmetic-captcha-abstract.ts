import { Captcha } from './captcha';

/**
 * 算术验证码抽象类：生成形如 `a op b` 的式子，答案由 `text()` 返回。 / Arithmetic captcha abstract class: generates expressions like `a op b`, answer returned by `text()`.
 * 比如： `5+3=?`  → text()="8" / For example: `5+3=?` → text()="8"
 *
 * 一个简单安全的求值器：解析 `+` / `-` / `×`， / A simple and safe evaluator: parses `+` / `-` / `×`,
 * 支持 `num(10)` 即 0–9 数字拼接；不接受任意表达式，因此不存在 / supports `num(10)` for 0–9 digit concatenation; does not accept arbitrary expressions, so there is no
 * 代码注入风险。 / code injection risk.
 */
export abstract class ArithmeticCaptchaAbstract extends Captcha {
  private arithmeticString: string | null = null; // 计算公式字符串（如 "5+3=?"） / Arithmetic formula string (e.g. "5+3=?")
  private digits = 1; // 每个运算数的位数 / Number of digits for each operand

  constructor() {
    super();
    this.setLen(2); // 默认 2 个数字参与运算 / Default: 2 numbers participate in the operation
  }

  /** 设置每个运算数的位数（默认 1，即 0-9） / Set the number of digits for each operand (default 1, i.e. 0-9) */
  public setDigits(digits: number): void {
    this.digits = Math.max(1, digits);
  }

  public getDigits(): number {
    return this.digits;
  }

  /**
   * 生成随机算术验证码： / Generate random arithmetic captcha:
   *   取 `len` 个指定位数的整数，两两之间随机一个 `+`/`-`/`×` / Take `len` integers with specified digits, randomly insert `+`/`-`/`×` between each pair
   *   拼成 `a op b op c ...`，最后答案 = 从左到右顺序计算得到的值。 / Form `a op b op c ...`, final answer = value calculated sequentially from left to right.
   *   chars = 答案字符串，arithmeticString = "a op b ... =?" / chars = answer string, arithmeticString = "a op b ... =?"
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

    // 计算值（从左到右，不处理优先级） / Calculate value (left to right, no precedence)
    // 若减法会导致负数，自动将该运算符改为加法，避免答案为负 / If subtraction results in a negative number, automatically change the operator to addition to avoid negative answers
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

    // 展示字符串（图形上画这个） / Display string (draw this on the image)
    let expr = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0) expr += ops[i - 1];
      expr += String(digits[i]);
    }
    this.arithmeticString = expr + '=?';

    return this.chars.split('');
  }

  /**
   * 返回供绘图使用的算式（包含 `=?` 后缀）。 / Return the arithmetic expression for drawing (including the `=?` suffix).
   */
  public getArithmeticString(): string {
    this.checkAlpha();
    return this.arithmeticString as string;
  }

  /** 允许外部设置显示字符串（用于测试/自定义场景） / Allow external setting of display string (for testing/custom scenarios) */
  public setArithmeticString(arithmeticString: string): void {
    this.arithmeticString = arithmeticString;
  }
}
