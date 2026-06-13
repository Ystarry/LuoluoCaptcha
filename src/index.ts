/**
 * LuoluoCaptcha
 *
 * 提供 5 种图形验证码，无需 canvas 原生模块，纯 JS 实现。
 * 项目不保存验证码，由调用方自行管理答案。
 */

export { Captcha } from './base/captcha';
export { ArithmeticCaptchaAbstract } from './base/arithmetic-captcha-abstract';
export { ChineseCaptchaAbstract } from './base/chinese-captcha-abstract';

export { SpecCaptcha } from './captcha/spec-captcha';
export { GifCaptcha } from './captcha/gif-captcha';
export { ChineseCaptcha } from './captcha/chinese-captcha';
export { ChineseGifCaptcha } from './captcha/chinese-gif-captcha';
export { ArithmeticCaptcha } from './captcha/arithmetic-captcha';

export { CaptchaService } from './captcha/captcha.service';
export type { CaptchaType, CaptchaImageResult } from './captcha/captcha.service';

export { FontManager, FontStyle, CanvasNotInstalledError } from './utils/font-manager';
export type { CaptchaFont } from './utils/font-manager';
