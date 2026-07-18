import { describe, expect, it } from "vitest";

import { parseShowcasePublishPayload } from "@/lib/showcase/validation";

const batchId = "b1000000-0000-4000-8000-000000000001";
const validItem = {
  id: "b1000000-0000-4000-8000-000000000002",
  titleZh: "小熊杯",
  titleEn: "Bear cup",
  descriptionZh: "",
  descriptionEn: "",
  priceCad: "18.00",
  tagIds: ["b1000000-0000-4000-8000-000000000003"],
  images: [{
    id: "b1000000-0000-4000-8000-000000000004",
    storagePath: `showcase/${batchId}/b1000000-0000-4000-8000-000000000004.webp`,
    width: 1000,
    height: 1250,
  }],
};

describe("quick showcase publish validation", () => {
  it("accepts optional text and price while preserving valid images", () => {
    const parsed = parseShowcasePublishPayload(batchId, JSON.stringify([
      validItem,
      {
        ...validItem,
        id: "b1000000-0000-4000-8000-000000000005",
        titleZh: "",
        titleEn: "",
        priceCad: "",
        tagIds: [],
        images: [{ ...validItem.images[0], id: "b1000000-0000-4000-8000-000000000006", storagePath: `showcase/${batchId}/b1000000-0000-4000-8000-000000000006.jpg` }],
      },
    ]));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.values[1].priceCad).toBe("");
  });

  it("rejects a path outside the current batch", () => {
    const parsed = parseShowcasePublishPayload(batchId, JSON.stringify([{ ...validItem, images: [{ ...validItem.images[0], storagePath: "showcase/other/file.webp" }] }]));
    expect(parsed).toMatchObject({ success: false });
  });

  it("rejects invalid CAD values and repeated tags", () => {
    expect(parseShowcasePublishPayload(batchId, JSON.stringify([{ ...validItem, priceCad: "0" }]))).toMatchObject({ success: false });
    expect(parseShowcasePublishPayload(batchId, JSON.stringify([{ ...validItem, tagIds: [validItem.tagIds[0], validItem.tagIds[0]] }]))).toMatchObject({ success: false });
  });

  it("rejects duplicate image identifiers across lightweight items", () => {
    const parsed = parseShowcasePublishPayload(batchId, JSON.stringify([validItem, { ...validItem, id: "b1000000-0000-4000-8000-000000000007" }]));
    expect(parsed).toMatchObject({ success: false });
  });
});
