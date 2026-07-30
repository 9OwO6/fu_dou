import { describe, expect, it } from "vitest";

import type { PublicShowcaseItem, ShowcaseStyleGroup } from "@/lib/showcase/data";
import { groupPublicShowcaseItems } from "@/lib/showcase/grouping";

function item(id: string, styleGroup: ShowcaseStyleGroup | null = null): PublicShowcaseItem {
  return {
    id,
    shortCode: `HB-${id}`,
    availability: "inquiry",
    priceCad: null,
    title: id,
    description: null,
    publishedAt: "2026-07-30T00:00:00Z",
    batchId: "batch",
    tags: [],
    images: [],
    styleGroup,
  };
}

describe("groupPublicShowcaseItems", () => {
  it("把同组成员折叠成一个展示单位，并采用指定主展示款", () => {
    const group: ShowcaseStyleGroup = {
      id: "group-1",
      name: "脚丫马克杯",
      nameZh: "脚丫马克杯",
      nameEn: "Footed mug",
      featuredItemId: "playful",
      members: [
        { itemId: "smiling", label: "微笑", labelZh: "微笑", labelEn: "Smiling", sortOrder: 0 },
        { itemId: "playful", label: "调皮", labelZh: "调皮", labelEn: "Playful", sortOrder: 1 },
      ],
    };

    const entries = groupPublicShowcaseItems([item("smiling", group), item("playful", group), item("rug")]);

    expect(entries).toHaveLength(2);
    expect(entries[0].items.map((candidate) => candidate.id)).toEqual(["smiling", "playful"]);
    expect(entries[0].featuredItem.id).toBe("playful");
    expect(entries[1].featuredItem.id).toBe("rug");
  });

  it("成员列表不完整时只使用当前已加载成员，不生成空卡片", () => {
    const group: ShowcaseStyleGroup = {
      id: "group-2",
      name: "杯子",
      nameZh: "杯子",
      nameEn: "Mug",
      featuredItemId: "missing",
      members: [
        { itemId: "visible", label: "可见", labelZh: "可见", labelEn: "Visible", sortOrder: 0 },
        { itemId: "missing", label: "未加载", labelZh: "未加载", labelEn: "Missing", sortOrder: 1 },
      ],
    };

    const entries = groupPublicShowcaseItems([item("visible", group)]);

    expect(entries).toHaveLength(1);
    expect(entries[0].featuredItem.id).toBe("visible");
  });
});
