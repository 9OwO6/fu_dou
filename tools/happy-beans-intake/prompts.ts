import type { AllowedTag, GroupingGroup, IntakeImage } from "./types.ts";

const SAFETY = `硬性边界：只描述照片可见信息。不得生成或猜测 SKU、库存、CAD 价格、材质、容量、尺寸、产地、安全认证、护理方式；不得声称食品级、微波炉适用或洗碗机适用。标题、说明和 alt 都不得出现陶瓷、玻璃、塑料、树脂、木制、木质、金属、棉、羊毛、聚酯或亚克力等材质词，即使文件名或常见商品称呼含有这些词也不能复述；例如把“玻璃杯”写成“透明造型杯”。不要输出 schema 以外字段。`;

export function groupingPrompt(images: IntakeImage[], rules: string) {
  const index = images.map((image) => `${image.imageId}: ${image.originalFileName}`).join("\n");
  return `你正在执行 Happy Beans 本地上新助手的第一阶段：只判断图片分组。\n\n${SAFETY}\n\n图片索引：\n${index}\n\n规则：\n${rules}\n\n联系表中的每张图都有 imageId。每个 imageId 必须且只能出现一次，每组最多 10 张。groupId 从 group-001 连续编号。无法确定时拆分并在 uncertaintyReason 说明。只返回符合 schema 的 JSON。`;
}

export function draftPrompt(group: GroupingGroup, images: IntakeImage[], tags: AllowedTag[], rules: string, correction?: string) {
  const index = images.map((image) => `${image.imageId}: ${image.originalFileName}`).join("\n");
  const allowed = tags.map((tag) => `${tag.slug}=${tag.nameZh}`).join("、");
  const correctionBlock = correction ? `\n\n【必须修正】下面是上一份无效草稿及本地安全校验错误：\n${correction}\n保留已合规字段，只修正错误指出的字段。返回 JSON 前逐字检查 titleZh、descriptionZh 和每个 altZh：命中词必须出现 0 次，也不能作为引号、解释或复述出现。材质命中时只改用照片可见的颜色、透明度、造型、角度和背景描述，例如只写“透明小熊造型杯”，绝不能写“透明玻璃杯”。若仍输出命中词，整份草稿会被丢弃。` : "";
  return `你正在执行 Happy Beans 本地上新助手的第二阶段：只为一个已确定图片组生成中文展示草稿。\n\n${SAFETY}\n\n组：${group.groupId}\n分组置信度：${group.confidence}\n分组不确定原因：${group.uncertaintyReason || "无"}\n图片索引：\n${index}\n允许标签（suggestedTags 只能输出 slug）：${allowed}\n\n规则：\n${rules}${correctionBlock}\n\nimageIds、orderedImageIds 和 altTexts 必须精确覆盖本组图片；coverImageId 必须属于本组。若照片不足以支持某信息，不写成事实，在 uncertainFields/warnings 说明。只返回符合 schema 的 JSON。`;
}
