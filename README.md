# luoluo-captcha

**luoluo** (落落) is taken from the Chinese idiom *luò luò dà fāng* (落落大方), meaning natural, graceful, and unpretentious. This library aims to provide a captcha solution that is simple, straightforward, and elegantly easy to use.

A pure TypeScript captcha image generation library for Node.js (compiled to JavaScript). No native canvas modules required.

Supports 5 captcha types: `SpecCaptcha`, `GifCaptcha`, `ChineseCaptcha`, `ChineseGifCaptcha`, `ArithmeticCaptcha`.

**This library does not store or manage captcha answers.** It only generates images and returns the correct text. You must store the answer yourself (session, Redis, memory, etc.).

## Features

- Pure JS implementation, no native dependencies like `canvas` or `@napi-rs/canvas`
- PNG and GIF output
- Chinese character support (requires system Chinese fonts or custom TTF)
- Arithmetic captcha with configurable digits
- No answer storage — you manage verification yourself

If you copy the `dist` folder into your project instead of installing via npm, import directly from the path:

```ts
import { SpecCaptcha, ArithmeticCaptcha } from './dist';
```

## Quick Start

### Basic Usage

```ts
import { SpecCaptcha, GifCaptcha, ChineseCaptcha, ChineseGifCaptcha, ArithmeticCaptcha } from 'luoluo-captcha';
import * as fs from 'fs';

// 1. SpecCaptcha (PNG, alphanumeric)
// default: width=130, height=48, length=4
const spec = new SpecCaptcha();
fs.writeFileSync('spec.png', spec.toBuffer());
console.log('Answer:', spec.text()); // e.g. "A3B7"
```

![SpecCaptcha Example](docs/img/spec.png)

```ts
// 2. GifCaptcha (GIF, alphanumeric, highlight one char per frame)
const gif = new GifCaptcha();
fs.writeFileSync('gif.gif', gif.toBuffer());
console.log('Answer:', gif.text());
```

![GifCaptcha Example](docs/img/gif.gif)

```ts
// 3. ChineseCaptcha (PNG, Chinese characters)
// Requires Chinese font support. The library will auto-detect system fonts.
const chinese = new ChineseCaptcha();
fs.writeFileSync('chinese.png', chinese.toBuffer());
console.log('Answer:', chinese.text()); // e.g. "的一是了"
```

![ChineseCaptcha Example](docs/img/chinese.png)

```ts
// 4. ChineseGifCaptcha (GIF, Chinese characters)
const chineseGif = new ChineseGifCaptcha();
fs.writeFileSync('chinese.gif', chineseGif.toBuffer());
console.log('Answer:', chineseGif.text());
```

![ChineseGifCaptcha Example](docs/img/chinese-gif.gif)

```ts
// 5. ArithmeticCaptcha (PNG, math expression)
// default: width=130, height=48, length=2 (one operator), digits=1 (0-9)
const arithmetic = new ArithmeticCaptcha();
fs.writeFileSync('arithmetic.png', arithmetic.toBuffer());
console.log('Answer:', arithmetic.text()); // e.g. "8" (the computed result)
console.log('Expression:', arithmetic.getArithmeticString()); // e.g. "5+3=?"
```

![ArithmeticCaptcha Example](docs/img/arithmetic.png)

### Custom Parameters

```ts
// SpecCaptcha / GifCaptcha / ChineseCaptcha / ChineseGifCaptcha
// constructor(width, height, length, fontPath)
const captcha = new SpecCaptcha(130, 48, 6, '/path/to/font.ttf');

// ArithmeticCaptcha
// constructor(width, height, length, fontPath)
// length = number of operands (default 2, meaning one operator)
// digits = number of digits per operand (default 1, i.e. 0-9; 2 means 10-99)
const arithmetic = new ArithmeticCaptcha(130, 48, 2, '/path/to/font.ttf');
arithmetic.setDigits(2); // operands will be 10-99
fs.writeFileSync('math.png', arithmetic.toBuffer());
console.log('Answer:', arithmetic.text()); // computed result
```

## API Reference

### Common Methods

All captcha classes provide the following methods:

| Method        | Return    | Description                                                                      |
| ------------- | --------- | -------------------------------------------------------------------------------- |
| `text()`      | `string`  | Returns the correct answer. For arithmetic captcha, this is the computed result. |
| `toBuffer()`  | `Buffer`  | Returns the image buffer (PNG or GIF).                                           |
| `toBase64()`  | `string`  | Returns base64-encoded image data (without data URI prefix).                     |
| `out(stream)` | `boolean` | Writes the image to a writable stream.                                           |

### SpecCaptcha

```ts
new SpecCaptcha(width?, height?, len?, fontPath?)
```

| Parameter  | Default     | Description                                                                    |
| ---------- | ----------- | ------------------------------------------------------------------------------ |
| `width`    | `130`       | Image width                                                                    |
| `height`   | `48`        | Image height                                                                   |
| `len`      | `4`         | Number of characters                                                           |
| `fontPath` | `undefined` | Path to TTF/OTF font. Uses built-in fonts if omitted. Throws if not available. |

### GifCaptcha

```ts
new GifCaptcha(width?, height?, len?, fontPath?)
```

Same parameters as `SpecCaptcha`. Generates an animated GIF where each frame highlights one character.

### ChineseCaptcha

```ts
new ChineseCaptcha(width?, height?, len?, fontPath?)
```

| Parameter  | Default     | Description                                                                                                     |
| ---------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| `width`    | `130`       | Image width                                                                                                     |
| `height`   | `48`        | Image height                                                                                                    |
| `len`      | `4`         | Number of Chinese characters                                                                                    |
| `fontPath` | `undefined` | Path to a Chinese font (TTF/OTF/TTC). Auto-detects system fonts if omitted. Throws if no Chinese font is found. |

### ChineseGifCaptcha

```ts
new ChineseGifCaptcha(width?, height?, len?, fontPath?)
```

Same as `ChineseCaptcha`, but generates an animated GIF.

### ArithmeticCaptcha

```ts
new ArithmeticCaptcha(width?, height?, len?, fontPath?)
```

| Parameter  | Default     | Description                                                |
| ---------- | ----------- | ---------------------------------------------------------- |
| `width`    | `130`       | Image width                                                |
| `height`   | `48`        | Image height                                               |
| `len`      | `2`         | Number of operands (e.g. `2` means `a op b`, one operator) |
| `fontPath` | `undefined` | Path to TTF/OTF font. Required for rendering.              |

Additional methods:

| Method                      | Description                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `setDigits(digits: number)` | Sets digit count per operand. `1` = 0-9, `2` = 10-99, etc.                                        |
| `getDigits()`               | Returns current digit setting.                                                                    |
| `getArithmeticString()`     | Returns the expression string shown on the image, e.g. `"5+3=?"`.                                 |
| `text()`                    | Returns the **computed result**, e.g. `"8"`. This is the value you should store for verification. |

## HTTP API Examples

This project includes built-in NestJS endpoints. Start the server and request directly:

```bash
# English PNG captcha (default)
curl http://localhost:3000/captcha/spec

# English GIF captcha
curl http://localhost:3000/captcha/gif

# Chinese PNG captcha
curl http://localhost:3000/captcha/chinese

# Chinese GIF captcha
curl http://localhost:3000/captcha/chinese-gif

# Arithmetic PNG captcha (default: one operator, 0-9)
curl http://localhost:3000/captcha/arithmetic

# Arithmetic: 3 operands (two operators), 2 digits each (10-99)
curl "http://localhost:3000/captcha/arithmetic?len=3&digits=2"

# Generic endpoint (specify type via query)
curl "http://localhost:3000/captcha/image?type=spec"
curl "http://localhost:3000/captcha/image?type=arithmetic&digits=2"
```

The response header `X-Captcha-Text` contains the answer (URL-encoded). You must save and verify it yourself.

## Answer Storage

**This library does not store or verify captcha answers.** You must save the `text()` result yourself and compare it with the user's input.

Example using Express session:

```ts
import { SpecCaptcha } from 'luoluo-captcha';
import express from 'express';

const app = express();

app.get('/captcha', (req, res) => {
  const captcha = new SpecCaptcha();
  req.session.captcha = captcha.text(); // store answer yourself
  res.setHeader('Content-Type', 'image/png');
  res.send(captcha.toBuffer());
});

app.post('/verify', (req, res) => {
  const ok = req.body.code === req.session.captcha;
  res.json({ success: ok });
});
```

## NestJS Service (Optional)

If you use NestJS, you can also use `CaptchaService` to generate captchas. It reads optional configuration from `luoluo.yaml`.

```ts
import { CaptchaService } from 'luoluo-captcha';

@Controller('captcha')
export class CaptchaController {
  constructor(private readonly service: CaptchaService) {}

  @Get('image')
  async getImage(@Res() res: Response) {
    const { image, contentType, text } = this.service.create('spec');
    // Store `text` yourself (Redis, session, etc.)
    res.set('Content-Type', contentType);
    res.send(image);
  }
}
```

## Font Notes

- Built-in 10 English fonts are located in the `fonts/` directory.
- For `ChineseCaptcha` and `ChineseGifCaptcha`, a Chinese font is required. The library will auto-detect common system fonts (PingFang, STHeiti, Microsoft YaHei, NotoSansCJK, etc.).
- You can provide a custom font path via the `fontPath` constructor argument.

## Project Assessment & Improvement Log

A comprehensive assessment of the project and the improvements already made.

### Strengths

| Dimension | Assessment |
|-----------|------------|
| **Cross-platform** | No native dependencies like `canvas` or `@napi-rs/canvas`; runs in any Node.js environment |
| **Feature coverage** | Supports PNG, GIF, Chinese, and arithmetic captchas, covering most business scenarios |
| **API ergonomics** | Supports both `new XxxCaptcha()` direct usage and NestJS HTTP endpoints |
| **Security design** | Does not store answers internally; callers manage verification, avoiding concurrency issues |
| **Font rendering** | Pure JS glyph rasterization via `opentype.js`, no reliance on system graphics stack |

### Fixed Risk Items

| Risk | Original Severity | Fix | Status |
|------|-------------------|-----|--------|
| **Missing font files in production builds** | 🔴 High | Added `assets: ["fonts/**/*"]` to `nest-cli.json` so built-in fonts are copied to `dist/` automatically | ✅ Fixed |
| **Font path robustness** | 🟡 Medium | Rewrote `FontManager` `fontsDir` detection with fallback chain: `process.cwd()` → `__dirname` → `require.resolve`, plus clearer error messages | ✅ Fixed |
| **Type safety** | 🟢 Low | Defined `OpentypeFont` / `OpentypePath` interfaces in `draw.ts` and replaced all `any` types | ✅ Fixed |
| **TTC / cmap compatibility** | 🟡 Medium | `loadFont` now auto-detects `.ttc` files and extracts subfonts via `ttc-extract.ts` before parsing; kept `opentype.js@1.3.4` for cmap format 6 support | ✅ Fixed |
| **Performance bottleneck** | 🟢 Low | Added `glyphCache` in `draw.ts` keyed by `${fontPath}#${char}#${fontSize}` to reuse rasterized glyphs, plus `clearGlyphCache()` for external cleanup | ✅ Fixed |
| **Missing tests** | 🔴 High | Added `test/captcha.spec.ts` (6 unit tests) and `test/app.e2e-spec.ts` (2 endpoint tests) covering all 5 captcha types | ✅ Fixed |
| **README tech description** | - | Corrected "pure JavaScript" to "pure TypeScript (compiled to JavaScript)" to match the actual tech stack | ✅ Fixed |

### Remaining Notes

- **opentype.js version lock**: Currently pinned to `1.3.4` to support macOS system Chinese fonts (cmap format 6). Consider upgrading when v2+ resolves this format, and update `loadFont` Buffer/ArrayBuffer handling accordingly.
- **System Chinese font dependency**: `ChineseCaptcha` / `ChineseGifCaptcha` still require system Chinese fonts (e.g. PingFang, STHeiti, NotoSansCJK) or a custom `fontPath`.

## License

MIT
