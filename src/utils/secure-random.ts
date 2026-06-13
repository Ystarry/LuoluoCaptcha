import { randomBytes } from 'crypto';

// 实现SecureRandom类（Node.js环境） / SecureRandom class implementation (Node.js environment)
/**
 * 安全随机数生成器 / Secure random number generator
 * @Author ystarry 2023-08-10
 * @Description 安全随机数生成器，提供加密安全的随机数生成方法 / Secure random number generator, provides cryptographically secure random number generation methods
 */
export class SecureRandom {
  // 生成随机字节 / Generate random bytes
  nextBytes(bytes: Uint8Array): void {
    const random = randomBytes(bytes.length);
    bytes.set(random);
  }

  // 返回一个 32 位无符号随机整数 [0, 2^32) / Returns a 32-bit unsigned random integer [0, 2^32)
  private nextUint32(): number {
    const bytes = new Uint8Array(4);
    this.nextBytes(bytes);
    return new DataView(bytes.buffer).getUint32(0, false) >>> 0;
  }

  // 生成随机整数 / Generate random integer
  // nextInt():        [0, 2^32)
  // nextInt(bound):    [0, bound)   均匀无偏 / uniform and unbiased
  nextInt(bound?: number): number {
    if (bound === undefined) return this.nextUint32();
    if (bound <= 0) throw new RangeError('bound must be positive');
    if (bound === 1) return 0;

    // 若 bound 是 2 的幂：直接位掩码取低位即可，均匀且高效 / If bound is a power of two: directly mask low bits, uniform and efficient
    if ((bound & -bound) === bound) {
      return this.nextUint32() & (bound - 1);
    }
    // 拒绝采样：消除 2^32 / bound 的非整除带来的尾部偏置 / Rejection sampling: eliminates tail bias caused by non-divisibility of 2^32 / bound
    // 即若 bits 落在 [2^32 - (2^32 % bound), 2^32) 则重新抽取 / If bits fall in [2^32 - (2^32 % bound), 2^32), redraw
    // 用 `bits / bound !== Math.floor(bits / bound)` 的安全写法： / Safe formulation using `bits / bound !== Math.floor(bits / bound)`:
    //   bits - (bits % bound) + (bound - 1) == bits + (bound - 1 - (bits % bound))
    //   当它 >= 2^32 时说明 bits 落在尾部（高位溢出）。由于 JS 的 number 能存 / When it >= 2^32, bits are in the tail (high-bit overflow). Since JS number can hold
    //   下 32 位整数及其和，这里直接与 0x100000000 比较即可。 / 32-bit integers and their sum, directly compare with 0x100000000 here.
    const MAX = 0x100000000;
    let bits: number;
    let value: number;
    do {
      bits = this.nextUint32();
      value = bits % bound;
    } while (bits - value + (bound - 1) >= MAX);
    return value;
  }

  // 生成 [0, 1) 区间的随机双精度浮点数 / Generate a random double in [0, 1)
  nextDouble(): number {
    // 等价于 Java 的 nextDouble：((next(26) << 27) + next(27)) / (1L << 53) / Equivalent to Java's nextDouble: ((next(26) << 27) + next(27)) / (1L << 53)
    // 取两个独立的 32 位随机值，分别保留 26 位和 27 位， / Take two independent 32-bit random values, keeping 26 and 27 bits respectively,
    // 然后合并为一个 53 位整数再除以 2^53。 / then combine into a 53-bit integer and divide by 2^53.
    const high26 = this.nextUint32() >>> 6; // 26 位 [0, 2^26)
    const low27 = this.nextUint32() >>> 5; // 27 位 [0, 2^27)
    return (high26 * 0x8000000 + low27) / 0x20000000000000;
  }
}
