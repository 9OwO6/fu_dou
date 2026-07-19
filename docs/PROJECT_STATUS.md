# Happy Beans（福豆）项目状态

> 最后更新：2026-07-13（America/Vancouver）  
> 当前执行基线：`HAPPY_BEANS完整开发计划.md`

## 仓库现状

- 当前目录已初始化为 Git 仓库，当前分支为 `main`，远端 `origin` 为 `https://github.com/9OwO6/fu_dou.git`；首个实现 commit 已推送，Vercel 店主试用部署已连接该仓库。
- 根目录已有实体 `AGENTS.md`，后续任务必须完整读取并遵循。
- Phase 1–5B 与 Phase 6 已完成；Phase 5C 实现与自动化检查已完成，仍等待 OS 文件选择上传和页面删除按钮两项人工验收后关闭 Phase。
- 商品管理补充受控永久删除：后台列表/详情提供“删除”，仅草稿或归档且未被订单请求引用的商品可删除；已发布商品须先下架。删除级联清理商品数据、首页引用和 private 图片对象，并保留审计记录。
  - 新增正式 migration `20260714071921_controlled_product_delete.sql` 和 `010_controlled_product_delete.test.sql`；本地 migration 重建成功，数据库总计 188/188 个 pgTAP 断言通过。
- 主 Logo 已保存到 `assets/brand/happy-beans-logo-primary.jpg`；原图为 1080×1080 白底 JPEG，品牌名称按图确认成 `Happy Beans / 福豆`。
- 早期调研文档 `福豆网站开发.md` 仅作背景资料；范围冲突时以完整开发计划为准。

## Phase 0 状态

- 状态：已完成（资料框架完成；真实店主资产作为后续输入跟踪）
- 完成日期：2026-07-12
- 任务目标：冻结 MVP 边界，建立品牌/内容/商品资产清单和可填写的商品资料模板。
- 完成内容：
  - 冻结中文首发、免顾客登录、订单请求、CAD、自取/本地配送、灵活规格和受控首页等边界。
  - 建立品牌、Logo、商品图、代表商品、履约、FAQ、政策和联系信息清单。
  - 建立店主可复制填写的商品资料模板。
  - 使用猫狗茶杯、尺寸地毯和单规格商品验证 option/value/variant 表达能力。
  - 将待确认事项分为上线阻塞和非阻塞，并标明最晚提供阶段。
- 关键文件：
  - `assets/brand/happy-beans-logo-primary.jpg`
  - `assets/brand/README.md`
  - `docs/PHASE_0_REQUIREMENTS_AND_ASSETS.md`
  - `docs/PRODUCT_DATA_TEMPLATE.md`
  - `docs/PROJECT_STATUS.md`
- 新增路由：无
- 数据库迁移：无
- 新增环境变量：无
- 检查与结果：
  - 文档结构和必备章节检查：通过。已验证冻结边界、三类资产清单、阻塞分类、Phase 1/2 交接结论均存在。
  - 商品模板覆盖检查：通过。猫狗茶杯、尺寸地毯和单规格商品均可表达，且示例明确标记为不可上线的 `DEMO-*` 测试数据。
  - 文件存在性检查：通过。三份 Phase 0 文档均已创建并可读取。
  - Git 连接检查：通过。本地为未提交的 `main` 分支，`origin` fetch/push URL 均指向指定仓库，远端当前无分支。
  - Logo 完整性检查：通过。仓库副本与用户提供的原文件 SHA-256 一致，尺寸为 1080×1080。
  - 业务代码检查：不适用，本 Phase 禁止业务代码。
- 人工验证：
  - 当前暂不要求店主复制或填写商品模板。
  - Phase 2 前由店主提供至少 3 个代表商品的真实图片及使用权确认。
  - 后续真实商品录入时再确认每个在售组合的唯一 SKU、CAD 价格、库存和状态。
- 已知问题：
  - 当前 Logo 只有白底 JPEG，没有独立透明、矢量、横版或图标源文件；不阻塞 Phase 2 概念启动，但 Header/favicon 方案需要在 Phase 2 处理。
  - 未提供真实商品照片、商品图片授权或代表商品资料。
  - 店主通知邮箱、联系时效、自取描述和配送区域尚未确认。
- 有意延后内容：应用初始化、正式 UI、设计系统、数据库、认证、商品后台、购物车、订单请求、邮件和部署。
- 下一阶段依赖是否满足：
  - Phase 1：是。MVP 和工程边界已明确；不依赖真实品牌资产。
  - Phase 2：部分满足。品牌名称、主 Logo、范围、页面、语气和模板已明确；三类真实商品图及使用权确认到位后才可完成正式视觉概念。
- 下一任务开始前必须阅读：
  - 根目录 `AGENTS.md`
  - `HAPPY_BEANS完整开发计划.md`
  - `docs/PROJECT_STATUS.md`
  - `docs/PHASE_0_REQUIREMENTS_AND_ASSETS.md`
  - `docs/PRODUCT_DATA_TEMPLATE.md`

## 下一步交接

1. 如果先启动 Phase 1：只建立工程基础和项目规则，不提前制作正式商品 UI、数据库或邮件。
2. 如果准备 Phase 2：当前 Logo 已可使用；还需店主提供三类代表商品真实照片及其网站使用权。
3. 真实商品资料可以稍后按运营节奏整理；测试样例中的 `DEMO-*` 数据不得进入生产 seed。

## Phase 0 后续补充（2026-07-13）

- Git：本地已初始化 `main` 并连接空远端 `origin`；按项目规则未自动 commit 或 push。
- Logo：用户提供的原图已原样入库，复制前后 SHA-256 一致，没有 AI 重绘或颜色修改。
- 资产说明：新增 `assets/brand/README.md`，记录文件规格、使用边界和后续透明/横版/favicon 处理原则。
- Phase 范围：没有初始化 Next.js、添加依赖、创建路由、数据库或正式 UI。

## Phase 1 状态

- 状态：已完成
- 完成日期：2026-07-13
- 任务目标：建立可运行、可检查、可供后续多任务协作的 Next.js 工程基础。
- 完成内容：
  - 按官方文档和 npm stable 核对并精确锁定 Next.js、React、Tailwind CSS、TypeScript、ESLint 和 Vitest 版本。
  - 初始化 Next.js App Router、TypeScript、Tailwind CSS 和 ESLint；锁定 Node.js 24 LTS 主线并提交 npm lockfile。
  - 建立 `/` 到 `/zh` 的重定向、`/[locale]` 白名单骨架和 `/admin/login` 中文后台骨架。
  - 建立 `messages/zh.json` 字典和 locale 配置；英文架构已预留，但没有启用或发布英文页面。
  - 建立 lint、typecheck、test、build 命令，以及环境变量安全校验和单元测试。
  - 建立基础 `components/`、`lib/`、`tests/` 目录和 `docs/ARCHITECTURE.md`。
  - 完善 `.gitignore`，只允许无真实值的 `.env.example` 进入仓库。
- 关键文件：
  - `package.json`、`package-lock.json`、`tsconfig.json`、`eslint.config.mjs`、`vitest.config.ts`
  - `app/layout.tsx`、`app/page.tsx`、`app/[locale]/layout.tsx`、`app/[locale]/page.tsx`
  - `app/admin/login/page.tsx`、`messages/zh.json`、`lib/i18n/*`
  - `lib/env/schema.ts`、`tests/unit/env-schema.test.ts`
  - `.env.example`、`.gitignore`、`.nvmrc`、`docs/ARCHITECTURE.md`
- 新增路由：
  - `/`：重定向到 `/zh`
  - `/zh`：公开网站 Phase 1 骨架
  - `/admin/login`：管理员登录 Phase 1 骨架；尚无认证功能
- 数据库迁移：无
- API：无
- Storage：无
- 新增环境变量：
  - 浏览器可见：`NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - 仅服务器：`SUPABASE_SECRET_KEY`、`EMAIL_PROVIDER_API_KEY`、`ORDER_NOTIFICATION_EMAIL`
  - 以上仅在 `.env.example` 中保留空值模板；Phase 1 未读取或创建真实 secret。
- 检查与结果：
  - 全新 `npm ci`：通过；安装 390 个 packages，npm audit 为 0 vulnerabilities。
  - `npm run lint`：通过。
  - `npm run typecheck`：通过。
  - `npm test`：通过，1 个测试文件、2 个测试全部通过。
  - `npm run build`：通过；Next.js production build 生成 `/`、`/zh`、`/admin/login` 和 not-found 路由。
  - 环境变量安全测试：通过；缺失变量只报告变量名，不暴露已配置值。
- 人工验证：
  - 使用真实浏览器访问本地 production server；`/` 正确跳转 `/zh`，公开页和后台登录骨架均显示预期中文内容与标题。
  - 已验证 1440×900、1024×768、390×844；页面 scroll width 等于 viewport width，无横向溢出。
  - 两个路由均无相关 console warning/error，未出现 Next.js 错误覆盖层；真实重载后内容和 URL 保持正确。
- 已知问题：
  - 页面是明确标注的临时工程骨架，不是已批准的正式视觉页面。
  - `/admin/login` 尚无表单、认证或 Supabase 连接；这些属于 Phase 4。
  - 环境变量模板尚无真实值；对应服务在后续 Phase 接入时才按功能调用校验。
- 有意延后内容：正式视觉、真实商品、Supabase 配置/表/RLS/Storage、认证、后台 CRUD、购物车、订单请求、邮件、E2E 和部署。
- 下一阶段依赖是否满足：
  - Phase 2：工程依赖已满足；仍需 Phase 0 已记录的三类真实商品图及使用权确认，才能完成正式视觉概念。
  - Phase 3：其工程依赖 Phase 1 已满足，但不得在用户明确启动 Phase 3 前实施。
- 下一任务开始前必须阅读：
  - 根目录 `AGENTS.md`
  - `HAPPY_BEANS完整开发计划.md`
  - `docs/PROJECT_STATUS.md`
  - `docs/ARCHITECTURE.md`
  - 对应 Phase 的直接相关文档

## Phase 2 状态

- 状态：已完成
- 完成日期：2026-07-13
- 任务目标：在正式业务页面实施前，使用 Happy Beans 自有 Logo 和真实商品照片批准完整视觉概念，并形成可直接指导组件开发的设计系统。
- 完成内容：
  - 核对并原样使用用户提供的方形 Happy Beans Logo，没有重绘、改字或替换品牌资产。
  - 使用用户新增的动物杯具、小熊玻璃杯和苹果盘真实照片制作完整视觉概念。
  - 概念覆盖桌面首页全部主要区段、移动首页、商品列表、商品详情与规格选择、购物车、移动订单请求以及桌面/窄屏后台商品编辑。
  - 用户于 2026-07-13 明确批准该视觉方向。
  - 输出 `docs/DESIGN_SYSTEM.md`，记录品牌原则、颜色、字体、间距、响应式、圆角、边框、阴影、图片比例、组件状态、页面结构、动效和可访问性要求。
  - 将三张批准概念保存为项目参考资产，并明确概念图中的示例商品数据不得进入真实业务数据。
- 关键文件：
  - `docs/DESIGN_SYSTEM.md`
  - `assets/design/phase-2/01-discovery-home-listing.png`
  - `assets/design/phase-2/02-product-cart-order-request.png`
  - `assets/design/phase-2/03-admin-product-edit.png`
  - `assets/brand/happy-beans-logo-primary.jpg`
  - `assets/products/猫咪茶杯+柴犬茶杯.jpg`
  - `assets/products/小熊杯子.jpg`
  - `assets/products/苹果盘子.jpg`
- 新增或变更路由：无。
- 新增或变更组件和功能：无；本 Phase 没有实现正式业务页面。
- 数据库迁移：无。
- API：无。
- Storage：无。
- 新增环境变量：无。
- 检查与结果：
  - 资产存在性：通过；Logo、3 张真实商品图和 3 张批准概念均可读取。
  - 页面覆盖检查：通过；批准概念覆盖主计划要求的全部公开端和后台视图。
  - 设计系统结构检查：通过；颜色、字体、间距、圆角、边框、阴影、图片、组件状态、响应式、可访问性和逐页规则均已记录。
  - `npm.cmd run lint`：通过。
  - `npm.cmd run typecheck`：通过。
  - `npm.cmd test`：通过；3 个测试文件、6/6 个测试成功。
  - `npm.cmd run build`：通过；Next.js `16.2.10` production build 成功生成公开 locale、`/admin` 和 `/admin/login` 路由。
  - 直接调用 `npm` 时曾被本机 PowerShell 执行策略拦截 `npm.ps1`；改用同一安装的 `npm.cmd` 后完整检查通过，不是项目代码失败。
- 人工验证：
  - 已逐张检查原始 Logo 和三张真实商品照片，商品照片保持为权威来源。
  - 用户已查看三张完整概念并回复“暂时敲定这个方向”，构成 Phase 2 的明确视觉批准。
  - 本 Phase 未实现正式 UI，因此浏览器页面对照不适用；后续 UI Phase 必须保存实现截图并与本概念逐区比较。
- 已知问题与风险：
  - 当前 Logo 仍只有白底 JPEG，没有透明、矢量、横版或纯图标源文件；Header/favicon 最终资产仍需后续补充。
  - 当前三张真实商品图均为杯具/餐具方向，没有尺寸地毯；不阻塞已批准视觉方向，但尺寸型商品 UI 仍需在实现时用真实数据验证。
  - 概念图中的商品名、价格、库存、SKU、联系方式和年份仅为视觉示例，不得作为生产数据。
- 有意延后内容：正式页面实现、更多商品摄影、透明/横版 Logo、英文内容、数据库/业务功能变更、购物车逻辑、订单请求逻辑和部署。
- 当前 Phase 是否真正完成：是；完整方向已获用户批准，设计系统和概念参考已落地。
- 下一阶段依赖是否满足：
  - Phase 3 和 Phase 4 已在独立任务中完成。
  - 依赖 Phase 2 的正式公开商品 UI（Phase 6）已满足视觉依赖，但仍必须等待并满足主计划中 Phase 5 的数据与后台依赖。
  - 后续任何正式 UI 必须严格使用本设计系统并进行真实浏览器截图对照。
- Git 与外部操作：未 commit、未 push、未部署；不需要外部账号配置。
- 下一任务开始前必须阅读：
  - 根目录 `AGENTS.md`
  - `HAPPY_BEANS完整开发计划.md`
  - `docs/PROJECT_STATUS.md`
  - `docs/DESIGN_SYSTEM.md`
  - 当前 Phase 的直接依赖文档和现有实现

## Phase 3 状态

- 状态：已完成
- 完成日期：2026-07-13
- 任务目标：建立支持灵活规格、规格级库存、translation、订单请求快照和管理员权限的 Supabase 本地数据基础。
- 完成内容：
  - 使用 Supabase CLI `2.109.1` 执行 `supabase init`，并通过 `supabase migration new phase_3_initial_schema` 创建正式 migration。
  - 建立主计划第 12 节的 20 张公开表、枚举、约束、索引、`updated_at` 触发器和跨表一致性触发器。
  - 灵活规格支持“款式 + 颜色”“仅尺寸”“无 option”三类模式；事务结束前验证组合完整、同商品无重复组合且不跨商品引用 value。
  - 每个 variant 独立 SKU、CAD 价格、原价、库存、启用和活动时间；负库存、零价格和无效原价被约束拒绝。
  - 建立订单请求与 item 快照模型，约束数量、行合计、商品/variant 对应关系、至少一个 item 和订单小计一致。
  - 所有 `public` 表启用 RLS，并显式配置 Data API grants；统一以 `private.is_admin()` 和 `profiles` 判断管理员，不使用 `user_metadata`。
  - 匿名与 authenticated SELECT 按角色分开，authenticated 策略合并公开读取与管理员全量读取；管理员 INSERT、UPDATE、DELETE 按操作拆分，消除 permissive policy 重叠告警。
  - 建立 private `product-images` bucket 与匿名读取、管理员上传/替换/删除策略；限制 10 MiB、JPEG/PNG/WebP 和商品 UUID 路径。
  - 本地 Auth 关闭公众注册；seed 仅包含可重复执行的 `DEMO-*` 数据，不含测试账号、密码或真实顾客资料。
  - 新增 50 个 pgTAP 断言：模型/约束 26 个，匿名/非管理员/管理员权限 24 个。
  - 输出 `docs/DATA_MODEL.md` 与权限矩阵。
- 关键文件：
  - `supabase/config.toml`
  - `supabase/migrations/20260713075314_phase_3_initial_schema.sql`
  - `supabase/seed.sql`
  - `supabase/tests/001_schema_constraints.test.sql`
  - `supabase/tests/002_rls_permissions.test.sql`
  - `docs/DATA_MODEL.md`
  - `docs/ARCHITECTURE.md`
  - `package.json`、`package-lock.json`
- 新增路由：无
- 数据库迁移：`20260713075314_phase_3_initial_schema.sql`；由 CLI 正式生成，并已通过本地空库 reset 成功应用。
- API：无
- Storage：新增 private `product-images` bucket 与 RLS 策略；本地服务已启动，bucket 配置及匿名、非管理员、管理员策略已通过 pgTAP 验证。
- 新增环境变量：无；没有读取或修改 `.env.local`。
- 检查与结果：
  - `npx supabase --version`：通过，`2.109.1`。
  - `npm run lint`：通过。
  - `npm run typecheck`：通过。
  - `npm test`：通过，1 个文件、2 个现有单元测试通过。
  - `npm run build`：通过；路由仍为 `/`、`/zh`、`/admin/login` 和 not-found。
  - npm install/audit：新增 8 个 package，审计 399 个 package，0 vulnerabilities。
  - `npm run supabase:start`：通过；本地 Supabase 栈成功启动。
  - `npm run db:reset`：通过；空库重建、migration、seed 和服务重启均成功。
  - `npm run db:test`：通过；2 个 pgTAP 文件、50/50 个断言成功。
  - `npm run db:lint`：通过；`No schema errors found`。
  - `npm run db:advisors`：通过；安全和性能 advisors 均为 `No issues found`。
- 人工验证：
  - 本任务没有 UI 变更，因此真实浏览器验证不适用。
  - 已核对 Supabase 当前官方 CLI、migration/seed、RLS、Storage、测试文档和 2026 Data API breaking change。
  - migration、seed、RLS 与 Storage 策略已由真实本地 Postgres/Storage 栈执行和验证；本 Phase 无 UI，因此未进行浏览器页面验收。
- 已知问题：
  - 本地数据库命令依赖 Docker Desktop 处于运行状态；这属于正常开发前置条件，不是当前阻塞。
  - Phase 4 尚未创建真实管理员或登录流程；Phase 3 权限测试使用事务内测试身份，不包含密码或持久测试账号。
- 有意延后内容：管理 UI、公开商城、认证页面/会话、商品 CRUD、图片上传 UI、订单请求 API、邮件、顾客购物车和部署。
- 下一阶段依赖是否满足：是。Phase 3 的 migration、seed、50 个 pgTAP 断言、lint 与 advisors 已全部通过，可在用户明确启动后进入 Phase 4。
- 下一任务开始前必须阅读：
  - 根目录 `AGENTS.md`
  - `HAPPY_BEANS完整开发计划.md`
  - `docs/PROJECT_STATUS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATA_MODEL.md`
  - Phase 3 migration、seed 与测试文件

## Phase 4 状态

- 状态：已完成
- 完成日期：2026-07-13
- 任务目标：实现仅供管理员使用的邮箱密码认证、服务端会话、后台路由与操作层保护、后台 Shell、审计日志和首名管理员建立说明；不开放公众注册。
- 完成内容：
  - 接入 Supabase SSR 客户端与 cookie 会话刷新；登录和退出均通过 Server Action 执行。
  - `/admin` 受服务端 layout 保护；未登录用户会被重定向至 `/admin/login?reason=session_required`。
  - 权威管理员判断由服务端读取 Auth claims，再通过受 RLS 保护的 `profiles` 表复核；不使用可由用户修改的 `user_metadata`。
  - 后台操作层使用 `requireAdmin()` 再次授权；页面保护、Proxy 或客户端状态均不是唯一安全边界。
  - 普通 Auth 用户即使密码正确也不能进入后台，并会清除本次登录会话。
  - 建立响应式后台 Shell、概览页、登录/loading/error 状态和退出入口；Phase 5 功能仅以禁用说明呈现，没有提前实现。
  - 关闭公众注册，同时保留已有管理员邮箱密码登录能力。
  - 新增仅管理员可读取、且只允许追加本人 actor 记录的 `admin_audit_logs`；登录和退出写入受控审计事件。
  - 新增首名管理员建立、环境配置、登录/退出和故障排查说明；没有创建、提交或保留临时管理员账号。
- 关键文件：
  - `lib/supabase/server.ts`、`lib/supabase/proxy.ts`、`proxy.ts`
  - `lib/auth/admin.ts`、`lib/auth/credentials.ts`
  - `app/admin/login/page.tsx`、`app/admin/login/login-form.tsx`、`app/admin/login/actions.ts`
  - `app/admin/(protected)/layout.tsx`、`app/admin/(protected)/page.tsx`、`app/admin/(protected)/actions.ts`
  - `supabase/migrations/20260713162320_phase_4_admin_audit.sql`
  - `supabase/tests/003_admin_audit_permissions.test.sql`
  - `tests/unit/login-credentials.test.ts`、`tests/unit/supabase-auth-config.test.ts`
  - `docs/ADMIN_GUIDE.md`、`docs/ARCHITECTURE.md`、`docs/DATA_MODEL.md`
- 新增或变更路由：
  - `/admin/login`：管理员邮箱密码登录；已登录管理员会被送往 `/admin`。
  - `/admin`：受服务端身份和角色复核保护的后台概览与 Shell。
  - `proxy.ts`：只负责 `/admin/:path*` 会话 cookie 刷新，不承担最终授权。
- 数据库迁移：新增 `20260713162320_phase_4_admin_audit.sql`，创建 `admin_audit_logs`、索引、RLS、最小 GRANT 和不可更新/删除策略。
- API：无 Route Handler；认证操作使用 Server Actions，且服务端执行管理员复核。
- Storage：无变化。
- 环境变量：无新增；继续使用 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，没有在 Phase 4 应用代码中使用 secret/service-role key，也没有读取或修改真实 `.env.local`。
- 检查与结果：
  - `npm run db:reset`：通过；Phase 3 和 Phase 4 migration、seed 均从空库成功应用。
  - `npm run db:test`：通过；3 个 pgTAP 文件、60/60 个断言成功。
  - `npm run db:lint`：通过；`No schema errors found`。
  - `npm run db:advisors`：通过；安全和性能 advisors 均为 `No issues found`。
  - `npm run lint`：通过。
  - `npm run typecheck`：通过。
  - `npm test`：通过；3 个文件、6/6 个单元测试成功。
  - `npm run build`：通过；Next.js `16.2.10` production build 成功生成 `/admin`、`/admin/login`、公开 locale 路由和 Proxy。
  - `npm audit`：0 vulnerabilities。
- 真实浏览器与身份验证：
  - 游客：直接访问 `/admin` 会跳转登录页，并显示需要管理员会话；console 无 warning/error。
  - 普通 Auth 用户：邮箱密码可被 Auth 接受，但服务器角色复核失败，停留登录页且不能访问后台；console 无 warning/error。
  - 管理员：成功登录 `/admin`，后台 Shell 和概览正确显示；退出后重访 `/admin` 再次被拦截。
  - 审计：测试期间确认 `auth.login` 和 `auth.logout` 各写入一条记录。
  - 公众注册：直接调用本地 Auth 注册返回 `signup_disabled`。
  - 响应式：1280 桌面与 375 有效手机宽度均无横向溢出；登录、后台和退出路径无浏览器控制台错误。
  - 验证完成后已删除两个临时运行时测试身份及其审计记录；仓库和 seed 不含可登录测试账号或密码。pgTAP 文件只保留事务内使用的 `example.invalid` 固定身份夹具。
- 人工验收步骤：
  - 按 `docs/ADMIN_GUIDE.md` 在目标 Supabase Auth 中建立店主用户，并在受信任的 SQL Editor 中建立其唯一 `profiles(role = 'admin')` 记录。
  - 配置目标环境的公开 Supabase URL 与 publishable key，访问 `/admin/login` 登录，确认 `/admin`、退出和退出后直接访问拦截均符合预期。
  - 使用没有 admin profile 的 Auth 用户登录，确认不能进入后台。
- 已知问题与风险：
  - 尚未在真实托管 Supabase/Vercel 环境创建店主账号或执行 hosted smoke test；这需要用户控制的外部环境，属于部署前配置，不阻塞下一阶段本地开发。
  - Phase 2 正式视觉概念尚未完成；Phase 5 的后台功能可开始实现，但正式视觉收口仍须遵循后续批准的设计系统。
- 有意延后内容：商品/规格/分类/图片 CRUD、库存与上下架、首页运营配置、公开商城、购物车、订单请求、邮件和部署；均未在 Phase 4 提前实现。
- 下一阶段依赖是否满足：是。Phase 4 的代码、数据库、安全矩阵、三身份真实路径和 production build 均已验证，Phase 5A 已具备启动条件；本任务没有实施 Phase 5。
- Git 与外部操作：未 commit、未 push、未部署；开始 Phase 5A 不要求先完成这些操作。正式 Preview/Production 前仍需配置目标 Supabase、建立首名真实管理员并按环境执行 smoke test。
- 下一任务开始前必须阅读：
  - 根目录 `AGENTS.md`
  - `HAPPY_BEANS完整开发计划.md`
  - `docs/PROJECT_STATUS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATA_MODEL.md`
  - `docs/ADMIN_GUIDE.md`
  - Phase 4 认证代码、migration 和测试

## Phase 5A 状态

- 状态：已完成
- 完成日期：2026-07-13
- 任务目标：实现分类与基础商品 CRUD，包括列表、筛选、新建、编辑、复制、发布、下架、归档、中文内容、SEO、服务端校验和完整页面状态；不进入规格、库存或图片。
- 完成内容：
  - 新增受保护的商品列表、标题/slug 搜索、状态筛选、新建与编辑页。
  - 商品支持复制为独立草稿、发布、下架、归档和从归档恢复；归档保留历史数据，不做硬删除。
  - 商品表单维护中文标题、短描述、完整描述、SEO 标题和 SEO 描述，并同时提供 HTML 客户端约束与共享服务端校验。
  - 新增分类创建、编辑、显隐和数值排序；分类中文翻译与基础记录原子保存。
  - 新增路由级 loading、error、not-found 与空列表状态，并修正后台主栏在 1024px/390px 表格场景下的横向溢出。
  - 所有 Phase 5A mutation 都在 Server Action 内再次调用 `requireAdmin()`；数据库 RPC 使用 `security invoker`，继续受现有 RLS 管理员策略约束。
  - 商品/翻译或分类/翻译与审计记录在同一数据库事务内完成；复制明确不带入 Phase 5B/5C 的规格、库存和图片。
- 关键文件：
  - `lib/catalog/admin-validation.ts`、`lib/catalog/admin-data.ts`
  - `components/admin/product-form.tsx`、`components/admin/product-actions.tsx`、`components/admin/category-manager.tsx`
  - `components/admin/admin-navigation.tsx`、`components/admin/submit-button.tsx`
  - `app/admin/(protected)/products/**`、`app/admin/(protected)/categories/**`
  - `supabase/migrations/20260713184334_phase_5a_catalog_admin_functions.sql`
  - `supabase/tests/004_phase_5a_catalog_admin.test.sql`
  - `tests/unit/catalog-admin-validation.test.ts`
- 新增或变更路由：
  - `/admin/products`：商品列表、搜索、状态筛选和行级操作。
  - `/admin/products/new`：基础商品草稿创建。
  - `/admin/products/[id]`：中文内容与 SEO 编辑，以及复制/发布/下架/归档操作。
  - `/admin/categories`：分类创建、编辑、显隐与排序。
  - `/admin`：概览更新为显示 Phase 5A 已开放能力。
- 数据库迁移：新增 `20260713184334_phase_5a_catalog_admin_functions.sql`；没有新增业务表或放宽 RLS，只新增 6 个仅 `authenticated` 可执行的 `security invoker` 管理函数，并撤销 `public`/`anon` 执行权。
- API：无 Route Handler；管理读写使用受当前管理员 JWT 和 RLS 约束的 Server Components、Server Actions 与 Supabase RPC。
- Storage：无变化；未实现图片上传。
- 环境变量：无新增；应用仍只使用公开 Supabase URL 与 publishable key，不使用 secret/service-role key 执行业务操作。
- 检查与结果：
  - `npm run db:reset`：通过；全部 migration 与 seed 从空库成功应用。
  - `npm run db:test`：通过；4 个 pgTAP 文件、80/80 个断言成功。
  - `npm run db:lint`：通过；`No schema errors found`。
  - `npm run db:advisors`：通过；`No issues found`。
  - `npm run build`、`npm run typecheck`、`npm run lint`：通过。
  - `npm test`：通过；4 个文件、10/10 个单元测试成功。
- 真实浏览器与人工验证：
  - 使用临时本地管理员完成登录、商品状态筛选、空列表、客户端必填校验、重复 slug 服务端错误、新建、编辑、复制、发布、下架和归档。
  - 完成分类新建、编辑、排序值修改和隐藏验证。
  - 复制结果为草稿，并在 UI 明确说明不复制规格和图片。
  - 1440×900、1024×768、390×844 三种宽度复验；修复后页面无横向溢出，分类手机页可操作，浏览器 console 无 warning/error。
  - 测试完成后执行数据库 reset，临时管理员、测试商品、测试分类和审计记录均未保留。
- 人工验收步骤：
  - 使用真实管理员登录 `/admin/login`，进入 `/admin/products`，测试搜索与草稿/已发布/已归档筛选。
  - 新建商品草稿，填写中文内容和 SEO，保存后编辑、复制并逐项验证发布、下架、归档和恢复。
  - 进入 `/admin/categories`，创建分类，调整排序值与公开开关并保存。
  - 在手机宽度确认表格可在自身容器横向滚动，页面整体不横向溢出。
- 已知问题与风险：
  - 当前 Phase 3 数据模型没有定义商品与分类的关联关系；为避免擅自决定单分类或多分类，Phase 5A 没有在商品表单中加入分类归属。启动相关公开分类浏览前必须先确认关系模型并使用正式 migration 实现。
  - Phase 2 正式视觉概念仍未批准；当前后台沿用 Phase 4 安全 Shell 的中性视觉，不能视为最终品牌视觉验收。
  - 本地真实浏览器验证不等于托管 Supabase/Vercel smoke test；后者仍属于 Phase 11。
- 有意延后内容：任意规格和值、SKU、价格、库存、批量编辑（Phase 5B）；图片上传/排序/封面/规格关联、推荐、新品和特价时间（Phase 5C）；公开商城与分类浏览（Phase 6）。
- 下一阶段依赖是否满足：是。Phase 5B 可在用户明确启动后开始；Phase 5C 仍应等待 Phase 5B 完成。商品分类关系需在首次实际依赖前先确认。
- Git 与外部操作：未 commit、未 push、未部署；用户如需保存到 Git，仍需自行确认后执行 commit/push。无需新增外部账号配置即可继续本地 Phase 5B。
- 下一任务开始前必须阅读：
  - 根目录 `AGENTS.md`
  - `HAPPY_BEANS完整开发计划.md`
  - `docs/PROJECT_STATUS.md`
  - `docs/ARCHITECTURE.md`

## Phase 5B 状态

- 状态：已完成
- 完成日期：2026-07-13
- 任务目标：允许管理员维护任意规格名称和值、生成完整规格组合、禁用不销售组合，并编辑每个组合的唯一 SKU、CAD 价格、原价、库存和状态；不进入 Phase 5C 图片与运营状态。
- 完成内容：
  - 在受保护商品详情页新增“规格、价格和库存”编辑器，支持任意中文规格和值、增加/删除、笛卡尔组合生成与同步。
  - 同步组合时按规格值签名保留仍匹配的 SKU、价格、原价、库存和启用状态；无规格商品使用唯一默认 variant。
  - 支持逐组合编辑和 CAD 价格、原价、库存批量应用；不销售组合通过禁用保留，而不是制造不完整矩阵。
  - 客户端提供即时字段反馈；Server Action 使用共享 parser 权威验证重复规格名/值、组合完整性、重复组合、大小写不敏感重复 SKU、金额精度、原价关系和非负整数库存。
  - 新增 `security invoker` 原子 RPC，在单一事务内同步 option/value/translation/variant/link、执行 deferred 组合约束并写入管理员审计。
  - 数据库最终约束继续拒绝重复组合、同商品重复 SKU、零/负价格、原价不高于现价、负库存和跨商品 value。
  - 更新后台概览与导航，准确显示 Phase 5B 已开放、Phase 5C 仍延后。
- 关键文件：
  - `components/admin/variant-editor.tsx`
  - `app/admin/(protected)/products/[id]/variant-actions.ts`、`app/admin/(protected)/products/[id]/page.tsx`
  - `lib/catalog/admin-variants.ts`、`lib/catalog/variant-validation.ts`
  - `supabase/migrations/20260713190629_phase_5b_variant_admin.sql`
  - `supabase/tests/005_phase_5b_variant_admin.test.sql`
  - `tests/unit/variant-validation.test.ts`
  - `components/admin/admin-navigation.tsx`、`app/admin/(protected)/page.tsx`
  - `docs/DATA_MODEL.md`、`docs/ARCHITECTURE.md`、`docs/ADMIN_GUIDE.md`
- 新增或变更路由：
  - 无新增 URL；`/admin/products/[id]` 新增规格、批量编辑和 variant 矩阵功能。
  - `/admin` 概览和后台导航更新为 Phase 5B 实际状态。
- 数据库迁移：新增 `20260713190629_phase_5b_variant_admin.sql`；由 Supabase CLI 正式生成。没有新增业务表或放宽 RLS；新增一个仅 `authenticated` 可执行且内部再次复核管理员的 `security invoker` RPC。
- API：无 Route Handler；管理写入继续使用受管理员 JWT、Server Action、RLS 和原子 RPC 共同约束的路径。
- Storage：无变化；图片上传、排序、封面和 variant 图片关联仍属于 Phase 5C。
- 环境变量：无新增；没有读取、修改或创建 `.env.local`，没有使用 service-role key 执行业务保存。
- 检查与结果：
  - `npm.cmd run db:reset`：通过；最终从空库应用 Phase 3、4、5A、5B migrations 并恢复纯 DEMO seed。
  - `npm.cmd run db:test`：通过；5 个 pgTAP 文件、99/99 个断言成功。
  - `npm.cmd run db:lint`：通过；`No schema errors found`。
  - `npm.cmd run db:advisors`：通过；`No issues found`。
  - `npm.cmd test`：通过；5 个文件、16/16 个单元测试成功。
  - `npm.cmd run lint`、`npm.cmd run typecheck`、`npm.cmd run build`：全部通过；production build 正常生成既有路由。
  - 并行运行两个 Supabase CLI 检查时曾遇到本机 telemetry 文件锁；改为串行后 db lint 与 advisors 均独立通过，不是项目或数据库问题。
- 真实浏览器与人工验证：
  - 使用应用内真实浏览器和临时本地管理员验证 `/admin/products/[id]`；测试结束后已停止本地应用并执行数据库 reset，临时账号和浏览器修改未保留。
  - 猫狗茶杯：桌面 1440×900 显示款式×颜色 4 个组合；实际提交重复 SKU，页面在具体行显示错误；修正后禁用“狗狗 / 浅蓝色”并成功保存。
  - 尺寸地毯：笔记本 1024×768 显示 2 个尺寸组合；批量库存实际将两个组合同时改为 9 并成功保存。
  - 无规格商品：手机 390×844 显示无 option 提示和唯一“默认商品”组合，可编辑 SKU、CAD 价格和库存。
  - 1024 和 390 宽度下 `scrollWidth === clientWidth`，无页面级横向溢出；三条路径均无相关 console warning/error、无 framework overlay。
  - 最终 production build 重启后复验 `/admin`，Phase 5B 状态文案、导航和页面身份正确。
- 人工验收步骤：
  1. 使用真实管理员登录 `/admin/login`，打开任一 `/admin/products/[id]`。
  2. 为茶杯添加“款式：猫猫/狗狗”和“颜色：奶油色/浅蓝色”，点击“生成/同步组合”，确认出现 4 个组合。
  3. 填写各组合唯一 SKU、CAD 价格、可选原价、库存；禁用一个不销售组合并保存，刷新确认状态保留。
  4. 为地毯只设置“尺寸”及两个值，生成 2 个组合；使用批量库存或价格后保存并刷新。
  5. 对无规格商品保持规格列表为空，生成/保留一个“默认商品”组合并保存。
  6. 分别尝试重复 SKU、重复组合、库存 `-1`、价格 `0`、原价低于现价，确认无法保存且错误可定位。
- 已知问题与风险：
  - 组合已被未来图片或订单记录引用时，数据库会阻止删除；后台会提示保留并禁用。Phase 5C/8 实施后应继续验证该真实引用路径。
  - 单次配置限制最多 8 个规格、每个规格 50 个值和 500 个组合，避免意外生成不可管理矩阵。
  - 当前商品与分类关系仍未定义；与 Phase 5B 无关，但 Phase 6 分类浏览前仍需确认单分类或多分类模型。
- 有意延后内容：图片上传/排序/封面/规格关联、推荐、新品和特价时间（Phase 5C）；公开商城（Phase 6）；购物车、订单请求与邮件（Phase 7/8）。
- 当前 Phase 是否真正完成：是。功能、原子保存、安全边界、约束失败、三类真实数据、批量编辑与多宽度浏览器路径均已验证。
- 下一阶段依赖是否满足：是。Phase 5C 可在用户明确启动后开始；不得在当前任务提前实施。

## Phase 5C 状态

- 状态：实现完成，等待两项人工验收（2026-07-13）；尚未标记为真正完成。
- 本次范围：仅 Phase 5C；未实现公开商城、首页模块编辑、购物车、订单请求或邮件。
- 完成内容：
  - 商品详情页新增批量图片选择、浏览器预览、中文替代文字、规格关联、上传、排序、封面调整和删除。
  - private `product-images` Storage 继续使用管理员专属写策略；客户端直传后，Server Action 会再次复核管理员、实际 Storage 对象、路径、MIME、扩展名和 10 MiB 上限，再原子登记数据库元数据。
  - 上传登记失败会撤销本批 Storage 对象；删除先移除数据库元数据、再删除 Storage 对象，Storage 删除失败时使用受管理员保护的补偿函数恢复数据库记录。
  - 单批最多 20 张、单商品最多 100 张；只接受扩展名与 MIME 一致的 JPEG、PNG 和 WebP。
  - 图片排序第 1 张即封面；每张图片可关联同商品的具体 variant，数据库函数拒绝跨商品关联。
  - 商品运营状态新增 `is_featured`、新品发布时间 `new_from`；规格组合新增 `sale_starts_at`、`sale_ends_at`，特价时间必须有原价且结束晚于开始。
  - 后台概览和导航更新为 Phase 5C 实际状态。
- 路由和组件：
  - 无新增 URL；`/admin/products/[id]` 新增 `ImageManager` 和 `ProductOperationsEditor`，既有 `VariantEditor` 增加规格级特价时间。
- 数据库与 Storage：新增正式 migration `20260713213234_phase_5c_product_media_operations.sql`，提供受管理员和 RLS 约束的图片登记、保存、删除、恢复及运营状态原子函数，并扩展规格保存函数。
- API 与环境变量：无新增公开 API；无新增环境变量，浏览器客户端只使用现有 Supabase public URL/key。
- 自动检查：`db:reset`、`db:test`（6 个文件、120 个断言）、`db:lint`、`db:advisors`、`lint`、`typecheck`、单元测试和 production build 均通过。
- 真实浏览器验证：
  - 临时管理员可登录并打开 DEMO 商品；实际 private Storage 对象及数据库记录能显示签名预览。
  - 图片替代文字、封面顺序和两个不同 variant 关联保存后刷新仍保持。
  - 推荐状态、新品发布时间和规格特价起止时间保存后刷新仍保持。
  - 1440×900、1024×768、390×844 均能访问完整 Phase 5C 区域；测得文档宽度小于视口宽度，无横向溢出或 Next.js 错误覆盖层。
  - 使用同一临时管理员通过受保护删除 RPC 和 Storage API 删除两张测试图，浏览器刷新确认回到 0/100 空状态。
- 人工验收缺口：内置浏览器不支持向文件输入注入本地文件，且在长管理页捕获截图和远距离点击“删除”时出现 CDP 超时；因此尚未直接验证 OS 文件选择后的“上传所选图片”按钮，以及页面“删除”按钮的确认框。未保存实现截图。
- 已知问题与风险：真实线上 bucket、目标 Supabase Auth 和 Production 环境仍需部署阶段配置并复验；本地测试账号与测试图片不进入仓库或正式 seed。
- 有意延后内容：公开商品/分类页面（Phase 6）、购物车（Phase 7）、订单请求与邮件（Phase 8），以及主计划后续首页运营模块。
- 下一阶段依赖是否满足：数据与实现依赖已满足，但严格流程上应先完成人工上传/删除验收，再正式启动 Phase 6；商品分类关系仍须在 Phase 6 首次实际依赖前按既有已知问题确认。

## Phase 6 状态

- 状态：已完成（2026-07-13）。
- 本次范围：仅公开商品浏览体验；未实现购物车提交、订单请求、支付、顾客账号或首页后台编排。
- 完成内容：
  - 实现中文 Header、Footer、首页、商品列表、分类、新品、推荐、特价、搜索与商品详情。
  - 商品详情包含 private Storage 签名图画廊、缩略图切换、任意规格组合选择，以及随有效组合更新的 CAD 价格、原价、库存与售罄状态。
  - 商品与分类采用多对多关系；同一水杯可同时出现在“餐具”和“家居装饰”等多个分类中，后台商品详情可多选保存。
  - 加入根路径与页面 metadata、商品/分类动态 SEO、`robots.txt`、`sitemap.xml`、loading/error/not-found/empty 状态与中文 locale 字典。
  - 视觉严格沿用已批准 Phase 2 概念与 `docs/DESIGN_SYSTEM.md`，真实商品照片优先；本阶段有意不显示购物车、账号与订单请求入口。
- 新增路由：
  - `/zh`、`/zh/products`、`/zh/products/[slug]`
  - `/zh/categories/[slug]`
  - `/zh/collections/new`、`/zh/collections/featured`、`/zh/collections/sale`
  - `/robots.txt`、`/sitemap.xml`
- 数据库：正式 migration `20260713221343_phase_6_public_catalog.sql` 新增 `product_categories`、公开/管理员 RLS、最小显式 GRANT、`admin_save_product_categories` 与 DEMO 多分类归属；新增 `007_phase_6_public_catalog.test.sql` 18 个断言。
- API、Storage、环境变量：无新增 Route Handler；无 bucket 或 Storage 策略变化；无新增环境变量，不使用 service-role/secret key。
- 检查结果：最终 `db:reset`、`db:test`（7 文件、138/138）、`db:lint`、`db:advisors`、`lint`、`typecheck`、单元测试和 production build 全部通过。
- 真实浏览器与视觉对照：
  - 桌面 1455×1000、笔记本内容宽度 1024、手机 390×844 均无页面级横向溢出或错误覆盖层。
  - 验证首页、列表、两个分类、三种集合、关键词搜索、空结果、详情画廊、规格选择、特价和售罄状态；同一水杯在两个分类下均可访问。
  - 实现截图已与批准概念逐区比较 Header、Hero、分类、商品卡、筛选、详情双栏、图片裁切、规格层级和移动端单列；未发现仍需修正的明显视觉偏差。
  - 截图保存在 Codex visualizations 任务目录，测试结束后本地临时管理员和临时图片元数据已通过数据库 reset 清理。
- 已知风险：本地验证不等于 Vercel Preview/Production 与目标 Supabase smoke test；正式数据量增加后仍需检查分页策略和真实内容密度。Phase 5C 的两项 OS 人工验收仍独立待完成，不影响 Phase 6 已实现的公开只读路径。
- 有意延后：购物车（Phase 7）、订单请求与邮件（Phase 8）、首页运营后台以及后续部署验收。
- 当前 Phase 是否真正完成：是。范围内功能、数据库安全、SEO、响应式用户路径和视觉对照均已验证。
- 下一 Phase 启动条件：Phase 7 的公开数据与浏览 UI 依赖已满足；开始前仍应由用户明确启动，并继续保持本地游客购物车、不提交订单请求的阶段边界。
- Git 与外部操作：未 commit、未 push、未部署；无新增外部账号配置。用户验收后可自行决定是否提交和推送。
- Git 与外部操作：未 commit、未 push、未部署；无需新增外部账号配置即可继续本地开发。
- Git 与外部操作：未 commit、未 push、未部署；不需要新增外部账号或环境变量。用户如需保存到远端，仍需明确授权后再执行 commit/push。
- 下一任务开始前必须阅读：
  - 根目录 `AGENTS.md`
  - `HAPPY_BEANS完整开发计划.md`
  - `docs/PROJECT_STATUS.md`
  - `docs/DESIGN_SYSTEM.md`
  - `docs/DATA_MODEL.md`
  - `docs/ARCHITECTURE.md`
  - Phase 5B migration、tests 与现有商品编辑实现
  - `docs/DATA_MODEL.md`
  - `docs/ADMIN_GUIDE.md`
  - Phase 5A migration、Server Actions、校验和测试

## Phase 7 状态

- 状态：已完成（2026-07-13）。
- 本次范围：仅游客购物车；未实现订单请求提交、后台订单、邮件、在线支付、税费或运费计算。
- 完成内容：
  - 商品详情支持选择完整有效 variant、调整加入数量并写入游客购物车；未选完整、售罄、不可用或已达到当前库存的规格不能继续加入。
  - Header 新增购物车入口和总件数；不同 variant 独立成行，同一 variant 合并数量。
  - 新增 `/zh/cart`，支持服务端重新校验后的商品图、标题、完整规格、SKU、当前 CAD 单价、数量、行小计、商品小计、数量增减、删除和页面内二次确认清空。
  - localStorage 使用 `version: 1` schema；损坏 JSON、未知版本、非法项目、重复 variant、异常数量和 Storage 访问失败均安全处理，不让页面崩溃。
  - 页面加载与数量变化后由 Server Action 重新查询已发布商品、启用 variant、当前价格/特价、库存、规格翻译和图片；本地标题、价格、库存或商品状态不作为展示或金额依据。
  - 商品价格变化、库存不足、售罄及商品下架/规格禁用均提供行内提示；无效项目不进入服务器权威小计。
  - 小计区明确显示“运费和税费待确认”，并说明订单请求 Phase 8 才开放，本阶段不会付款或提交订单。
- 关键文件：
  - `lib/cart/schema.ts`、`lib/cart/server-validation.ts`
  - `components/cart/cart-provider.tsx`、`components/cart/cart-link.tsx`、`components/cart/cart-page.tsx`
  - `app/[locale]/cart/page.tsx`、`app/[locale]/cart/actions.ts`
  - `components/product/product-experience.tsx`、`components/layout/store-header.tsx`、`app/[locale]/layout.tsx`
  - `messages/zh.json`、`app/globals.css`、`tests/unit/cart-schema.test.ts`
- 新增或变更路由：
  - `/zh/cart`：游客本地购物车和服务器重新校验页面；设置为 `noindex, nofollow`，不加入 sitemap。
  - 商品详情加入规格级数量与加入购物车交互；公开 Header 加入购物车数量入口。
- 数据库、API、Storage 与环境变量：
  - 数据库 migration、表、函数、RLS 和 seed：无变化。
  - 新增一个仅供购物车页面调用的 Server Action，没有公开 Route Handler；它使用现有 publishable key 和匿名 RLS，不使用 service-role/secret key。
  - Storage bucket 与策略：无变化；仅为已登记公开商品图生成短时签名 URL。
  - 环境变量：无新增；没有读取、修改或创建 `.env.local`。
- 检查与结果：
  - `npm.cmd test`：通过；7 个文件、25/25 个单元测试成功，新增购物车版本解析、损坏恢复、重复合并、数量限制和服务端输入过滤覆盖。
  - `npm.cmd run lint`、`npm.cmd run typecheck`、`npm.cmd run build`：通过；production build 生成 `/zh/cart`。
  - 数据库 schema/RLS/Storage 未改变，因此本 Phase 没有新增 migration 或 pgTAP；现有匿名公开 RLS 通过真实页面 Server Action 路径复用验证。
- 真实浏览器与人工验证：
  - 从猫狗马克杯详情选择“猫猫/奶油色”和“狗狗/奶油色”分别加入，Header 显示 2 件；购物车显示两个独立 SKU、CA$24/CA$25 当前单价和 CA$49 商品小计。
  - 将猫猫数量增加到 2 后，小计变为 CA$73；刷新页面后数量仍为 2，证明持久化真实生效。删除狗狗行后只保留一行；页面内二次确认可清空并进入空状态。
  - 临时把本地猫猫 variant 改为 CA$26、库存 1，刷新后同时显示价格变化、库存不足、当前服务器价格和阻塞提示；再临时禁用该 variant，页面显示商品或规格不可用。测试后已恢复原价 CA$24、库存 8 和启用状态。
  - localStorage 损坏、未知版本、非法 UUID/数量和重复 variant 由单元测试直接覆盖；应用内浏览器没有修改 localStorage 的受支持接口，因此没有伪称完成浏览器内损坏注入。
  - 有效内容宽度 1265（桌面）、1024（笔记本）和 390×844（手机）均无页面级横向溢出；手机 Header、摘要、项目、数量控件和删除操作可见可用。缺图使用品牌占位，空状态、加载、价格/库存变化和不可用状态均已观察。
  - 页面身份、非空内容、交互状态和截图已检查；最终浏览器 console 无相关 warning/error 或 Next.js 错误覆盖层。
- 已知问题与风险：
  - localStorage 只属于当前浏览器和设备，不跨设备同步；清除浏览器数据会清空购物车，这是游客本地购物车的预期边界。
  - 购物车页面校验结果不是库存预留，也不能作为未来订单价格快照；Phase 8 提交时仍必须在单一服务端事务内再次权威重查。
  - 本地验证不等于 Vercel Preview/Production 与目标 Supabase smoke test；正式环境仍属于 Phase 11。
- 有意延后内容：订单请求表单、提交事务、请求编号、后台订单、邮件、honeypot 和限流（Phase 8）；在线支付明确不属于 MVP。
- 当前 Phase 是否真正完成：是。规格级加入、版本化持久化、服务端权威重校验、数量/删除/清空、异常状态和三档响应式真实路径均已验证。
- 下一阶段依赖是否满足：工程依赖已满足，用户明确启动后可进入 Phase 8；开始前仍需确认店主通知邮箱、自取/配送文案和邮件发件配置等既有业务输入。
- Git 与外部操作：未 commit、未 push、未部署；无需新增外部账号配置即可继续本地开发。用户如需保存到远端，仍需明确授权后再执行 commit/push。

## Phase 8 状态

- 状态：实现与本地核心流程验证完成；等待真实 Resend 发件配置和两封真实邮件验收后才能标记为真正完成。
- 完成日期：2026-07-13（实现与本地验证）
- 本次范围：仅订单请求、后台处理与邮件；未实现支付、顾客账号、公开订单查询、自动税费/配送费、库存预留或 Phase 9 首页运营。
- 完成内容：
  - 新增 `/zh/order-request`：联系、条件必填、履约、时间/备注、隐私同意、honeypot、服务器订单摘要和明确“未付款、未最终确认”提示。
  - 新增 `/zh/order-request/success`：只显示不可顺序枚举的 `HB-` 请求编号与下一步，不提供公开订单查询。
  - 新增 server-only 订单提交：HMAC IP/email 基础限流、一小时最多 3 次；事务内重新读取发布商品、有效 variant、规格、SKU、当前 CAD 价格、库存和图片路径，并写入请求/items 快照。
  - 浏览器、匿名和普通 authenticated 角色不能直接 INSERT 订单或执行提交 RPC；管理员也不能直接 UPDATE 订单字段。
  - 新增 `/admin/orders` 与 `/admin/orders/[id]`：列表、搜索、状态筛选、详情、顾客/履约信息、商品快照、管理员备注、状态流和邮件状态/重试。
  - 新增 Resend 纯文本店主通知与顾客确认邮件；两封邮件都写明未付款、未最终确认。请求事务先提交，邮件失败只记录 `failed`，不会丢失请求。
  - 新增邮件交付状态表、private 限流事件表、状态审计与完整 Phase 8 数据库测试。
- 关键文件：
  - `supabase/migrations/20260714000332_phase_8_order_requests.sql`
  - `supabase/tests/008_phase_8_order_requests.test.sql`
  - `app/[locale]/order-request/**`、`components/order-request/**`
  - `app/admin/(protected)/orders/**`、`components/admin/order-request-editor.tsx`
  - `lib/orders/**`、`lib/email/order-request-emails.ts`、`lib/supabase/service.ts`
- 新增路由：`/zh/order-request`、`/zh/order-request/success`、`/admin/orders`、`/admin/orders/[id]`。
- 数据库迁移：`20260714000332_phase_8_order_requests.sql`；新增 `order_request_emails`、两个邮件 enum、private 限流事件表、server-only 提交 RPC 和受审计管理员状态 RPC。
- API：无公开 Route Handler；顾客提交、购物车摘要和后台修改使用 Server Actions。订单事务 RPC 仅授予 `service_role`，后台状态 RPC 仅授予 authenticated 且函数内再次检查管理员。
- Storage：无变化；订单只保存现有商品图片路径快照。
- 环境变量：新增/调整为 `RESEND_API_KEY`、`ORDER_EMAIL_FROM`、`ORDER_NOTIFICATION_EMAIL`、`ORDER_RATE_LIMIT_SECRET`；继续使用 server-only `SUPABASE_SECRET_KEY`。没有读取或修改 `.env.local`，`.env.example` 无真实值。
- 新增依赖：精确锁定 `resend@6.17.2`，已更新 npm lockfile；npm audit 为 0 vulnerabilities。
- 检查与结果：
  - `db:reset`：通过；从空库应用全部正式 migrations 与 seed。
  - `db:test`：通过；8 个文件、164/164 pgTAP 断言成功，其中 Phase 8 新增 26 个断言。
  - `db:lint`：通过，`No schema errors found`。
  - `db:advisors`：通过，`No issues found`。
  - `typecheck`、`lint`：通过。
  - 单元测试：8 个文件、29/29 通过；新增表单条件校验、购物车输入过滤、同 variant 去重和 honeypot 覆盖。
  - production build：通过；生成全部新增公开与后台路由。
- 真实浏览器与人工验证：
  - 桌面 1440×900：购物车两种 variant 共 CA$49，订单页显示服务器摘要；选择电话 + 本地配送后，电话和邮编均变为必填；提交测试请求后进入成功页并清空购物车。
  - 后台真实显示同一请求、顾客/履约资料和两条商品快照；在未配置邮件环境时，两封邮件均记录 `failed` 与安全失败摘要，请求仍可见，证明邮件失败不丢单。
  - 管理员在真实浏览器完成 `new → contacted → confirmed → preparing → completed`，管理员备注保留；数据库测试另验证跳步被拒绝。
  - 笔记本有效宽度 1009、手机有效宽度 375 均满足 `scrollWidth === clientWidth`；手机订单页显示服务器摘要 CA$24，条件表单、同意框与提交按钮可操作。
  - 实现截图保存于当前 Codex visualizations 目录：`phase8-mobile-order-request-viewport.png` 与 `phase8-desktop-admin-order-viewport.png`，已人工检查布局、文案、层级、未付款提示和无横向溢出。
- 人工验收步骤：
  1. 配置本地/Preview 的 Supabase server secret、独立限流 secret 与 Resend 测试发件域名/收件箱。
  2. 从商品详情加入两个不同规格，在 `/zh/cart` 确认服务器价格后进入 `/zh/order-request`。
  3. 分别提交一次自取（邮箱联系）和本地配送（电话联系）请求，确认条件字段、成功编号与购物车清空。
  4. 登录 `/admin/orders`，按编号打开详情，确认快照、两封邮件状态，并按顺序推进到已完成。
  5. 临时使用 Resend 测试失败地址或移除测试邮件配置，确认请求仍入库且后台可重试；恢复配置后重试并确认两封邮件内容均写明未付款、未最终确认。
- 未完成项与风险：
  - 当前没有店主真实通知邮箱、已验证发件域名/地址、自取描述、配送服务区域和联系时效；因此未向外部邮箱发送真实邮件，也没有伪称邮件交付已验收。
  - 本地限流是数据库持久化的基础限制，未加入 Turnstile；真实滥用明显时再按计划评估，不在 MVP 预先增加摩擦。
  - 当前状态确认后仍由管理员人工扣减库存；顾客提交请求不会预留或扣减库存，这是既定 MVP 边界。
- 有意延后内容：在线支付、顾客账号/订单历史、公开状态查询、自动税费/运费、库存自动预留/扣减、Turnstile 和 Phase 9 首页运营。
- 当前 Phase 是否真正完成：否。代码、数据库、安全、失败边界和本地业务闭环已完成；仍缺真实 Resend 配置下的店主与顾客两封邮件交付验收。
- 下一 Phase 是否具备启动条件：Phase 9 的直接依赖为 Phase 5/6，工程条件已满足；但 Phase 8 若要正式关闭，必须先补齐真实邮件配置并完成两封邮件验收。
- Git 与外部操作：未 commit、未 push、未部署。用户需要配置 Resend/店主邮箱并执行人工邮件验收；如需 commit/push 必须另行明确授权。

## 云端开发 Supabase 建立记录（2026-07-13）

- 云端开发项目 `happy-beans-dev` 已建立于 Canada (Central)，项目状态已验证为 Healthy；它是 Development/Preview 数据环境，不代表 Production 已部署。
- 已通过 Supabase CLI 登录并 link；8 个正式 migration 已按顺序部署，远端 migration history 与本地完全一致。没有部署 `supabase/seed.sql`，云端没有导入 `DEMO-*` 测试商品。
- 新增 `20260714020008_secure_cloud_auto_rls_trigger.sql`：保留 Supabase 自动 RLS event trigger，同时撤销 API 角色对其 `security definer` 函数的直接执行权限。
- 远端验证：23 张 `public` 表、97 条 policies、0 张公开表缺少 RLS，private `product-images` bucket 存在；`public/private` schema lint 无错误。
- 远端 advisors 仅保留 `admin_update_order_request(...)` 的预期 `security definer` 提醒。该函数只授予 authenticated，内部固定空 `search_path` 并再次调用 `private.is_admin()`；普通登录用户不能通过它获得管理员写入权限。
- 本地非破坏性验证：只应用新增 migration，没有执行 `db:reset`；8 个 pgTAP 文件、164/164 断言通过，业务 schema lint 与本地 advisors 无问题。
- 云端 Auth 已在 Supabase 控制台关闭公众 signup，并在刷新页面后确认设置持久化；Email provider 保持启用，匿名登录和手动账号关联保持关闭。
- 尚未完成：真实 `.env.local` 仍由用户本人安全填写；尚未建立首名真实管理员；Resend、店主收件邮箱与两封真实邮件验收仍未完成。
- Phase 状态不变：这次操作完成云端开发数据库部署，但不等同于 Phase 8 邮件验收完成，也不等同于 Phase 11 Preview/Production 发布。
- Git 与外部操作：未 commit、未 push、未部署 Vercel。Supabase 云端开发项目和 migrations 已建立/部署；如需 Git commit/push 必须另行明确授权。

## Phase 9 状态

- 状态：已完成。
- 完成日期：2026-07-13
- 本次范围：只实现首页内容配置与运营能力；未实现自由建站、任意 HTML/JavaScript、在线支付、顾客账号、英文正式上线或 Phase 10 全站 QA。
- 完成内容：
  - 新增 `/admin/homepage`，固定维护公告条、Hero、热门分类、新品、推荐、特价、品牌故事、履约说明、FAQ 和联系 CTA。
  - 支持模块显隐、唯一排序值、受控文案、已登记商品图片、分类选品、自动/手动商品选品、1–8 显示数量、最多 5 组 FAQ、联系信息和履约开关。
  - 管理表单提供受控实时预览；只渲染 React 纯文本，不解析 HTML 或脚本。
  - 公开 Header 与 `/zh` 首页改为读取同一配置并按排序渲染；隐藏模块不留空白，失效/下架选品安全跳过，图片失效回退品牌默认资产。
  - TypeScript 共享 schema 与数据库 RPC 都拒绝额外字段、任意 CTA、无效实体引用、超限配置、重复排序和 HTML/脚本标记。
- 关键文件：
  - `supabase/migrations/20260714030708_phase_9_homepage_operations.sql`
  - `supabase/tests/009_phase_9_homepage_operations.test.sql`
  - `lib/homepage/schema.ts`、`lib/homepage/data.ts`
  - `app/admin/(protected)/homepage/**`、`components/admin/homepage-manager.tsx`
  - `app/[locale]/page.tsx`、`app/[locale]/layout.tsx`、`components/layout/store-header.tsx`
- 新增路由：`/admin/homepage`。公开 URL 不变；`/zh` 和 Header 的内容来源改为受控数据库配置。
- 数据库迁移：新增 Phase 9 migration，为首页 translation 增加 `content_json`，新增受控原子 RPC、默认 10 模块与中文安全基线。
- API：无公开 Route Handler；管理保存使用 Server Action + 管理员 JWT/RLS + `security invoker` RPC。
- Storage：无 bucket 或策略变化；Hero/品牌故事仅引用现有 private `product-images` 登记图片和短时签名 URL。
- 环境变量与依赖：无新增；未读取或修改 `.env.local`，未新增 npm package。
- 检查与结果：
  - `db:reset`：通过；全部 migration 与 seed 从空库成功应用。
  - `db:test`：通过；9 个文件、176/176 个 pgTAP 断言成功。
  - `npm test`：通过；9 个文件、34/34 个单元测试成功。
  - `lint`、`typecheck`、production `build`：全部通过；build 正常生成 `/admin/homepage` 和既有公开/后台路由。
  - `db:lint`：通过，`No schema errors found`；`db:advisors`：通过，`No issues found`。
- 真实浏览器与人工验证：
  - 临时本地管理员真实登录 `/admin/homepage`，完整加载 10 个模块、联系/履约设置、选品和受控实时预览。
  - 输入 `<script>alert(1)</script>` 后保存被拒绝，Hero 字段显示“只能填写纯文本，不能包含 HTML 或脚本标记”，数据库值未改变。
  - 实际将热门分类排序到 Hero 前、隐藏特价、把推荐改为手动选择一个已发布商品并保存；后台显示成功，公开 `/zh` 立即按新顺序渲染、特价区完全消失、推荐只显示所选商品。
  - 任意排序下页面自动保持唯一 `h1`，其余模块使用 `h2`；测试顺序下第一个热门分类为 `h1`，Hero 为 `h2`。
  - 公开首页在 1280×720、1024×768、390×844 验证；对应 `scrollWidth` 分别为 1265、1009、375，均不超过视口。手机 Hero 为单列并保留移动菜单。
  - 手机 390 宽后台完整加载 11 个 fieldset（站点设置 + 10 模块），`scrollWidth === 390`，保存按钮可用；浏览器 console 无相关 warning/error。
  - 桌面实现截图保存为 Codex visualizations 中的 `phase9-desktop-home-full.png`，已对照批准概念检查浅黄/浅蓝品牌区、分类卡、Hero 商品图、商品卡和响应式结构。
  - 验收后已停止测试服务并再次 `db:reset`；临时管理员、测试审计和浏览器修改均未保留。
- 已知问题与风险：
  - 本地 seed 没有真实已登记商品图片，因此 Hero/品牌故事的后台图片列表可能为空，前台会使用已批准的品牌默认商品图；真实图片选品需店主先通过商品图片后台登记。
  - 联系方式、品牌故事、服务区域和 FAQ 的正式业务文案仍需店主确认；当前默认文案不虚构具体店主事实、地址或承诺。
  - Phase 8 仍独立等待真实 Resend 两封邮件验收；Phase 9 的直接依赖不受该缺口影响。
- 有意延后内容：Phase 10 全站 E2E/可访问性/安全 QA、Phase 11 Preview/Production、英文正式内容、自由拖拽和任意代码编辑。
- 当前 Phase 是否真正完成：是。功能、三层 schema 校验、RLS/RPC、显隐、排序、自动/手动选品、安全降级、桌面/笔记本/手机和真实保存到前台更新路径均已验证。
- 下一 Phase 是否具备启动条件：Phase 9 自身已满足交接条件；但 Phase 10 依赖 Phase 3–9 全部关闭，当前 Phase 5C 仍有 OS 文件选择/删除确认人工缺口，Phase 8 仍缺真实 Resend 两封邮件验收，因此严格流程下暂不应启动 Phase 10。
- Git 与外部操作：Phase 9 完成时尚未 commit、push 或部署；后续经用户明确授权，已完成首个 commit/push、云端 migration 和店主试用部署，详见下方部署记录。

## 店主试用部署记录

- 部署日期：2026-07-13（America/Vancouver）。
- Git：首个实现 commit `9633920b1b15420d84f5dcb5bed893d7b8205e63` 已推送到 `origin/main`。
- Supabase：云端开发项目 `happy-beans-dev` 已应用包括 Phase 9 在内的全部 9 个 migration；远端 migration history 与本地一致。
- 管理员：Supabase Auth 中已建立并确认店主用户；`public.profiles` 中只有 1 条 profile、1 个 `role = admin`，且与该 Auth 用户 UUID 一致。密码未进入仓库、日志或文档。
- Vercel：已新建并部署 `happy-beans-fudou`，连接 `9OwO6/fu_dou` 的 `main` 分支；旧版 `happy-beans` 项目未修改。
- 试用地址：`https://happy-beans-fudou.vercel.app`；这是使用 Vercel 默认域名的店主试用部署，不代表已完成正式域名、邮件和 Production 上线验收。
- 环境变量：已在 Vercel 的 Production 与 Preview 环境配置 `NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`；没有向浏览器或仓库加入 Supabase secret key。
- 线上 smoke test：
  - `/zh` 可正常打开，Header、Hero、热门分类、新品、推荐、特价、品牌故事、履约说明、FAQ 与联系 CTA 均由云端配置渲染；无真实商品时显示受控空状态。
  - 未登录访问 `/admin` 会跳转至 `/admin/login?reason=session_required`，登录表单可用。
  - 未使用店主密码代登录；店主仍需亲自完成首次登录、退出和真实商品创建验收。
- 当前可用范围：店主可登录后台维护分类、商品、规格、SKU、CAD 价格、库存、图片、上下架/新品/推荐/特价和首页配置。
- 尚未配置：`SUPABASE_SECRET_KEY`、`ORDER_RATE_LIMIT_SECRET` 与 Resend 邮件变量，因此订单请求提交和双邮件通知不属于本次可验收范围；不得把当前试用部署描述为完整上线。
- 回滚路径：Vercel 可回退到此前成功 deployment；数据库变更均来自正式 migration，但涉及真实录入数据时不得通过 reset 回滚。

## 店主试用修正：新建商品首批图片

- 修正日期：2026-07-13（America/Vancouver）。
- 反馈：线上 `/admin/products/new` 原本只允许创建基础草稿，必须进入详情页后才能上传图片，店主在首次录入时会认为新建商品不支持图片。
- 完成内容：
  - 新建商品页新增首批图片选择、浏览器预览、中文替代文字、移除图片、文件类型/大小说明和动态提交状态。
  - 提交后先通过既有管理员 Server Action 创建草稿并取得商品 UUID，再沿用 Phase 5C 的管理员 RLS、受控 Storage 路径、客户端文件校验、服务端对象复核和原子登记流程上传图片。
  - 新建阶段的图片先作为商品通用图；进入详情页后仍可调整顺序、封面、替代文字和规格关联。
  - 图片失败不会回滚或发布已经创建的草稿；页面会进入商品详情并明确提示从“商品图片”区域重新上传。已上传半成品继续使用既有补偿清理。
  - 既有详情页上传与新建页上传共用 `lib/catalog/client-image-upload.ts`，避免两套 Storage 行为漂移。
- 路由：无新增 URL；只增强 `/admin/products/new`，并扩充 `/admin/products/[id]` 的创建结果提示。
- 数据库、API、Storage、环境变量和依赖：无 schema/migration、Route Handler、bucket/policy、环境变量或 package 变化；复用既有 `product-images` private bucket、RLS、Server Action 和 Phase 5C RPC。
- 自动检查：`typecheck`、`lint`、9 个单元测试文件（34/34）和 production build 全部通过；`git diff --check` 通过。
- 线上浏览器验证：
  - 店主已登录状态刷新 `/admin/products/new` 后，页面显示“商品图片”、文件选择控件、20 张/10 MiB 限制、预览说明和动态创建按钮；console 无 warning/error，无 Next.js 错误覆盖层。
  - 手机有效宽度 375 下 `scrollWidth === clientWidth === 375`，图片区域与选择控件可见，无页面级横向溢出。
  - 当前浏览器控制接口不能向原生文件输入注入本地路径，截图接口也在长后台页超时；因此真实 OS 选图、预览、上传、详情页登记和删除仍由店主完成一次人工验收，未伪称已自动验证。
- Git 与部署：实现 commit `c96f7f5` 已推送到 `origin/main` 并由 Vercel 自动部署；新建商品页已确认加载该版本文案和控件。
- 当前 Phase 状态：Phase 5C 的实现仍完整，但严格关闭条件不变；等待店主完成一次真实新建页选图上传和一次详情页删除确认后，才能把 Phase 5C 标记为真正完成。

## Phase 12 英文顾客端与双语内容状态

- 状态：本地实现完成；等待云端 migration、部署和店主双语录入验收后正式上线。
- 实施日期：2026-07-15（America/Vancouver）。
- 精确范围：启用完整英文顾客路径，默认 `/` 跳转 `/en`，公开页面可在 `English / 中文` 间切换；后台操作界面继续固定中文，只增加中英文成对录入。未加入顾客账号、在线支付、多币种、自动翻译或自由页面编辑。
- 完成内容：
  - 启用 `en` 与 `zh` locale；首页、商品列表、分类、集合、搜索/筛选、商品详情、购物车、订单请求、成功/错误/空状态和 Footer 均有英文系统文案。
  - Header 语言切换保留当前路径与 query；根文档和客户端切换后的 `<html lang>` 跟随当前语言。
  - 商品、分类、规格名、规格值、图片替代文字、首页模块和站点设置支持后台同页中英文录入，管理 RPC 在单一事务中保存两种语言。
  - 英文公开查询不回退中文。商品缺少英文商品翻译、任一当前规格名/值英文翻译或任一商品图英文替代文字时，从全部英文入口隐藏；英文分类缺翻译时同样隐藏。
  - 订单请求保存 `request_locale`；提交事务按顾客语言重新读取权威商品数据并保存本地化快照。顾客确认邮件使用提交语言，店主通知和后台继续使用中文并显示顾客语言。
  - 首页、列表、分类、集合和详情生成对应语言 metadata、canonical 与 `hreflang`；sitemap 分语言收录实际可见实体。
- 关键文件：
  - `supabase/migrations/20260715191638_phase_12_english_storefront.sql`
  - `supabase/tests/011_english_storefront.test.sql`
  - `messages/en.json`、`messages/zh.json`、`lib/i18n/**`
  - `lib/catalog/public-data.ts`、`lib/cart/server-validation.ts`、`lib/orders/validation.ts`
  - `components/layout/language-switcher.tsx`、`components/layout/document-language.tsx`
  - `app/[locale]/**`、`components/admin/**`、`components/order-request/**`
  - `docs/ENGLISH_LOCALIZATION_SCOPE.md`
- 新增或变更路由：无新增路由形状；既有 `/[locale]` 全部顾客路由新增 `/en` 实例，`/` 默认目标由 `/zh` 改为 `/en`。后台 URL 不变。
- 数据库：新增 `product_image_translations`、`site_setting_translations` 和受控 RLS/GRANT；`order_requests` 新增受约束的 `request_locale`；新增/扩展双语管理 RPC 与 `submit_order_request_localized`。所有变更来自正式 migration。
- API：无公开 Route Handler；继续使用 Server Action、匿名公开读、管理员 JWT/RLS 和 server-only 订单事务 RPC。
- Storage：无 bucket、文件路径或对象策略变化；同一 private 商品图只新增按 locale 保存的替代文字。
- 环境变量与依赖：无新增；未读取、修改或提交真实 `.env.local`，未新增 npm package。
- 本地验证证据：
  - 从空库 `db:reset` 成功应用全部 migrations 与 seed；英文迁移、RLS、原子双语保存和本地化订单快照由 pgTAP 覆盖。
  - `db:test`：11 个文件、203/203 个 pgTAP 断言通过；`db:lint` 为 `No schema errors found`，`db:advisors` 为 `No issues found`。
  - `typecheck` 与 `lint` 通过；Vitest 9 个文件、36/36 个单元测试通过；Next.js 16.2.10 production build 通过并生成全部既有公开和后台路由；`git diff --check` 通过。
  - 默认 `/` 在真实浏览器进入 `/en`；英语/中文切换保持同一路径并正确更新 `html lang`。
  - 英文商品详情完成规格选择与加入购物车；英文购物车显示本地化商品、规格、SKU 和服务器价格，并可进入英文订单请求。
  - 英文订单表单空提交显示英文服务端校验错误；成功页明确写明未付款、未最终确认。为避免发送外部邮件，没有提交有效真实订单。
  - 桌面 1280×720 和手机 390×844 检查公开页面；手机有效内容宽度与滚动宽度均为 375，没有页面级横向溢出。手机 Chrome 的 Dark Reader 扩展会注入属性并改变截图颜色，此扩展引起的 hydration 提示不属于应用代码。
- 人工验收步骤：
  1. 在本地或 Preview 后台建立一个测试分类和商品，填写全部中英文商品、规格和图片替代文字并发布。
  2. 访问 `/en`，确认该商品出现在首页/列表/分类/搜索并可完成规格选择、购物车和订单请求；切换中文时路径实体与 query 保持不变。
  3. 删除一个英文规格值或英文图片替代文字后保存，确认商品只从英文端隐藏且中文端仍显示；补齐后再次出现。
  4. 在安全测试收件箱提交英文请求，确认顾客邮件为英文、店主邮件与后台为中文、快照内容为英文且两处都写明未付款/未确认。
  5. 在桌面、笔记本和手机检查英文长标题、缺图、售罄、特价、空列表、加载和错误状态。
- 未完成项、风险与有意延后：
  - 本次没有向已连接的云端 Supabase 应用 Phase 12 migration，也没有 push 或触发 Vercel 部署，因此现有试用站仍不是本版本；在部署 migration 前不能把含新查询的应用版本发布到该环境。
  - 未使用店主账号进行真实后台浏览器保存，也未向外部邮箱发送英文测试请求；后台双语界面由类型检查、build、数据库事务测试覆盖，但仍需店主按上述步骤完成一次真实人工验收。
  - 现有中文商品不会自动生成英文。补齐英文前在 `/en` 隐藏是已确认的产品规则，不是数据丢失。
  - 自动翻译、独立英文后台、英文 slug、多币种、在线支付和正式英文品牌专用字体继续延后。
- 当前 Phase 是否真正完成：本地代码与数据库实现完成，公开顾客路径已完成真实浏览器验证；正式上线验收尚未完成，原因是云端 migration/部署、已登录后台双语保存和安全测试邮箱交付仍待执行。
- 下一步启动条件：可以进入“Phase 12 云端激活与验收”，但必须按顺序先备份/应用 Supabase migration，再部署同一 commit，最后完成中英文录入、隐藏规则与双邮件 smoke test；不得先部署应用后补数据库。
- Git 与外部操作：未 commit、未 push、未部署、未改云端数据。需要用户明确授权后才能执行 commit/push、Supabase migration 和 Vercel 部署；无需新增环境变量，但邮件验收仍依赖既有 Resend 测试配置。

## Phase 12 云端开发数据库激活记录

- 激活日期：2026-07-15（America/Vancouver）。
- 根因：本地英文应用代码已经查询 `product_image_translations`，但常规开发服务器连接的云端开发 Supabase 尚未应用 Phase 12 migration，因此 `/en` 在存在公开商品时触发 `imageTranslations` 运行时错误。
- 执行内容：先使用 `supabase db push --linked --dry-run` 确认只包含 `20260715191638_phase_12_english_storefront.sql`，随后将该 migration 应用到已连接的云端开发项目；未包含 seed，未 reset 远端数据库。
- 远端验证：`supabase migration list --linked` 确认本地与远端 11 条 migration 完全一致；远端 `db lint --linked --level warning` 返回 `No schema errors found`。
- Advisors：Phase 12 没有引入新的 advisor 问题。远端仍报告既有 `admin_update_order_request` 受控 `security definer` 提醒，以及 Supabase Auth leaked-password protection 未启用提醒；两者均不属于本次运行时错误。
- 真实浏览器验证：`http://localhost:3000/en` 已完整渲染英文首页，无 Next.js Runtime Error 或应用 console error；语言切换完成 `/en → /zh → /en`，`html lang` 正确为 `en/zh`。仅保留既有 Hero 图片 LCP 开发警告。
- 文件、路由、API、Storage 与环境变量：本次没有修改业务代码、路由、API、Storage 或环境变量；只更新本状态文档并应用已有正式 migration。
- 当前状态：云端开发数据库已具备 Phase 12 schema；仍未 commit、push 或触发 Vercel 部署，现有线上试用站尚未加载这批未提交的英文应用代码。已登录后台双语保存和安全测试邮箱交付仍待人工验收。
- 下一步：先 commit/push 当前 Phase 12 代码，再由 Vercel 部署同一版本，最后完成后台双语录入、英文隐藏规则和双邮件 smoke test；这些操作需要用户另行明确授权。

## 顾客端空状态品牌头像统一

- 调整日期：2026-07-15（America/Vancouver）。
- 用户反馈：英文空列表中的中文“豆”字与页面语言和品牌视觉不协调，应统一使用 Happy Beans 双豆商标头像。
- 完成内容：新增复用型 `BrandEmptyMark`，直接引用权威 `assets/brand/happy-beans-logo-primary.jpg`；商品空列表、公开错误页和 404 页全部改用该组件，并删除旧 `empty-bean` 文字图形样式。
- 视觉边界：未重绘、裁改或生成新 Logo，继续使用用户指定的原始品牌资产；图片作为装饰元素使用空 alt，不增加重复朗读。
- 数据库、API、Storage、环境变量和路由：无变化。
- 自动检查：`typecheck`、`lint`、Vitest 9 个文件 36/36 与 production build 全部通过；代码搜索确认旧 `empty-bean` 和硬编码空状态“豆”已清除。
- 真实浏览器验证：英文 `/en/collections/new` 桌面空列表、中文 `/zh/collections/featured` 390×844 手机空列表和英文不存在商品 404 均显示同一双豆头像；页面无框架错误覆盖层或应用 console error。

## 后台目录管理视觉与折叠布局优化

- 调整日期：2026-07-15（America/Vancouver）。
- 对应范围：在现有 Phase 5A/5B/5C 与 Phase 12 后台能力上进行界面收口，不改变商品、分类、规格、图片或运营状态的数据模型与业务规则。
- 完成内容：
  - 后台 Shell 改为温暖白色画布、品牌页头、图标化侧栏、浅黄色选中态和统一按钮/表单层级，并继续使用权威 `assets/brand/happy-beans-logo-primary.jpg`。
  - 分类新建与编辑表单按业务逻辑调整为三组双列：中英文名称、中英文描述、网址标识与排序值；公开开关独占一行。现有分类以紧凑摘要行呈现，点击后展开编辑。
  - 商品详情将“基础内容”“SEO”“商品分类”“商品图片”“规格、价格和库存”“运营状态”统一改为带箭头的原生折叠面板，默认全部收起；仅在基础/SEO 表单区展开时显示对应保存操作，减少无效页面长度。
  - 修复 390px 手机宽度下横向导航最小内容宽度导致的页面级溢出。
- 修改文件：`app/admin/(protected)/layout.tsx`、`app/admin/(protected)/categories/page.tsx`、`app/admin/(protected)/products/page.tsx`、`app/admin/(protected)/products/[id]/page.tsx`、`components/admin/admin-disclosure.tsx`、`components/admin/admin-icons.tsx`、`components/admin/admin-navigation.tsx`、`components/admin/category-manager.tsx`、`components/admin/product-form.tsx`、`components/admin/product-category-selector.tsx`、`components/admin/submit-button.tsx`、`app/globals.css`、`docs/DESIGN_SYSTEM.md`、`docs/ADMIN_GUIDE.md`。
- 路由与功能：无新增 URL；增强 `/admin/categories`、`/admin/products` 与 `/admin/products/[id]` 的布局、视觉和折叠交互。
- 数据库、API、Storage、环境变量与依赖：无变化；没有 migration、Route Handler、bucket/policy、环境变量或 package 变更。
- 自动检查：`npm.cmd run typecheck`、`npm.cmd run lint`、Vitest 9 个文件 36/36、Next.js 16.2.10 production build 与 `git diff --check` 全部通过。
- 真实线上浏览器验证：
  - `/admin/categories` 在 1440×900 与 1024×768 验证字段顺序、说明卡、紧凑分类摘要和展开编辑；1024 有效内容宽度 `1009`，`scrollWidth === clientWidth`。
  - `/admin/products/[id]` 在 1440×900 与 1024×768 验证 6 个面板默认关闭；打开“基础内容”后网址标识等字段和保存操作可见，全部关闭时保存操作隐藏。
  - 390×844 验证分类页与商品详情页，页面 `scrollWidth === clientWidth === 390`，无页面级横向溢出；商品 6 个面板默认关闭。
  - 线上页面开发日志为空，无应用 console error 或框架错误覆盖层。
- 人工验收步骤：登录后台后进入“分类管理”，确认描述与网址标识/排序值的行序并展开现有分类；进入任一商品，逐一展开基础内容、SEO、分类、图片、规格库存和运营状态，确认内容与保存行为保持不变；再以手机宽度检查横向导航与折叠面板。
- 未完成项、风险与有意延后：本次没有改动数据或业务流程；现有各 Phase 的云端数据、邮件及店主真实录入验收状态保持不变。视觉继续以本次已认可后台概念为基准，未扩展为自由页面编辑器。
- 当前 Phase 是否真正完成：本次独立后台 UI 优化已完成并在线验证；它不改变既有 Phase 完成状态。
- 下一 Phase 是否具备启动条件：不受本次 UI 调整阻塞，仍按 `HAPPY_BEANS完整开发计划.md` 与上方 Phase 状态执行。
- Git 与外部操作：实现提交已推送至 `origin/main`，Vercel 自动部署后的线上版本已完成上述浏览器复验；无需用户新增账号、环境变量或手动部署。

## 顾客端真实信息与图片交互优化

- 调整日期：2026-07-15（America/Vancouver）。
- 对应范围：在已完成的 Phase 6、9 与 Phase 12 顾客端基础上补充店铺真实信息和图片交互；未增加支付、顾客账号、配送计算、自由页面编辑或其他后续功能。
- 完成内容：
  - 使用正式 migration 将品牌故事更新为店主确认的英文文案和中文译文；前台按 3 个实际段落渲染，同时保留 `/admin/homepage` 后续编辑能力。
  - Hero 真实商品图增加有机卵形遮罩、Intersection Observer 单次滚入淡入/上移动效和内部图片 `1.05` 悬停缩放，并尊重 `prefers-reduced-motion`。
  - 履约区接入店主提供的 `delivery-service.jpg`。为避免丢失配送金额与范围信息，桌面使用完整竖版海报双栏，手机改为正文后完整海报，而非强制横向裁切。
  - Footer 接入真实门店照片、地址 `4000 Number 3 Rd #2185, Richmond, BC V6X 0J8`、指定 Google Maps 链接、微信二维码与 Instagram 二维码/账号链接。
  - 商品详情把“新标签页查看原图”改为当前页模态灯箱；支持打开动画、背景/按钮/Escape 关闭，多图时自动提供方向键、前后按钮和缩略图切换。
- 修改文件：`app/[locale]/page.tsx`、`app/globals.css`、`components/layout/store-footer.tsx`、`components/product/product-experience.tsx`、`components/ui/reveal-media.tsx`、`messages/en.json`、`messages/zh.json`、`assets/image/delivery-service.jpg`、`assets/image/map_back.jpg`、`assets/image/wechat-qr.png`、`assets/image/instagram-qr.png`、`supabase/migrations/20260715214426_refresh_brand_story_content.sql`、`docs/DESIGN_SYSTEM.md`、`docs/PROJECT_STATUS.md`。
- 路由与组件：无新增 URL；增强 `/en`、`/zh` 首页、所有公开页 Footer 和 `/{locale}/products/[slug]` 商品画廊；新增内部复用组件 `RevealMedia`。
- 数据库：新增正式 migration `20260715214426_refresh_brand_story_content.sql`，只更新 `brand_story` 的 `en/zh` translation 文案；无表、函数、RLS、Storage policy 或 API 变化。migration 已从空库重建并应用到已连接云端开发 Supabase，远端/本地 migration history 一致。
- API、Storage、环境变量与依赖：无变化；未新增 Route Handler、bucket、对象策略、环境变量或 npm package，也未读取或提交真实 secret。
- 自动检查：本地 `db:reset` 成功；`db:test` 11 个文件、203/203 通过；`typecheck`、`lint`、Vitest 9 个文件 36/36、production build 与 `git diff --check` 均通过；远端 `db lint --linked --level warning` 为 `No schema errors found`。
- 真实浏览器验证：
  - 英文桌面 1509×1272 验证 Hero 进入视口后 `opacity: 1`、`translateY: 0`，有机图片遮罩、三段英文故事、完整竖版配送海报、门店照片/地址/地图与二维码布局均正常。
  - 中文 390×844 验证正式中文标题、3 个故事段落、配送海报和 Footer 二维码；有效内容宽度与滚动宽度均为 375，无页面级横向溢出。
  - 商品详情点击主图后，同一页面原生 `dialog` 正确打开；灯箱动画名为 `lightbox-panel-in`，图片 alt 正确，关闭按钮与 Escape 均可关闭。
  - 使用干净浏览器标签重新加载 `/en`，页面有有效标题和内容、0 张缺失 alt 的图片、0 条 console warning/error。开发环境存在的 Next.js Dev Tools portal 不是错误覆盖层。
- 人工验收步骤：访问 `/en` 和 `/zh`，滚动检查品牌故事与配送海报；在 Footer 点击地址确认 Google Maps 目标并用手机扫描两张二维码；进入有多张已登记图片的商品，点击主图后依次验证缩略图、左右按钮、方向键和 Escape。
- 未完成项、风险与有意延后：当前云端公开测试商品只有 1 张图，因此真实浏览器已验证单图灯箱打开/关闭和动画，但没有为测试而修改店主商品数据；多图切换逻辑已实现并需在店主下次录入多图商品时完成一次数据驱动人工验收。配送海报本身含中文文字，英文页面通过英文 alt 和英文图注补充可访问说明，未修改用户提供的原图。
- 当前 Phase 是否真正完成：本次独立顾客端优化的代码、数据库内容更新、桌面/手机布局和单图灯箱主路径已完成；多图真实数据路径保留上述一次人工验收项，不改变既有 Phase 5C/8/12 的独立验收状态。
- 下一 Phase 是否具备启动条件：不受本次优化阻塞，仍按主计划与上方各 Phase 状态执行。
- Git 与外部操作：云端开发 Supabase 已应用本次内容 migration；代码尚待本任务最后 commit/push，随后由现有 Vercel Git 集成自动部署。无需用户新增环境变量或外部账号配置。

## 顾客端 Plan B 双语展示字体

- 调整日期：2026-07-15（America/Vancouver）。
- 对应范围：只优化英文与中文顾客展示界面的品牌标题字体；后台管理系统、正文、商品信息和功能控件保持现状。
- 甲方决定：采用字体对比稿 Plan B。英文展示标题使用 `Fredoka`，中文展示标题使用 `ZCOOL KuaiLe / 站酷快乐体`。
- 实现内容：通过 Next.js `next/font` 构建时自托管字体，并将字体变量仅挂载到 `/{locale}` 顾客端布局。展示字体应用于 Header 品牌名、Hero、首页模块、品牌故事、目录页、商品详情、购物车、订单请求和成功/错误页的主要标题；价格、规格、库存、按钮、导航、表单、长正文和后台继续使用既有无衬线字体。
- 修改文件：`app/[locale]/layout.tsx`、`app/globals.css`、`docs/DESIGN_SYSTEM.md`、`docs/PROJECT_STATUS.md`。
- 路由、组件和功能：无新增 URL 或组件；只增强既有顾客端双语标题字体表现。
- 数据库、API、Storage、环境变量与依赖：无变化；没有 migration、Route Handler、bucket/policy、环境变量或 npm package 变更。
- 自动检查：`npm.cmd run typecheck`、`npm.cmd run lint`、Vitest 9 个文件 36/36、Next.js 16.2.10 production build 与 `git diff --check` 全部通过；build 成功打包两款自托管字体并生成全部既有路由。
- 真实浏览器验证：
  - 英文 `/en` 桌面端 Header 品牌名与 Hero/模块标题的计算字体为 `Fredoka`；Hero 正文继续使用既有系统无衬线字体。页面标题、内容与真实商品图正常，console 无相关 warning/error。
  - 通过真实语言切换进入中文 `/zh`，`html lang` 与 `data-locale` 均为 `zh`；Header 品牌名与 Hero/模块标题的计算字体为 `ZCOOL KuaiLe`、字重为原生 `400`，正文仍使用既有系统无衬线字体。
  - 中文 390×844 手机视口的有效内容宽度与滚动宽度均为 `375`，Hero 标题完整换行，无裁切、重叠或页面级横向溢出。
  - `/admin/login` 在 390px 下不存在公开端 `.store-shell`，后台标题仍计算为 `PingFang SC / Microsoft YaHei` 系统栈，证明字体范围隔离生效；console 无相关 warning/error。
  - 截图保存在当前 Codex visualizations 目录：`plan-b-en-desktop.png`、`plan-b-zh-desktop.png`、`plan-b-zh-mobile.png`、`plan-b-admin-mobile.png`。
- 未完成项、风险与有意延后：本次字体仅覆盖已批准的主要展示标题，不扩展到商品卡、功能控件或后台；若甲方后续要求调整字距、字号或更换字体，应作为新的视觉评审，不在本次范围内提前处理。
- 当前任务是否真正完成：是。Plan B 的中英文公开端字体、正文隔离、后台隔离、桌面/手机渲染和 production build 均已验证。
- Git 与外部操作：按用户明确要求，本次只提交上述 4 个字体相关文件并 push；工作区现有未跟踪商品/分类图片不纳入提交。

## 快速上新与新品展示墙试验

- 调整日期：2026-07-18（America/Vancouver）。
- 对应范围：在现有正式商品体系旁新增独立轻量展示通道，解决少量、多款、快速售出的商品无法承受完整 SKU/规格/库存录入的问题；正式商品、购物车和订单请求保持不变。
- 完成内容：
  - 新增手机优先批量选图流程：每批最多 30 张，默认一图一商品，支持勾选合并多图、拆分、批量标签，以及选填中英文名称、说明和 CAD 价格。
  - 新增展示管理墙：搜索、状态筛选、批量恢复/售完/归档、单品编辑和轻量标签创建；每件商品自动生成不可顺序枚举的 `HB-` 短编号。
  - 新增中英文 `/[locale]/new-arrivals`：标签筛选、可选内容回退、询价提示、售完章、多图原生灯箱、方向键/缩略图与复制编号；Header 和 sitemap 已接入。
  - 快速展示与正式 `products / variants / inventory / cart / order_requests` 完全隔离，不伪造库存，也不把“请私信确认”包装为可下单状态。
- 主要修改文件：`supabase/migrations/20260718072835_quick_showcase_pilot.sql`、`supabase/tests/012_quick_showcase_pilot.test.sql`、`app/admin/(protected)/quick-listings/**`、`app/[locale]/new-arrivals/page.tsx`、`components/admin/quick-showcase-uploader.tsx`、`components/admin/showcase-manager.tsx`、`components/showcase/showcase-gallery.tsx`、`lib/showcase/**`、`messages/zh.json`、`messages/en.json`、`app/globals.css` 及相关导航/文档文件。
- 数据库与 Storage：新增 8 张独立展示表、2 个受约束 enum、4 个 `security invoker` 管理 RPC、RLS/显式 GRANT、审计事件和 private `showcase-images` bucket。bucket 限制 JPEG/PNG/WebP、10 MiB，并使用管理员受控路径；公开读取只通过已登记对象的短时签名 URL。
- API、环境变量与依赖：无公开 Route Handler；复用 Server Action、现有管理员会话和 Supabase publishable 配置。无新增环境变量、secret 或 npm 依赖，未读取/修改 `.env.local`。
- 自动检查：本地 `db:reset` 成功；`db:test` 12 个文件、228/228 通过；`db:lint` 为 `No schema errors found`；`db:advisors` 为 `No issues found`；Vitest 10 个文件、40/40、`lint`、`typecheck`、Next.js 16.2.10 production build 全部通过。
- 真实浏览器验证：
  - 使用本地临时管理员完成三图选择、两图合并、批量水杯标签、可选双语名称/CAD 价格和发布；管理墙正确显示一件双图商品与一件无文字/无价格商品，console 无 warning/error。
  - 中文新品墙显示 2 件商品、通用文案与询价提示；水杯筛选保留 2 件，礼物筛选显示受控空状态。双图灯箱可打开、前后切换、缩略图选择和复制编号。
  - 英文新品墙只显示英文标题/标签或英文通用回退，没有把中文标题泄漏到英文端。
  - 后台一键售完后，中文前台同一商品立即显示两处可访问的“已售完”状态和视觉售完章。
  - 1440×900、1024×768、390×844 均验证 2 张卡片，三档均 `scrollWidth === clientWidth`；390px 桌面导航正确收起，无页面级横向溢出，console 只有 Next.js 开发/HMR 信息。
- 人工验收步骤：店主用手机进入“快速上新”，选择一批真实新品照片，合并同一商品的不同角度并批量加标签；故意留空一件名称/价格后发布；分别检查中英文新品墙、标签、灯箱和编号；卖出后点“一键售完”，最后决定保留售完展示或归档隐藏。
- 云端激活与生产部署：
  - `supabase db push --linked --dry-run` 确认只包含 `20260718072835_quick_showcase_pilot.sql`，随后已应用到已连接云端项目；远端 migration history 与本地 13 条记录完全一致，远端 `db lint --linked --level warning` 为 `No schema errors found`。
  - 远端 advisors 没有出现本次 migration 新增问题；仍保留既有 `admin_update_order_request` 受控 `security definer` 提醒和 Auth leaked-password protection 未启用提醒。
  - 功能实现以 commit `626d06c` 推送到 `origin/main`，Vercel Git 集成部署 `dpl_7kqp5ANNm6LvnPjaAs3ipWx3xzBN` 已达到 Production Ready，并绑定 `https://happy-beans-fudou.vercel.app`。
  - 生产浏览器确认中英文新品墙标题、6 个标签与空状态正常；已登录管理员会话可打开 `/admin/quick-listings`，管理入口和空管理墙正常。1440×900 与 390×844 均 `scrollWidth === clientWidth`，console 无 warning/error；Vercel 最近一小时无 error 或 HTTP 500 日志。
- 未完成项、风险与有意延后：尚未向生产库上传测试商品，也未使用真实手机相册完成首批上新，以避免为技术验收污染店主数据；公开列表当前一次读取最多 200 件，若后续长期积累应增加分页/“加载更多”和批次归档习惯。朋友圈/小红书自动同步、AI 自动识图写文案、拖拽重排、从展示商品一键转正式商品继续延后。
- 当前任务是否真正完成：代码、数据库 migration、Git push、Vercel Production 部署、公开页面与后台入口 smoke test 均完成；生产环境已经可用。首批真实图片上传、合并、售完与归档仍需由用户或店主在手机上进行数据型人工验收。
- 下一阶段启动条件：可以直接进入店主试用和反馈迭代；不再需要数据库、Git 或 Vercel 激活操作。
- Git 与外部操作：功能 commit `626d06c` 已 push 并部署；本次状态更新将以独立文档 commit 推送。无需新增环境变量或外部账号。工作区既有未跟踪分类图片和 `home_about_img.png` 仍未纳入提交。

## 快速展示墙桌面灯箱居中修复

- 修复日期：2026-07-18（America/Vancouver）。
- 用户反馈：真实快速上架商品的灯箱在桌面端贴住视口左上角，没有居中显示。
- 原因与修复：全局样式将原生 `dialog` 的默认外边距归零后，`.showcase-dialog` 没有重新声明居中规则；现已明确使用固定定位、四边 `inset: 0` 与自动外边距，使桌面灯箱相对可用视口水平、垂直居中，同时保留 767px 以下全屏灯箱。
- 修改文件：`app/globals.css`、`docs/PROJECT_STATUS.md`。
- 数据库、API、Storage、环境变量与依赖：无变化；未新增 migration、Route Handler、bucket/policy、环境变量或 npm package。
- 自动检查：`lint`、`typecheck`、Vitest 10 个文件 40/40、Next.js 16.2.10 production build 与 `git diff --check` 均通过。
- 真实浏览器验证：修复前在 Production 1440×900 实测灯箱左上角为 `(0, 0)`，水平/垂直偏离中心 `-180px / -63px`；修复后本地真实云端商品在 1440×900 和 1024×768 均相对可用视口居中，390×844 仍为完整全屏灯箱，关闭按钮可用且页面无横向溢出。浏览器仅记录由 Dark Reader 扩展注入属性引起的开发环境 hydration 提示，不是本次代码错误。
- Git 与 Production 部署：修复 commit `cd2f291` 已推送至 `origin/main`；Vercel Git 集成部署 `dpl_H9NMu4DTPjgKiu12z6FvQdej8AgK` 已达到 Production Ready，并绑定 `https://happy-beans-fudou.vercel.app`。
- 线上复验：Production 1440×900 实测灯箱水平/垂直中心偏差均为 `0`，390×844 继续全屏且关闭交互正常；console 无 warning/error，Vercel 最近一小时无 runtime error 或 HTTP 5xx 日志。
- 当前任务状态：桌面灯箱居中修复、Git push、Vercel Production 部署与线上真实商品复验均已完成；无需数据库或外部账号操作。

## 快速展示商品图片编辑

- 调整日期：2026-07-18（America/Vancouver）。
- 用户反馈：快速发布后只能修改名称、说明、价格和标签，多图商品无法继续增图、减图或替换图片。
- 完成内容：管理卡片现支持一次追加多图、逐张原位替换、移除图片，以及将任意图片设为封面；明确显示当前封面、图片序号、剩余可添加数量和操作结果。每件商品继续限制 1–10 张图，不能删除最后一张。
- 数据库与 Storage：新增 migration `20260719061347_quick_showcase_image_management.sql`，提供 6 个 `security invoker` 图片管理/补偿 RPC；新增与替换会复核当前商品目录内真实 Storage 对象，数据库失败时清理新文件，旧文件删除失败时恢复原图片资料和顺序。正式商品、库存、购物车和订单请求均无变化。
- API、环境变量与依赖：无新增公开 Route Handler、环境变量、secret 或 npm 依赖；复用现有管理员 Server Action、private `showcase-images` bucket 和会话。
- 自动检查：`db:reset` 成功；`db:test` 12 个文件 244/244 通过；本地 `db:lint` 无 schema error、`db:advisors` 无问题；完整 Vitest 10 个文件 42/42、`typecheck`、`lint`、Next.js 16.2.10 production build 与 `git diff --check` 全部通过。
- 云端与 Production：`supabase db push --linked --dry-run` 确认只包含本次 migration，随后已成功应用；本地/远端 14 条 migration history 完全一致，远端 schema lint 无错误。本次 6 个图片 RPC 未新增 advisor；只保留既有订单 RPC 和 Auth leaked-password protection 两项提醒。功能 commit `775acfb` 已推送至 `origin/main`，Vercel Git 部署 `dpl_FqXR69H1XmqGPjEtkCJmT7YNDEe8` 已达到 Production Ready 并绑定正式域名。
- 真实浏览器：使用 Production 已登录店主会话打开 3 张图和 1 张图的真实展示商品；展开编辑器后可见封面、序号、剩余数量、追加、替换、设为封面和移除控件，单图商品的“至少保留 1 张”按钮正确禁用。1440×900、1024×768 与 390×844 均无页面级横向溢出，移动端图片与按钮保持单列可读，console 无 warning/error；公开中文新品墙仍显示 3 件真实商品。Vercel 最近一小时无 runtime error 或 HTTP 5xx。
- 人工验收步骤：打开任意多图快速展示商品的编辑区，依次追加两张图、将后一张设为封面、替换中间图片、删除一张；刷新管理墙和中英文新品墙，确认封面、灯箱顺序和图片总数一致，并确认最后一张不能删除。
- 未完成项与风险：为避免改变店主现有商品顺序或短暂污染线上展示，本次线上验收没有实际提交增删替换；这些真实文件操作已由本地 Storage/RPC 补偿路径和 41 个数据库断言覆盖，仍建议店主按上述步骤完成一次生产数据型人工验收。Chrome 自动化扩展未开启本地文件 URL 权限，因此自动文件选择未执行。拖拽自由排序、图片裁剪和自动压缩继续延后。
- 当前任务状态：代码、数据库 migration、Git push、Vercel Production 部署、三档响应式和线上真实商品编辑器 smoke test 均完成；Production 已可使用。店主实际选择文件并完成一次增删替换属于最后的数据型人工验收，不阻塞功能上线。
- 下一阶段启动条件：图片编辑反馈迭代可以直接开始；无需新增环境变量、外部账号或依赖。
- Git 与外部操作：功能 commit `775acfb` 已推送；本次最终状态记录将以独立文档 commit 推送。工作区既有未跟踪分类图片与 `home_about_img.png` 保持未提交。
