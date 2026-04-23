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

## 部署

当前正式站点部署在腾讯云 EdgeOne：

```text
https://xinyuxia.cn
```

项目按 Next.js 应用方式构建和运行：

- 安装命令：`npm install`
- 构建命令：`npm run build`
- 本地生产启动命令：`npm run start`
- 当前版本不依赖环境变量，导入后可直接构建

### EdgeOne 发布流程

1. 把项目推送到 Git 仓库。
2. 在腾讯云 EdgeOne Pages 中导入该仓库。
3. 框架选择 Next.js，安装命令填写 `npm install`，构建命令填写 `npm run build`。
4. 绑定正式域名 `xinyuxia.cn`。
5. 后续发布以 EdgeOne Pages 的构建记录和域名状态为准。

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
