import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CaptchaService } from './captcha/captcha.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, CaptchaService],
})
export class AppModule {}
