# Happy Beans 本地 AI 上新助手 v0.1

> Phase 12A 范围：Windows 本地、离线推理、只生成草稿。不会连接 Supabase、上传 Storage、修改正式商品、自动发布或调用付费云端 AI。

## 1. 当前状态与安全边界

本工具读取外部图片目录，经本机 LM Studio 两阶段分析后，生成 `manifest.json` 和只读 `preview.html`。运行模式被代码固定为 `dry_run`；即使修改 Markdown 规则或 JSON 配置，也不能开启发布或数据库写入。

代码硬性禁止：

- 生成或猜测 SKU、库存、CAD 价格、规格。
- 从照片推断材质、容量、尺寸、产地、安全认证或护理方式。
- 声称食品级、微波炉适用或洗碗机适用。
- 访问非 `http://127.0.0.1:1234/v1` 的模型服务。
- 读取项目 `.env*`、调用云端 AI、连接 Supabase、删除/覆盖原图或发布网站。

草稿字段没有 SKU、价格和库存入口；标题、说明和 alt 中出现受禁事实时，代码会拒绝结果并局部重试，而不是生成 manifest。

## 2. 安装与模型要求

### 工具要求

- Windows 11。
- Node.js 24.x；仓库依赖已包含直接锁定的 `sharp@0.35.3`，用于解码、损坏检查、缩略图和联系表。
- LM Studio 本地服务器只监听 `127.0.0.1:1234`。
- 一个可信、instruction-tuned、支持图像输入和 JSON structured output 的本地模型。

依赖安全说明：Phase 12A CLI 直接解析外部图片，因此使用已修复相关 libvips 公告的 `sharp@0.35.3`。仓库已升级到 Next.js 16.2.12，并通过精确 npm override 让 Next.js 同样复用 `sharp@0.35.3`；最终 production dependency audit 为 0 vulnerabilities。

### 2026-07-27 本机只读审计

- LM Studio：`0.4.20+1`。
- GPU：NVIDIA RTX 4070 Ti，12GB VRAM。
- 本地 API：`http://127.0.0.1:1234/v1` 可访问；原生 `/api/v1/models` 能报告 vision capability。
- 可信正式内容模型已安装，并已用 `qwen3-vl-8b-instruct` 完成加载与真实调用验证；任务结束后已卸载以释放显存。两个既有 HauhauCS `Uncensored/Aggressive` 模型没有用于本工具。

### 已安装模型

优先使用 Qwen 官方 [`Qwen/Qwen3-VL-8B-Instruct-GGUF`](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct-GGUF)：

- 来源：Qwen 官方 Hugging Face 组织。
- 许可证：Apache-2.0。
- Q4_K_M 主模型约 5.03GB；视觉投影约 0.75–1.16GB。
- 预计下载约 5.8–6.2GB，落盘预留约 6.2GB；运行时还需显存和上下文空间。
- 官方模型卡提供图像输入、llama.cpp 和 LM Studio 使用入口。

店主已于 2026-07-27 授权下载。当前安装使用 Q4_K_M 主模型和 Q8_0 视觉投影：

- 官方 revision：`f982a07559d4a2f6c8744d840bf6fccab30eea96`。
- 主模型：5,027,784,800 字节；SHA-256 `67d1659bfe71b89d50b45a4ad1a9e5b997e5bb16ce5da66a6a6167abd569e9e2`。
- 视觉投影：752,289,728 字节；SHA-256 `c6ba85508d82f42590e6eb77d5340369ab6fecf107a7561d809523d8aa5f3bfd`。
- 原文件目录：`E:\本地ai\models\Qwen\Qwen3-VL-8B-Instruct-GGUF`。
- LM Studio 通过同盘 hard link 导入，没有复制第二份大文件；identifier 与当前配置均为 `qwen3-vl-8b-instruct`。
- 验证时加载设置：8,192 context、100% GPU offload；LM Studio 估算 5.38 GiB，实测加载成功。当前模型已卸载，文件和 LM Studio 导入项仍保留。

不要同时高负载运行 TTS、图片生成模型、大型游戏或其他本地 LLM。

LM Studio 官方文档确认 `/v1/chat/completions` 支持 `image_url`，structured output 可通过 JSON Schema 约束；并非所有小模型都能可靠遵循 schema，因此本工具仍会进行独立代码校验。

## 3. 项目内本地工作目录

默认目录位于项目根目录内，但已由根目录 `.gitignore` 整体排除，不会进入 Git：

```text
E:\Code\fudou\HappyBeans-Inbox\
├─ incoming\
├─ processing\
├─ completed\
├─ failed\
└─ output\
```

- `incoming`：店主放入 1–30 张 JPEG、PNG 或 WebP；文件名可含中文、空格和特殊字符。
- `processing/<batchId>`：生成的缩略图、编号联系表和断点 `state.json`。
- `completed/<batchId>.json`：完成标记；同一内容批次再次运行时直接跳过。
- `failed`：按失败阶段记录安全摘要；不含 secret 或完整模型请求。
- `output/<batchId>`：最终 manifest、预览和预览缩略图。

原始图片始终留在 `incoming`，工具不会移动、删除、改名或覆盖它们。用户可在人工确认后自行整理；v0.1 不自动归档。

## 4. 一键运行

先在 LM Studio Developer 页面启动本地服务器并加载配置中的可信视觉模型，然后任选一种方式：

```powershell
scripts\run-happy-beans-intake.cmd
```

或：

```powershell
npm.cmd run intake
```

双击 `.cmd` 会保留窗口，方便查看成功路径或错误摘要。用户不需要拼接参数。

运行时终端会逐步显示：图片扫描统计、分组请求/断点复用、当前商品组与总组数、模型尝试次数、草稿断点保存、manifest/预览生成以及失败摘要路径。模型处理期间不再只显示启动横幅。

## 5. 处理流程与恢复

1. 枚举文件并强制执行 1–30 个文件上限。
2. 读取内容哈希，计算稳定的 `hb-...` 批次 ID。
3. 仅接受 JPEG/PNG/WebP；拒绝空文件、超过 10 MiB、扩展名与内容不符、损坏或无法解码的图片。
4. 相同内容只保留第一张参与分析，其余写入 `duplicateFiles`。
5. 生成不超过配置尺寸的 JPEG 缩略图及带 `imageId` 的联系表；原图保持不变。
6. 第一阶段仅让模型分组；所有有效图片必须且只能出现一次，每组最多 10 张。
7. 第二阶段逐组生成草稿。每组单独重试，成功组立即写入断点；一个组失败不会重跑整批。
8. 代码复核图片覆盖、顺序、封面、alt、标签、置信度、禁止事实与所有字段。
9. 生成并再次校验 `manifest.json`，随后生成只读 HTML 预览和完成标记。

如果一个结构完整的草稿在耗尽全部重试后，唯一失败原因仍是标题、说明或 alt 中的禁用材质词，本地代码会启用受控兜底：只删除代码名单中的材质词，加入受影响字段与强制人工复核警告，将置信度压到 `minimumConfidence` 以下，再运行完整 `validateDraft`。任何价格、库存、容量、尺寸、产地、认证、护理问题，其他 schema 错误，或删词后形成空/无效文案，仍然安全失败。兜底不会恢复被删除的事实，也不会自动发布。

只有全部草稿和 manifest 都通过安全校验后，工具才创建 `output/<batchId>`。因此安全失败时没有最终预览属于正确行为；应按终端提示查看 `failed` 摘要和 `processing` 断点。旧版本可能留下空的 output 批次目录，但新版本不再提前创建。

如果进程中断，下次运行相同批次会读取 `processing/<batchId>/state.json`，复用仍通过校验的分组和已完成草稿。已完成批次不会重复生成。失败批次会标明 `file_validation`、`grouping`、`drafting`、`manifest` 或 `preview` 阶段。

## 6. 修改 AI 规则

编辑 [`config/content-ai/AI_RULES.md`](../config/content-ai/AI_RULES.md) 可以调整：品牌语气、标题/说明长度偏好、分组判断、允许标签说明、禁用营销词和不确定信息处理。

保存后，下一批模型 prompt 会包含新的 Markdown 原文。规则不能放宽代码安全边界，也不能加入数据库写入、云端 API、SKU、价格或库存生成。AI 没有修改该文件的能力。

修改规则内容时同步更新 `import.config.json` 的 `rulesVersion`，便于 manifest 追溯；不要复用旧版本号掩盖规则变化。

## 7. 运行配置

[`config/content-ai/import.config.json`](../config/content-ai/import.config.json) 字段：

| 字段 | 说明 |
|---|---|
| `rulesVersion` | 写入 manifest 的规则版本 |
| `workspaceRoot` | 项目内被 Git 忽略的本地绝对工作目录 |
| `directories` | 五个安全相对目录；不能使用绝对路径或 `..` |
| `maxBatchImages` | 每批上限；代码再限制为不超过 30 |
| `maxImagesPerProduct` | 每组上限；代码再限制为不超过 10 |
| `analysisImageMaxPixels` | 单张 AI 缩略图最长边，允许 256–2048 |
| `modelName` | LM Studio `/v1/models` 返回的精确可信视觉模型 ID |
| `lmStudioBaseUrl` | 只能是 `http://127.0.0.1:1234/v1` |
| `minimumConfidence` | 预览中的低置信度提示阈值 |
| `retryCount` | 分组/每组草稿额外重试次数，0–5；当前为 5 |
| `requestTimeoutMs` | 单次本机请求超时，1–300 秒 |
| `generatePreview` | 是否生成 HTML 预览 |
| `runMode` | Phase 12A 必须为 `dry_run` |
| `allowedTags` | 机器校验的标签 slug 与中文显示名 |

当前允许标签与现有快速展示初始标签一致：水杯、餐具、摆件、玩偶、地毯、礼物。后台未来新增标签后，本地配置不会访问 Supabase 自动同步；必须由维护者人工核对并更新本文件，避免打破本地隔离边界。

## 8. 输出内容

`manifest.json` 依据 [`manifest.schema.json`](../tools/happy-beans-intake/manifest.schema.json) 并经 TypeScript 等价强校验，包含：

- `batchId`、`schemaVersion`、`createdAt`、`modelName`、`rulesVersion`、`runMode`。
- 有效 `sourceFiles` 的原文件名、imageId、哈希、MIME、尺寸和字节数；不保存绝对原图路径。
- `duplicateFiles` 和 `rejectedFiles`。
- 每组 `imageIds`、标题、说明、允许标签、推荐封面、图片顺序、逐图中文 alt、置信度、不确定字段和警告。

`preview.html` 显示本批总数、有效图片、商品组数、重复/失败、组内缩略图、推荐封面、标题、说明、标签、置信度、不确定字段、警告和原文件名。它没有脚本、编辑器、上传或发布按钮。

## 9. 常见错误

- `incoming 文件夹为空`：放入 1–30 张支持图片。
- `超过 30`：拆分为多个不同内容批次。
- `没有可安全解码的有效图片`：检查空文件、扩展名、10 MiB 上限和图片损坏。
- `未暴露配置模型`：在 LM Studio 加载可信视觉模型，并复制 `/v1/models` 的精确 ID。
- `LM Studio 请求超时`：确认模型已加载、VRAM 足够；关闭其他高负载本地 AI 后再运行。
- `无效 JSON` / `图片引用无效` / `标签无效`：工具会在当前阶段或当前组重试；耗尽重试后安全失败，不写错误完成标记。
- `材质词反复失败`：耗尽重试后只对结构完整且仅命中材质禁区的草稿启用受控删除；预览会显示低置信度、受影响字段和人工复核警告。其他事实禁区不会自动删除。
- `只有启动横幅或 output 为空`：查看终端后续阶段提示与 `failed` 最新 JSON。安全校验失败不会生成最终 preview；已经通过的分组草稿仍保存在 `processing/<batchId>/state.json`，修正后重跑只继续未完成组。
- `批次已完成`：内容哈希相同，属于幂等保护；查看既有 `output/<batchId>`。如照片内容确实变化，会产生新 batch ID。

## 10. 人工判断草稿是否可用

逐组确认：

1. 图片是否真的属于同一商品，且没有漏图或跨商品合并。
2. 标题和说明是否只描述照片可见内容，没有材质、尺寸、容量、产地、认证或护理猜测。
3. 标签是否属于现有允许列表且确实合适。
4. 推荐封面是否主体完整、遮挡少；图片顺序是否合理。
5. 每张 alt 是否对应真实角度和主体。
6. 低于置信度阈值、任何 `uncertainFields` 或 `warnings` 都必须人工复核。
7. manifest 只是草稿，不能直接当成 SKU、价格、库存或可售状态。

v0.1 必须再使用约 20 张真实商品图片进行质量验收；受控测试图只能证明管线，不证明模型能正确理解真实商品。

### 当前真实模型证据

- 两张已授权真实商品图已完成完整路径：模型分组、逐组草稿、强校验、manifest、HTML 预览、完成标记及第二次运行幂等跳过。
- 模型正确将猫狗造型杯与苹果造型盘拆成两组，建议 `cups` / `tableware`，草稿未出现价格、库存、规格或受禁事实。
- 三图批次中前两组通过并保存在断点；第三张透明小熊杯的 `altZh` 多次生成“玻璃”，被材质硬限制持续拒绝。失败批次没有 manifest 或完成标记，证明规则生效，也说明当前 8B 模型对强词汇禁区的纠错能力有限。
- 店主的 30 张真实图片批次 `hb-2b14f16e7e8a409d` 已完成解码、缩略图和 8 组分组；`group-001` 草稿已通过并保存，下一组的 `img-010` 因 alt 反复生成“木质/玻璃”而安全停止。该批没有最终 manifest/preview，符合全批完成后才输出的边界。
- 当前仓库只有 3 张明确记录为已授权的真实商品照片，未用二维码、地图或未跟踪素材凑足 20 张。因此约 20 张真实照片的覆盖度验收仍未完成。

## 11. 后续 Supabase 接入边界

只有真实模型质量通过后，后续独立 Phase 才可设计：隔离的 AI 待审草稿表、Storage 自动上传、设备配对、网站后台审核队列和经管理员确认后的快速展示转换。届时仍应保持：

- 草稿不能自动公开。
- 本地设备凭证最小权限、可撤销且不进入浏览器或 Git。
- 上传与数据库登记具备补偿机制。
- 正式商品 SKU、CAD 价格、库存和规格只能由店主权威录入。

Phase 12A 没有实现上述任何云端或发布能力。

## 12. 可能的 GPT 云端替代方向（未实现）

店主提出以 GPT 视觉模型取代本地 8B 模型，并在审核后同步 Supabase。技术上可行，但机器接口不应以 Markdown/Word 文档作为唯一事实源；推荐继续使用严格 JSON manifest，再由同一数据渲染成人工预览文档。

建议后续另立 Phase，按以下边界设计：

1. 30 张图片先进入 private Supabase Storage 的隔离草稿批次路径，不进入公开商品目录。
2. 服务端以 OpenAI Responses API 做联系表分组，再按商品组生成 Structured Outputs；不把 30 张无分组图片塞进一份巨型自由文本请求。
3. AI 只生成可见内容草稿、允许标签、封面/顺序和 alt；价格、SKU、库存、规格、材质、尺寸等权威字段由店主提供或确认。
4. 结果保存到 admin-only、RLS 保护的 AI 待审表，状态至少区分 `processing / needs_review / approved / rejected / failed`。
5. 管理员必须先预览、拆分/合并、编辑并显式批准；批准动作再通过服务端受控转换到轻量快速展示系统。不得直接写正式商品、库存或订单表，也不得自动公开。
6. OpenAI API key 与 Supabase secret/service key 只允许存在于服务端；浏览器不得收到 secret，模型也不得获得数据库凭证或任意写工具。
7. Storage 上传、草稿落库和发布转换必须有幂等 ID 与补偿清理；邮件或 AI 失败不能留下半发布状态。

如果经营上允许最多 24 小时延迟，可评估 OpenAI Batch API 降低成本；如果需要店主上传后几分钟内审核，应使用同步/后台 Responses 请求。正式实现前必须用同一批约 20–30 张授权商品图比较本地模型与候选 GPT 模型的分组准确率、文案通过率、禁区命中率、延迟和单批成本。
