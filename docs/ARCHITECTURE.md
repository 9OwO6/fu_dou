# Happy Beans 工程架构基线

> 状态：Phase 1 基线；后续 Phase 只能在其明确范围内扩展。

## 运行与工具链

- Node.js：24 LTS 主线；`package.json` 允许 24.x，`.nvmrc` 跟随 24 LTS。
- Web：Next.js App Router、React、TypeScript、Tailwind CSS。
- 质量检查：ESLint、TypeScript、Vitest、Next.js production build。
- 依赖版本使用精确值，`package-lock.json` 作为可复现安装依据。
- Next.js 16.2.10 上游固定的 PostCSS 8.4.31 存在公开的 moderate 告警；npm override 仅将该传递依赖提升至 API 兼容的 8.5.18，并由完整质量检查验证。

### 版本核对记录（2026-07-13）

- Next.js 官方安装文档确认 App Router 脚手架与最低 Node.js 要求；npm stable 为 16.2.10。
- React 官方版本页与 npm stable 核对为 React / React DOM 19.2.7。
- Tailwind CSS 官方 Next.js 指南确认使用 `@tailwindcss/postcss`；npm stable 为 4.3.2。
- Vitest 官方指南及 package engines 核对为 4.1.10，支持 Node.js 24。
- Node.js 官方发布索引显示 24 为当前 LTS 主线；项目允许 24.x，避免把本机补丁版本写死。

官方核对入口：

- <https://nextjs.org/docs/app/getting-started/installation>
- <https://react.dev/versions>
- <https://tailwindcss.com/docs/installation/framework-guides/nextjs>
- <https://vitest.dev/guide/>
- <https://nodejs.org/dist/index.json>

## 路由

- `/` 仅负责重定向至默认 locale `/zh`。
- `/[locale]` 是公开网站入口；Phase 1 仅启用 `zh`，未知 locale 返回 404。
- `/admin/login` 不带 locale 前缀，第一版后台固定中文。
- Phase 1 页面都是明确标注的工程骨架，不代表正式视觉设计。

## 国际化

- `lib/i18n/config.ts` 是 locale 白名单和默认 locale 的唯一来源。
- `messages/zh.json` 保存当前系统文案。
- 后续新增英文时，必须先补字典和内容，再显式加入 locale 白名单；不能提前公开空英文页面。

## 环境变量

- `.env.example` 只提供变量名和用途分组，不保存真实值。
- `lib/env/schema.ts` 提供按功能验证所需变量的公共入口；错误只显示缺少的变量名，不显示任何已配置值。
- Phase 1 不连接 Supabase 或邮件服务，因此 build 不要求真实环境变量。后续功能在首次访问对应服务时调用校验。

## 有意延后

- Supabase 本地项目、migration、数据表、RLS 和 Storage：Phase 3。
- 管理员认证与后台框架：Phase 4。
- 正式视觉、商品、购物车、订单请求与邮件：按主计划后续 Phase 执行。

## Phase 3 数据层架构

- Supabase CLI 精确锁定为 `2.109.1`，本地配置由 `supabase init` 生成；Postgres major version 为 17。
- schema 只通过 `supabase/migrations/20260713075314_phase_3_initial_schema.sql` 管理，seed 独立放在 `supabase/seed.sql`。
- 所有暴露在 `public` schema 的表启用 RLS。`anon` 与 `authenticated` 权限显式授予，不依赖新表自动暴露的旧行为。
- 管理员来源为 `auth.users` 对应的 `profiles` 行；`private.is_admin()` 是唯一数据库判断入口，不读取 `user_metadata`。该函数位于未暴露 schema、固定空 `search_path`，仅向 `authenticated` 授予执行权。
- 灵活规格保持 option/value/variant 规范化关系，事务结束时由约束触发器验证完整组合与重复组合。
- 订单请求与 item 快照在事务结束时验证至少一个 item 和小计一致；Phase 8 必须另行实现受控服务端写入事务。
- 商品图使用 private `product-images` bucket。公开读取依赖已发布商品的数据库记录；写入只允许管理员，并限制到受控商品路径、JPEG/PNG/WebP 和 10 MiB。
- Auth 本地配置关闭公众 signup；Phase 4 才实现受控首名管理员与登录流程。
- Docker Desktop 与 WSL 2 已可用；schema 已通过本地从零 reset、50 个 pgTAP 断言、数据库 lint 和 Supabase advisors。公开/管理员 SELECT 策略按角色合并，管理员写入策略按操作拆分，当前无未处理的安全或性能 advisor 项。

### Phase 3 官方核对记录（2026-07-13）

- Supabase 官方本地开发文档要求 CLI 配合 Docker-compatible runtime；本仓库使用 npm 开发依赖方式安装 CLI。
- 官方 migration 流程确认使用 `supabase migration new` 创建文件，reset 后 migration 先于 seed 执行。
- 官方 RLS 文档确认 `UPDATE` 同时需要可见 SELECT 行、`USING` 与 `WITH CHECK`，并明确禁止使用可由用户修改的 `user_metadata` 做授权。
- 官方 Storage 文档确认 private bucket 的读取也经过 RLS，upsert 需要 SELECT/INSERT/UPDATE，文件大小与 MIME 应在 bucket 层限制。
- 2026-04-28 breaking change 后，新表不再自动获得 Data API 暴露权限，因此 migration 显式使用最小 `GRANT`。

核对入口：

- <https://supabase.com/docs/guides/local-development/cli/getting-started>
- <https://supabase.com/docs/guides/local-development/overview>
- <https://supabase.com/docs/guides/database/postgres/row-level-security>
- <https://supabase.com/docs/guides/storage/security/access-control>
- <https://supabase.com/docs/guides/local-development/testing/overview>
- <https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically>

## Phase 4 管理员认证架构

- 依赖精确锁定为 `@supabase/ssr@0.12.1` 与 `@supabase/supabase-js@2.110.3`，使用 publishable key 和 HttpOnly Cookie 会话；应用运行时不需要 secret/service role key。
- 根目录 `proxy.ts` 只对 `/admin/:path*` 刷新 Supabase Auth Cookie。它不是授权边界；`app/admin/(protected)/layout.tsx` 在 Server Component 中调用 `requireAdmin()`。
- `requireAdmin()` 先用 `auth.getClaims()` 验证访问令牌，再以当前用户 JWT 查询 `profiles`。只有 RLS 允许读到 `role = admin` 的用户才会获得 `AdminContext`。
- 所有管理 Server Action 必须像退出动作一样在函数内部再次调用 `requireAdmin()`；页面守卫不能替代操作层复核，后续 Phase 也不得从客户端传入或缓存管理员结论。
- 登录使用 `signInWithPassword()`；认证成功但没有管理员 profile 时立即清除本地会话，并返回不区分具体失败原因的后台登录错误。没有注册 action、注册页面或公众账号入口。
- 本地 Auth 保持 `[auth].enable_signup = false` 与匿名登录关闭；`[auth.email].enable_signup = true` 仅用于启用已有用户的邮箱密码 provider。真实调用 `signUp()` 已验证返回 `signup_disabled`。
- `admin_audit_logs` 是仅追加审计基础。管理员只可为自己的 `auth.uid()` 插入，不能更新或删除；游客和普通 Auth 用户不可读写。
- 管理员 Shell 当前只有 `/admin` 概览和禁用的后续阶段导航说明，不包含 Phase 5 商品、库存、图片或订单操作。

### Phase 4 官方核对记录（2026-07-13）

- Supabase SSR 官方指南要求浏览器/服务器 client 分离，并由 Next.js Proxy 刷新 Cookie；受保护数据应使用 `getClaims()`，不能信任未验证的 `getSession()` 用户对象。
- Supabase Auth 官方参考确认邮箱密码登录使用 `signInWithPassword()`，退出可用 `signOut({ scope: "local" })` 清理当前会话。
- Supabase CLI config 参考区分全局 signup 开关与 Email provider 开关；本地验证确认全局关闭 signup 时，Email provider 仍可服务已有账号。

核对入口：

- <https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs>
- <https://supabase.com/docs/reference/javascript/auth-signinwithpassword>
- <https://supabase.com/docs/guides/auth/signout>
- <https://supabase.com/docs/guides/local-development/cli/config>

## Phase 5A 商品与分类后台架构

- 目录 `lib/catalog/` 集中保存后台目录数据读取与共享表单校验；页面组件不直接散落权限或数据库规则。
- 商品与分类列表由受保护 Server Components 使用当前管理员 cookie/JWT 查询；没有 service-role 客户端或浏览器端管理写入。
- 每个管理 Server Action 都重新执行 `requireAdmin()`，再调用 `security invoker` RPC；函数自身不绕过 RLS，并显式撤销 `public`/`anon` 执行权。
- `admin_create_product` / `admin_update_product` 和分类对应函数在单一事务内保存基础记录、`zh` translation 与审计记录，避免多请求造成半成品。
- `admin_duplicate_product` 只复制基础商品与 translation，重置为草稿，并明确不复制 Phase 5B/5C 的规格、库存或图片。
- `admin_set_product_status` 是发布、下架和归档的唯一 Phase 5A 数据入口；首次发布写入 `published_at`，下架依靠 `status = draft` 立即退出公开 RLS 查询。
- `admin_delete_product` 提供后续补充的受控永久删除：仅管理员可删除草稿或归档且未被订单引用的商品。数据库事务先清理所有级联数据、首页引用并写审计，再把图片路径返回给 Server Action 通过 Storage API 删除 private 对象；已发布商品必须先下架。若 Storage 清理失败，商品不会重新出现，后台会给出明确警告并可依据审计记录清理不可公开访问的残留对象。
- 后台表单以原生 HTML 约束提供客户端即时校验，同时使用同一服务端 parser 做权威长度、slug 和排序检查；数据库约束与 RLS 仍是最终边界。
- 路由段提供 loading/error/not-found/empty 状态；宽表只在自身容器滚动，后台 `main` 设置 `min-width: 0` 防止小屏页面整体溢出。

## Phase 5B 规格、价格与库存后台架构

- 商品详情页继续由受保护 Server Component 并行读取基础商品与规格配置；客户端只接收当前商品的 option、value、variant 和关联 ID，不接收 secret 或 service-role key。
- `VariantEditor` 负责编辑任意中文规格和值、生成笛卡尔组合、保留相同组合已有字段、禁用不销售组合，以及逐行/批量修改 SKU、CAD 价格、原价和库存。
- `lib/catalog/variant-validation.ts` 是 Server Action 的共享权威输入校验层：验证 UUID、名称和值唯一性、组合完整性、重复组合、大小写不敏感 SKU、金额精度、原价关系和非负整数库存。
- 每次 mutation 先执行 `requireAdmin()`，再调用 `security invoker` 的 `admin_save_product_variants`；RPC 在单个数据库事务内同步完整快照、执行 deferred 组合约束并追加审计记录。
- 无规格商品不创建假 option，而是使用一个 `optionValueIds = []` 的默认 variant；禁用组合保留其 SKU、价格和库存数据。
- Phase 5B 不读取或写入图片、特价起止时间、推荐/新品状态和公开商品页面，保持 Phase 5C/6 边界。

## Phase 5C 图片与运营状态后台架构

- `ImageManager` 在浏览器中完成多选预览和 private Storage 直传；浏览器只持有现有 public Supabase 配置与当前管理员会话，不接触 secret/service-role key。
- 每个图片 mutation 都由 Server Action 再次执行 `requireAdmin()`。直传后的登记动作会读取真实 Storage 对象元数据，校验商品路径、UUID 文件名、扩展名、MIME 和大小，再调用 security-invoker RPC 原子写入图片记录和审计事件。
- 上传失败采用 Storage 撤销；删除采用数据库先删、Storage 后删，并在 Storage 失败时调用管理员专属恢复 RPC 补偿，避免静默产生数据库与对象不一致。
- 图片排序数组由数据库函数验证必须精确覆盖该商品现有图片；第一个 sort order 为封面。variant 关联通过复合关系校验为同商品组合。
- `admin_save_product_operations` 原子保存 `is_featured` 与 `new_from`；扩展后的 `admin_save_product_variants` 在既有完整组合事务中一并保存 `sale_starts_at`/`sale_ends_at`。
- 商品详情 Server Component 并行读取基础内容、规格和签名图片预览 URL，减少串行等待；公开商品 UI 仍属于 Phase 6。

## Phase 6 公开商品浏览架构

- `/[locale]` 公开路由继续只启用 `zh`；Header、Footer、系统状态和筛选文案来自 locale 字典，商品与分类内容来自 translation 表，为未来 `en` 保留数据与路由边界但不提前发布英文页面。
- `lib/catalog/public-data.ts` 是公开目录只读入口。Server Components 使用 publishable key 与 anon RLS 查询已发布商品、可见分类、启用规格和图片元数据；private `product-images` 只通过短时签名 URL 展示，不开放 bucket 公共读取。
- 商品与分类通过 `product_categories` 多对多连接。匿名策略必须同时满足商品已发布和分类可见；管理员保存分类时由受保护 Server Action 再次 `requireAdmin()`，调用 `security invoker` RPC 并继续受 RLS 约束。
- 列表页把搜索、分类、库存、特价和排序编码到 URL query，支持可分享与服务端渲染；分类和集合页复用同一商品卡与只读查询模型，不引入平行数据路径。
- 商品详情的规格选择仅在浏览器维护当前选择；价格、原价、库存和启用状态均来自服务器提供的有效 variant 快照。本阶段没有购物车写入、订单请求或金额提交入口。
- 首页、列表、分类、集合和详情均生成中文 metadata；`sitemap.ts` 只收录当前可公开读取的商品与分类，`robots.ts` 允许公开页面并禁止 `/admin`。
- 公开页面提供 loading、error、not-found、缺图、空列表、售罄和无有效组合状态；响应式布局在 1455、1024 内容宽度和 390 手机宽度的真实浏览器中验证。

## Phase 7 游客购物车架构

- `CartProvider` 只在当前 locale 公开 Shell 内维护游客购物车，localStorage key 为 `happy-beans-cart`，schema 版本为 `1`。持久层只保存 variant UUID、数量，以及服务器上次确认的价格（仅用于下次提示价格是否变化）；标题、SKU、规格文案、图片、当前价格、库存和商品状态均不从 localStorage 渲染。
- `lib/cart/schema.ts` 对损坏 JSON、未知版本、非法 UUID/数量、重复 variant 和过量项目安全归一化；读取或写入 localStorage 被浏览器拒绝时，页面继续使用当前内存状态，不因 Storage 异常崩溃。
- `/[locale]/cart` 加载本地项目后调用受控 Server Action。`lib/cart/server-validation.ts` 使用当前匿名 Supabase RLS 权限重新查询已发布商品、启用 variant、当前 CAD 价格、有效特价、库存、翻译、规格和值、图片记录与短时签名 URL；查询不到的项目统一标记为下架或规格不可用。
- 客户端传来的 variant ID、数量和上次价格都先经过服务端 parser。上次价格只参与生成非权威的“价格已变化”提示；页面金额、小计、库存上限和可用状态只使用本次服务端响应。Phase 8 仍必须在订单提交事务中再次独立重查，不能复用购物车页面的校验结果作为订单快照依据。
- 商品详情只允许完整且当前可售的规格组合加入购物车；同一 variant 合并数量，不同 variant 独立成行。购物车支持数量调整、删除、页面内二次确认清空、刷新持久化，以及价格变化、库存不足、售罄和下架/禁用的行内状态。
- 本阶段没有新增数据库表、migration、RLS、Storage policy、环境变量、支付或订单请求接口；`/zh/cart` 明确只显示服务器校验后的商品小计，并提示运费、税费和最终金额待店主确认。

## Phase 8 订单请求、后台处理与邮件架构

- `/zh/order-request` 从版本化游客购物车读取 `variantId + quantity`，先用公开 RLS 重新展示服务器摘要；提交时仍不复用该页面校验结果，而是调用服务器专用事务 RPC 再次权威读取商品、中文标题、规格、SKU、当前 CAD 价格、库存和图片路径。
- `public.submit_order_request` 只授予 `service_role` 执行权；浏览器、匿名和普通 authenticated 角色都不能直接调用。Next.js Server Action 通过独立 server-only Supabase client 调用，secret 不进入客户端 bundle。函数使用行锁、数据库约束和 deferred totals trigger，在单一事务中写入请求、items 快照、两封邮件状态和限流事件。
- 限流只保存由服务器 HMAC 生成的 IP/email 64 位十六进制摘要，不保存原始 IP；同一摘要一小时最多接受 3 次请求。honeypot 在 Server Action 中先行处理，正常字段仍由 TypeScript 与数据库双重校验。
- 订单写入提交后才调用 Resend。`order_request_emails` 分别记录店主通知和顾客确认的 `pending/sending/sent/failed`、尝试次数、provider id 与不含 secret 的失败摘要。发送失败只更新邮件状态，不删除或回滚已入库请求；后台可重试，Resend idempotency key 按请求和邮件类型固定。
- 管理员列表/详情继续使用当前管理员 JWT、服务端 `requireAdmin()` 和 RLS。状态与备注只能通过审计 RPC 修改；不再允许直接 UPDATE 订单请求行。有效主流程为 `new → contacted → confirmed → preparing → completed`，完成前可转为 `cancelled`。
- 邮件正文使用纯文本，不渲染顾客 HTML；两封邮件和公开成功页都明确说明“未付款、未最终确认”。成功页只显示本次不可顺序枚举的请求编号，不提供公开查询接口。

## 云端开发 Supabase 安全基线

- 云端开发项目使用 Canada (Central) 区域；Data API 保持启用，默认新表自动暴露关闭，自动 RLS event trigger 保持启用。正式表、GRANT、RLS 与策略仍只通过仓库 migration 管理。
- 云端 Auth 关闭公众 signup、匿名登录和手动账号关联；Email provider 保持启用，只服务由管理员受控建立的后台账号。
- Supabase 创建页生成的 `public.rls_auto_enable()` 是 `security definer` event-trigger 函数。`20260714020008_secure_cloud_auto_rls_trigger.sql` 在函数存在时撤销 `public`、`anon`、`authenticated` 与 `service_role` 的直接执行权，不删除或禁用 event trigger。
- `public.admin_update_order_request(...)` 是唯一保留给 `authenticated` 的预期 `security definer` 管理 RPC；它固定空 `search_path`，在任何写入前调用 `private.is_admin()`，并只允许受控状态流和审计写入。Supabase advisors 对此入口的通用警告属于已核对的设计例外，不代表普通登录用户拥有管理员权限。

## Phase 9 首页内容与运营架构

- `/admin/homepage` 由受保护 Server Component 并行读取完整首页配置、分类、商品和已登记商品图片；保存 Server Action 内再次调用 `requireAdmin()`。
- `lib/homepage/schema.ts` 是客户端体验校验与服务器权威校验的共享 schema：固定 10 类模块，限制文本长度、排序唯一性、CTA 白名单、FAQ/选品数量和 UUID 格式，并拒绝 `<`、`>` 标记。
- `public.admin_save_homepage(jsonb, jsonb)` 使用 `security invoker` 和现有管理员 RLS，在单一事务内保存模块、中文 translation、结构化 locale 内容、联系/履约设置与一条审计记录；数据库会独立重复验证类型、key、实体引用和上限。
- 公开 locale layout 只读取启用的公告条；`/zh` 并行读取启用模块、公开商品和分类，按 `sort_order` 渲染。手动选品、分类或图片后来失效/下架时只安全跳过或回退到品牌图片，不让首页崩溃。
- Hero 与品牌故事图片只能引用已有 `product_images.id`；前台继续使用 private bucket 的短时签名 URL，不接受外部图片 URL。联系邮箱只由受控 site settings 生成 `mailto:`，CTA 只允许既定站内目标。
- 后台实时预览只渲染 React 纯文本和固定组件，不使用 `dangerouslySetInnerHTML`，不执行管理员输入。
