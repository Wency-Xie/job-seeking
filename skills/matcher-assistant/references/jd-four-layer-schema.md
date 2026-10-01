# 四层 JD 拆解

所有条目均需唯一 `id`、`statement`、`classification` 与 `sourceQuotes`。`classification` 只能是 `fact`、`inference`、`unknown`。

## 1. 硬门槛 `hardGates`

学历、届别、专业、证书、语言、地点、工作许可等明确写出的准入条件。只把原文中的明确限制列为事实。不要假定年龄、专业或年限不可谈；模糊表述标记未知。

每项另含 `candidateStatus`：`met`、`not_met`、`unknown`，以及档案证据引用。只有档案明确证明时才可用 `met` 或 `not_met`。

## 2. 核心能力 `coreCapabilities`

职责和要求中反复出现、面试大概率验证的能力，最多 5 项。优先识别“动词 + 对象 + 产出”，例如“使用 Python 构建可复现的数据处理流程”，而非宽泛的“学习能力”。

每项必须设置正整数 `weight`，所有核心能力权重总和为 100。

## 3. 隐性期待 `implicitExpectations`

由汇报关系、团队阶段、跨部门对象、交付节奏或岗位定位推断的期待。必须标记为 `inference`，给出 `reasoning` 和 `confidence`（`low`、`medium`、`high`），并回链支持推断的原文。没有依据则不写。

## 4. 文化信号 `cultureSignals`

只记录用词和组织信号，如 fast-paced、结果导向、跨团队协作、频繁出差。文化信号不是对公司文化的事实判决；除非原文明示，否则应标记为推断。

## 原文回链

`sourceQuotes` 是数组，每项包含：

- `quote`：JD 中的短摘录，不改写。
- `start`、`end`：该摘录在规范化 JD 字符串中的字符偏移，左闭右开。

脚本会验证 `jd[start:end] == quote`。找不到精确位置时应修正偏移，不得用搜索结果页或公司常识代替 JD 原文。

