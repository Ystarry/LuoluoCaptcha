import { SpecCaptcha, GifCaptcha, ChineseCaptcha, ChineseGifCaptcha, ArithmeticCaptcha } from '../src';

// 中文测试在缺少系统字体时可能失败，属于预期行为
describe('Captcha Classes', () => {
  it('SpecCaptcha should generate PNG buffer', () => {
    const captcha = new SpecCaptcha();
    const buffer = captcha.toBuffer();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(captcha.text()).toHaveLength(4);
  });

  it('GifCaptcha should generate GIF buffer', () => {
    const captcha = new GifCaptcha();
    const buffer = captcha.toBuffer();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(captcha.text()).toHaveLength(4);
  });

  it('ArithmeticCaptcha should compute correct result', () => {
    const captcha = new ArithmeticCaptcha();
    const buffer = captcha.toBuffer();
    expect(buffer).toBeInstanceOf(Buffer);

    const text = captcha.text();
    const expr = captcha.getArithmeticString();
    expect(text).toMatch(/^\d+$/);
    expect(expr).toMatch(/\?$/);

    // 验证计算结果一致性：从算式中提取数字和运算符，从左到右计算
    const numbers = expr.replace('=?', '').split(/[+\-×]/).map(Number);
    const ops = expr.replace('=?', '').split('').filter(c => '+-×'.includes(c));
    let computed = numbers[0];
    for (let i = 0; i < ops.length; i++) {
      switch (ops[i]) {
        case '+': computed += numbers[i + 1]; break;
        case '-': computed -= numbers[i + 1]; break;
        case '×': computed *= numbers[i + 1]; break;
      }
    }
    expect(computed.toString()).toBe(text);
  });

  it('ArithmeticCaptcha should support custom digits', () => {
    const captcha = new ArithmeticCaptcha();
    captcha.setDigits(2);
    expect(captcha.getDigits()).toBe(2);
    const buffer = captcha.toBuffer();
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('ChineseCaptcha should generate PNG buffer', () => {
    const captcha = new ChineseCaptcha();
    const buffer = captcha.toBuffer();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(captcha.text()).toHaveLength(4);
  });

  it('ChineseGifCaptcha should generate GIF buffer', () => {
    const captcha = new ChineseGifCaptcha();
    const buffer = captcha.toBuffer();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(captcha.text()).toHaveLength(4);
  });
});
