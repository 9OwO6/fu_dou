import type { PublicShowcaseItem, ShowcaseItemEntry } from "./data";

export function groupPublicShowcaseItems(items: PublicShowcaseItem[]): ShowcaseItemEntry[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const seenGroups = new Set<string>();
  const entries: ShowcaseItemEntry[] = [];
  for (const item of items) {
    const group = item.styleGroup;
    if (!group) {
      entries.push({ key: item.id, group: null, items: [item], featuredItem: item });
      continue;
    }
    if (seenGroups.has(group.id)) continue;
    seenGroups.add(group.id);
    const groupedItems = group.members
      .map((member) => itemsById.get(member.itemId))
      .filter((member): member is PublicShowcaseItem => Boolean(member));
    if (!groupedItems.length) continue;
    entries.push({
      key: `group-${group.id}`,
      group,
      items: groupedItems,
      featuredItem: groupedItems.find((member) => member.id === group.featuredItemId) ?? groupedItems[0],
    });
  }
  return entries;
}
