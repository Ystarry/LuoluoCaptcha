import { SecureRandom } from './secure-random';

// 模块私有：全局共享的加密安全随机源
const RANDOMS_SECURE_RANDOM = new SecureRandom();

/**
 * 随机数工具类
 * @Author ystarry 2023-08-10
 * @Description 随机数工具类，提供随机数生成方法
 */
export class Randoms {
  // 实例级共享随机源（所有实例共用同一个 SecureRandom；子类如需替换可覆盖）
  protected readonly RANDOM = RANDOMS_SECURE_RANDOM;

  // 定义验证码字符，去除了0、O、I、L等容易混淆的字母
  public readonly ALPHA: string[] = [
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'J',
    'K',
    'M',
    'N',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'j',
    'k',
    'm',
    'n',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ];

  // 数字的最大索引，不包括最大值（显式声明为 number，避免字面量类型影响重载匹配）
  protected readonly numMaxIndex: number = 8;
  // 字符的最小索引，包括最小值
  protected readonly charMinIndex: number = this.numMaxIndex;
  // 字符的最大索引，不包括最大值
  protected readonly charMaxIndex: number = this.ALPHA.length;
  // 大写字母的最小索引，包括最小值
  protected readonly upperMinIndex: number = this.charMinIndex;
  // 大写字符最大索引
  protected readonly upperMaxIndex: number = this.upperMinIndex + 23;
  // 小写字母最小索引
  protected readonly lowerMinIndex: number = this.upperMaxIndex;
  // 小写字母最大索引
  protected readonly lowerMaxIndex: number = this.charMaxIndex;

  /**
   * 产生两个数之间的随机数 [min, max)
   */
  public nextIntRange(min: number, max: number): number {
    return this.RANDOM.nextInt(max - min) + min;
  }

  /**
   * 产生 0-num 的随机数，不包括 num
   */
  public nextInt(num: number): number {
    return this.RANDOM.nextInt(num);
  }

  /**
   * 与 Java 的 Randoms#num(min, max) 语义一致：返回 [min, max) 的整数。
   * 当只传一个参数时等价于 `nextInt(num)`（即 `[0, num)`）。
   */
  public num(min: number, max?: number): number {
    if (max === undefined) return this.nextInt(min);
    return this.nextIntRange(min, max);
  }

  /**
   * 返回 ALPHA 中的随机字符
   * 重载：alpha() / alpha(num) / alpha(min, max)
   */
  public alpha(): string;
  public alpha(num: number): string;
  public alpha(min: number, max: number): string;
  public alpha(min?: number, max?: number): string {
    if (min === undefined) {
      return this.ALPHA[this.RANDOM.nextInt(this.ALPHA.length)];
    }
    if (max === undefined) {
      return this.ALPHA[this.RANDOM.nextInt(min)];
    }
    return this.ALPHA[this.nextIntRange(min, max)];
  }
}
