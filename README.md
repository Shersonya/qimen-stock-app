# 股票奇门排盘分析工具

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Shersonya/qimen-stock-app)

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

- 当前仓库统一以 `@yhjs/dunjia@1.0.1` 作为唯一程序化排盘口径
- `/api/qimen`、全市场筛盘分析和参考盘生成已统一到同一套时家奇门引擎，避免同仓库出现两套口径并存
- 单元测试已固化 8 组完整基准样例，覆盖：
  - 常规样例：`1990-12-19 09:30`、`1991-04-03 09:30`、`1994-07-20 09:30`
  - 常规样例：`2001-08-27 09:30`、`2010-05-31 09:30`、`2018-06-11 09:30`
  - 边界样例：`2024-02-04 22:59`、`2024-02-04 23:10`
- 每组样例都校验：
  - 节气、月/日/时干支
  - 旬首、旬首干
  - 阴阳遁、局数
  - 值符星、值使门及其落宫
  - 九宫完整明细（天盘干、地盘干、星、门、神）

如果后续验收要对齐指定的外部排盘软件，请把“软件名称 + 版本 + 参数设置 + 至少 5 组完整样例”补进仓库，再把 fixture 扩充进去，而不是重新引入第二套排盘逻辑。

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
https://vercel.com/new/clone?repository-url=https://github.com/Shersonya/qimen-stock-app
```

### Deploy Button 模板

仓库首页已经可以直接使用下面这个按钮：

```md
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Shersonya/qimen-stock-app)

## 固定部署流程

当前工作区已经完成过一次 `vercel login` 和 `vercel link`，并绑定到
`shersonya's projects / qimen-stock-app`。

后续发布直接使用下面两个命令即可：

```bash
npm run deploy:preview
npm run deploy:prod
```

- `deploy:preview` 会发布新的预览版本
- `deploy:prod` 会直接更新正式站点 `qimen-stock-app.vercel.app`

如果后续换了机器或重新克隆仓库，只需要重新执行一次：

```bash
npx vercel login
npx vercel link --yes --scope shersonyas-projects --project qimen-stock-app
```
```

### 自定义域名

如果后面你要给朋友一个更正式的网址，可以在 Vercel 项目里进入 `Settings -> Domains` 绑定自己的域名。

## 测试

```bash
npm test
```

## 排盘调试

可以直接输出单个时间点的完整排盘计算快照：

```bash
npm run inspect:qimen -- 2001-08-27T09:30:00+08:00
```

如果要通过接口返回调试链路，可以请求：

```json
{
  "stockCode": "600519",
  "debug": true
}
```

这会在 `qimen.debug` 中返回节气、月/日/时干支、旬首、局数和值符/值使落宫，便于人工复核。

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
