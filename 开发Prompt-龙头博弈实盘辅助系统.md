# 奇门量化工作台 — 龙头博弈实盘辅助系统 开发 Prompt

> 文档性质：面向当前仓库的 AI 开发 Prompt，仅允许在现有 Next.js 工作台结构内增量实现。

## 目标

在现有 `/strategy -> /stock-pool -> /diagnosis` 链路内，新增“龙头博弈”子模块，固定流程为：

1. 主线切换监测
2. 龙头候选强度评分
3. 动态仓位建议
4. 加入股票池
5. 奇门诊断复核

## 技术边界

- 运行时能力必须使用 TypeScript / Next.js / React，不能把线上依赖切到 Python。
- 若实时分时、盘口、题材资金流数据缺失，必须返回 `missingFactors`、`confidence` 与降级说明，禁止伪装成完整实时评分。
- 以下项目只允许作为人工复核提示，不能由 AI 自动下结论：
  - 政策突发利空与监管风险
  - 龙虎榜真假机构席位
  - 情绪周期精确定位
  - 龙头气质识别

## 交付层级

### 自动层

- `/api/dragon-head/monitor`
- `/api/dragon-head/candidates`
- `DragonHeadMarketProvider`
- 强度评分、主线切换、动态仓位、灾难规避熔断

### 半自动层

- `public/templates/dragon-head-strategy.json`
- 设置页中可编辑的权重、阈值、黑名单、关键词库

### 人工层

- `public/templates/leader-gene-template.csv`
- `public/templates/emotion-cycle-template.csv`
- `public/templates/execution-review-template.csv`

## 规则要求

- 强度公式固定为 100 分制加权和：
  - `score = vr*30 + speed10m*30 + driveRatio*25 + sealRatio*10 + breakoutFreq*5`
- 仓位规则固定为：
  - `new>=90 => 50/30/20`
  - `new<90 && old>=85 => 30/50/20`
  - `new<80 && old<80 && top>=95 => 0/0/100`
  - 其他情况强制空仓
- 熔断规则固定为：
  - 两市跌停 >= 50
  - 昨日涨停今均幅 <= -5%
  - 空间板高度 <= 3 板

## 验收要求

- 必须补单元测试、API 集成测试、UI 测试和 smoke case。
- 必须支持 `demo/mock` 模式，至少包含：
  - 完整数据态
  - 降级评分态
  - 熔断停用态
- 实现完成后需提供真实 UI 截图，至少覆盖“正常建议态”和“熔断态”。
