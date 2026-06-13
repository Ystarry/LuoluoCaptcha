import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { CaptchaService, CaptchaType } from './captcha/captcha.service';
import { ArithmeticCaptcha } from './captcha/arithmetic-captcha';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly captchaService: CaptchaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * 获取验证码图片（通用接口，通过 query 参数指定类型）
   * @param type 验证码类型：spec(英文 PNG，默认) / gif(英文 GIF) / chinese(中文 PNG) / chinese-gif(中文 GIF) / arithmetic(算术 PNG)
   * @param len 字符数量（算术验证码为运算数个数）
   * @param digits 算术验证码专用：每个运算数的位数（1=0-9, 2=10-99）
   * @param res Express Response
   */
  @Get('captcha/image')
  getCaptchaImage(
    @Query('type') type: string,
    @Query('len') len: string,
    @Query('digits') digits: string,
    @Res() res: Response,
  ): void {
    const validTypes: CaptchaType[] = [
      'spec',
      'gif',
      'chinese',
      'chinese-gif',
      'arithmetic',
    ];
    const t = validTypes.includes(type as CaptchaType)
      ? (type as CaptchaType)
      : 'spec';

    if (t === 'arithmetic') {
      this.sendArithmeticCaptcha(len, digits, res);
      return;
    }

    const { image, contentType, text } = this.captchaService.create(t);

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Captcha-Text', encodeURIComponent(text));
    res.send(image);
  }

  /** 英文 PNG 验证码（默认） */
  @Get('captcha/spec')
  getSpecCaptcha(@Res() res: Response): void {
    this.sendCaptcha('spec', res);
  }

  /** 英文 GIF 验证码 */
  @Get('captcha/gif')
  getGifCaptcha(@Res() res: Response): void {
    this.sendCaptcha('gif', res);
  }

  /** 中文 PNG 验证码 */
  @Get('captcha/chinese')
  getChineseCaptcha(@Res() res: Response): void {
    this.sendCaptcha('chinese', res);
  }

  /** 中文 GIF 验证码 */
  @Get('captcha/chinese-gif')
  getChineseGifCaptcha(@Res() res: Response): void {
    this.sendCaptcha('chinese-gif', res);
  }

  /** 算术 PNG 验证码 */
  @Get('captcha/arithmetic')
  getArithmeticCaptcha(
    @Query('len') len: string,
    @Query('digits') digits: string,
    @Res() res: Response,
  ): void {
    this.sendArithmeticCaptcha(len, digits, res);
  }

  private sendCaptcha(type: CaptchaType, res: Response): void {
    const { image, contentType, text } = this.captchaService.create(type);
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Captcha-Text', encodeURIComponent(text));
    res.send(image);
  }

  private sendArithmeticCaptcha(
    len: string,
    digits: string,
    res: Response,
  ): void {
    const w = CaptchaService.WIDTH;
    const h = CaptchaService.HEIGHT;
    const l = len ? parseInt(len, 10) : 2;
    const d = digits ? parseInt(digits, 10) : 1;

    const captcha = new ArithmeticCaptcha(w, h, l);
    captcha.setDigits(d);

    const image = captcha.toBuffer();
    const text = captcha.text();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('X-Captcha-Text', encodeURIComponent(text));
    res.send(image);
  }
}
