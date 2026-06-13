# 验证码模块说明

## 概述

本模块提供图形验证码的生成与校验能力，支持 5 种验证码风格，配置从 `luoluo.yaml` 读取，无需依赖全局 session，每个验证码对应一个唯一 key，前端提交时回传即可校验。

---

## 支持的验证码类型

| 类型 | 格式 | 说明 |
|------|------|------|
| `spec` | PNG | 英文/数字静态验证码（默认） |
| `gif` | GIF | 英文/数字动态验证码，逐帧高亮字符 |
| `chinese` | PNG | 中文静态验证码，从常用汉字池随机选取 |
| `chinese-gif` | GIF | 中文动态验证码，逐帧高亮字符 |
| `arithmetic` | PNG | 算术验证码，显示算式（如 `3+5=?`），答案为校验值 |

---

## 配置文件

在 [`luoluo.yaml`](../../luoluo.yaml) 中配置：

```yaml
captcha:
  enable: true
  # 验证码过期时间（秒）
  expire: 60
  # 验证码长度（spec / gif / chinese / chinese-gif 的默认长度）
  length: 4
  # 默认验证码类型
  type: spec
  # 字体：项目 fonts/ 目录下的文件名 或 系统字体名
  # 系统字体时不会加载项目 fonts/ 目录的字体
  font: robot.ttf
  arithmetic:
    # 算术验证码运算数数量（默认 2 个数字，即一个运算符）
    length: 2
    # 每个运算数的位数（默认 1 位，即 0-9）
    digits: 1
```

### 配置项说明

- `length`：控制 `spec`、`gif`、`chinese`、`chinese-gif` 的字符数量。
- `type`：默认生成的验证码类型。
- `font`：
  - 若填写项目 `fonts/` 目录下的文件名（如 `actionj.ttf`、`robot.ttf`），则使用该字体文件。
  - 若填写系统字体名（如 `Arial`、`STHeiti`）或任意不存在的文件名，则视为系统字体，**不会加载项目 fonts/ 目录的字体**，由系统字体候选路径自动查找。
- `arithmetic.length`：算术验证码的运算数个数。例如 `2` 表示 `a op b`（一个运算符），`3` 表示 `a op b op c`（两个运算符）。
- `arithmetic.digits`：每个运算数的位数。例如 `1` 表示 0-9，`2` 表示 10-99。

---

## HTTP 接口

### 1. 获取验证码图片

```
GET /captcha/image?type={type}
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 否 | 验证码类型，默认 `spec` |

**响应头：**

| 头字段 | 说明 |
|--------|------|
| `Content-Type` | `image/png` 或 `image/gif` |
| `x-captcha-key` | 验证码唯一标识，校验时需回传 |

**示例：**

```bash
curl -v 'http://localhost:9526/captcha/image?type=arithmetic'
```

### 2. 校验验证码

```
POST /captcha/verify
```

**请求体：**

```json
{
  "key": "从响应头 x-captcha-key 获取",
  "code": "用户输入的验证码"
}
```

**响应：**

```json
{
  "success": true,
  "message": "验证通过"
}
```

**注意：**
- 一个 `key` 只能校验一次，无论成功或失败都会立即失效。
- 校验大小写不敏感。
- 验证码默认有效期 2 分钟（由 `CaptchaService.TTL` 控制）。

---

## 字体说明

### 项目字体

内置 10 款英文字体，位于 [`fonts/`](./fonts) 目录：

```
actionj.ttf  epilog.ttf  fresnel.ttf  headache.ttf  lexo.ttf
prefix.ttf   progbot.ttf ransom.ttf   robot.ttf     scandal.ttf
```

配置示例：

```yaml
font: robot.ttf
```

### 系统字体

若配置为系统字体名（如 `Arial`、`PingFang` 等），模块会按以下优先级查找系统字体文件：

- **macOS**：`/System/Library/Fonts/*.ttc`、`/Library/Fonts/*.ttc`
- **Windows**：`C:\Windows\Fonts\*.ttc`
- **Linux**：`/usr/share/fonts/...`

配置示例：

```yaml
font: Arial
```

### 中文验证码字体

`chinese` 和 `chinese-gif` 类型需要中文字体支持：
- 若配置了项目字体且该字体包含中文字形，优先使用。
- 若为系统字体模式，自动查找系统预装的中文字体（如 `PingFang.ttc`、`STHeiti`、`msyh.ttc` 等）。
- 若未找到任何中文字体，将退化为装饰方框。

---

## 核心类结构

```
luoluo-captcha/
├── captcha.controller.ts      # HTTP 接口层
├── captcha.service.ts         # 业务逻辑：生成、校验、存储、配置读取
├── base/
│   ├── captcha.ts             # 抽象基类（随机字符、干扰线/圆/曲线、字体管理）
│   └── arithmetic-captcha-abstract.ts  # 算术验证码基类（算式生成、安全求值）
├── spec-captcha.ts            # 英文 PNG 验证码
├── gif-captcha.ts             # 英文 GIF 验证码
├── chinese-captcha.ts         # 中文 PNG 验证码
├── chinese-gif-captcha.ts     # 中文 GIF 验证码
├── arithmetic-captcha.ts      # 算术 PNG 验证码
└── custom/
    ├── font-manager.ts        # 字体加载与管理
    ├── draw.ts                # 纯 JS 绘图（RGBA 帧缓冲、位图字体、TTF 渲染）
    ├── png.ts                 # PNG 编码器
    ├── gif.ts                 # GIF 编码器（基于 omggif）
    └── ttc-extract.ts         # TTC 字体提取工具
```

---

## 校验流程

1. 前端调用 `GET /captcha/image?type=xxx` 获取图片。
2. 服务端生成验证码，将答案与 `key` 存入内存 Map，并设置过期时间。
3. 前端将用户输入的 `code` 和 `key` 一起提交到 `POST /captcha/verify`。
4. 服务端根据 `key` 查找存储的答案，比较后返回结果，并立即删除该 `key`（一次性使用）。

---

## 注意事项

- 验证码答案存储在内存 Map 中，服务重启会清空。生产环境可替换为 Redis。
- 算术验证码的运算顺序为**从左到右**，不遵循先乘除后加减。
- 算术验证码已做负数保护：若减法会导致负数，自动将该运算符改为加法。
- GIF 验证码每帧间隔 200ms，循环播放。
