# 股票奇门排盘分析工具

这是一个基于 Next.js、React、TypeScript 和 TailwindCSS 构建的 Web 工具。输入 A 股股票代码后，系统会查询股票上市日期，使用默认上市时辰 `09:30` 进行时家奇门排盘，并以九宫格形式展示结果。

## 功能说明

- 输入 `600519`、`000001`、`300750` 等 6 位股票代码
- 调用东方财富公司概况接口查询股票名称、市场和上市日期
- 使用 `lunar-typescript + 拆补法` 生成时家奇门基础盘
- 返回 `/api/qimen` 接口数据并在前端展示
- 固定展示三张参考排盘图：
  - `ref-sh.png`
  - `ref-sz.png`
  - `ref-cyb.png`

## 排盘校准

- 当前时家奇门引擎已按 `xuebz.com/?chart=qimen` 的拆补盘结果做基准校验
- 单元测试中固化了多组对照时间点，包括：
  - `1990-12-19 09:30`
  - `1994-07-20 09:30`
  - `2010-05-31 09:30`
  - `2001-08-27 09:30`

## 目录结构

```text
qimen-stock-app
├── api
├── app
├── components
├── lib
├── public
├── tests
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── eslint.config.js
└── README.md
```

## 运行方式

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## Vercel 一键部署

这个项目已经整理成可以直接部署到 Vercel 的状态：

- 已提供生产脚本：`npm run build`、`npm run start`
- 已提供 Vercel 配置文件：`vercel.json`
- API 路由已显式使用 Node.js runtime，适合服务端请求东方财富数据
- 当前版本不依赖环境变量，导入后可直接部署

### 最快部署方式

1. 把项目推到 GitHub 仓库。
2. 打开 Vercel 控制台并导入该仓库。
3. 保持默认识别的 Next.js 配置即可。
4. 点击 `Deploy`。
5. 部署完成后，把生成的 `*.vercel.app` 链接发给朋友。

### 一键导入链接模板

当你把项目推到 GitHub 之后，可以把下面这个链接里的仓库地址替换掉，得到一个可以直接发给朋友或自己保存的 Vercel 一键导入链接：

```text
https://vercel.com/new/clone?repository-url=https://github.com/<你的GitHub用户名>/<你的仓库名>
```

例如：

```text
https://vercel.com/new/clone?repository-url=https://github.com/example/qimen-stock-app
```

### Deploy Button 模板

如果你想把“一键部署”按钮放到仓库首页，可以使用下面这段 Markdown，在替换仓库地址后放进 README：

```md
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/<你的GitHub用户名>/<你的仓库名>)
```

### 自定义域名

如果后面你要给朋友一个更正式的网址，可以在 Vercel 项目里进入 `Settings -> Domains` 绑定自己的域名。

## 测试

```bash
npm test
```

## 质量检查

```bash
npm run typecheck
npm run lint
npm run build
```

## API 说明

### `POST /api/qimen`

请求体：

```json
{
  "stockCode": "600519"
}
```

成功响应：

```json
{
  "stock": {
    "code": "600519",
    "name": "贵州茅台",
    "market": "SH",
    "listingDate": "2001-08-27",
    "listingTime": "09:30",
    "timeSource": "default"
  },
  "qimen": {
    "yinYang": "阴",
    "ju": 7,
    "valueStar": "天冲",
    "valueDoor": "伤门",
    "palaces": []
  }
}
```

错误响应：

```json
{
  "error": {
    "code": "INVALID_STOCK_CODE",
    "message": "请输入 6 位 A 股股票代码。"
  }
}
```

## 错误码

- `INVALID_STOCK_CODE`
- `STOCK_NOT_FOUND`
- `UNSUPPORTED_MARKET`
- `DATA_SOURCE_ERROR`
- `LISTING_DATE_MISSING`
- `API_ERROR`

## 示例股票

- `600519` 贵州茅台
- `000001` 平安银行
- `300750` 宁德时代
