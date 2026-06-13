import { Captcha } from './captcha';
import { FontStyle, CaptchaFont } from '../utils/font-manager';

/**
 * 中文验证码抽象类：默认使用楷体，生成 4 个随机汉字。
 *
 * 常用汉字表 DELTA 直接以字符串字面量保存，保持与 Java 版内容一致。
 * `alphaHan()` 从中等概率取字。
 */
export abstract class ChineseCaptchaAbstract extends Captcha {
  /**
   * 常用汉字字符表（与 Java 版一致）。
   * 去掉了原 Java 版中的重复 / 容易混淆字符后得到的字表。
   */
  public static readonly DELTA: string =
    '的一是了我不人在们有来他这个上着个地到大里说就去子得也和那要下看天时间过出小么起你都把好还多没为又可家学只以主会样年想生同老中十从自面前头道它后然走很像见两用她国动进成回什边作对开而已些现山民候经发工向事命给长水几义三声于高者理眼志点心战二问但身方实吃做叫当住听革打呢真全才四已所敌之最光产情路分总条白话东席次亲如被花口放儿常气五第使写军吧文运再果怎定许快明行因别飞外树物活部门无往船望新带队先力完却站代员机更九您每风级跟笑啊孩万少直意夜比阶连车重便斗马哪化太指变社似士者干石满日决百原拿群究各六本思解立河村八难早论吗根共让相研今其书座接应关信觉步反处记将千找争领或师结块跑谁草越字加脚紧爱等习阵怕月青半火法题建敢位唱海七女任件感准张团屋离色脸片科倒石' +
    '破片统切晚象服持课整完式取照必清消算界律临简视呼味印久握态兴温调满县足促陌忽录惊齿包念青望听推块维岸灰揭赛报刘久忘腹永巴托感温顿拥呼摆质盼跳顶尖归脚井显提寻创树忙名断友念爱劳脱旧免情古短见怕明言问斤早弄直握旁师引堂望队先黑再教视夜沉醒归苦离海最刻急负秒刻听' +
    '久轻怕尘效停忽板圆终拿青救离半导继收治难早论请根' +
    '步让言参改完' +
    '言关觉步反处记将千找争领或师结块跑谁草越字加脚紧爱等习阵怕月青半火法题建敢位唱海七女任件感准张团屋离色脸片科倒石破片统切晚象服持课整完式取照必清消算界律临简视呼味印久握态兴温调满县足促陌忽录惊齿包念青望听推块维岸灰揭赛报刘久忘腹永巴托感温顿拥呼摆质盼跳顶尖归脚井显提寻创树忙名断友念爱劳脱旧免情古短见怕明言问斤早弄直握旁师引堂望队先黑再教视夜沉醒归苦离海最刻急负秒刻听';

  constructor() {
    super();
    // 楷体 28 号字 —— 如果当前环境无 TTF 字体，则退回 system default
    const kaiti: CaptchaFont = {
      family: 'KaiTi, 楷体, STKaiti, serif',
      size: 28,
      style: FontStyle.PLAIN,
      fileName: 'KaiTi',
      filePath: '',
    };
    this.setFont(kaiti);
    this.setLen(4);
  }

  /**
   * 生成 4 个随机汉字作为验证码。
   */
  protected alphas(): string[] {
    const cs: string[] = new Array(this.len);
    for (let i = 0; i < this.len; i++) {
      cs[i] = ChineseCaptchaAbstract.alphaHan();
    }
    this.chars = cs.join('');
    return cs;
  }

  /**
   * 返回随机汉字（等概率从 DELTA 取字）。
   * 暴露为 public static，便于测试/扩展。
   */
  public static alphaHan(): string {
    const idx = Math.floor(Math.random() * ChineseCaptchaAbstract.DELTA.length);
    return ChineseCaptchaAbstract.DELTA.charAt(idx);
  }
}
