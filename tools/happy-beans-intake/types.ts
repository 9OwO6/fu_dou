export type IntakeDirectories = {
  incoming: string;
  processing: string;
  completed: string;
  failed: string;
  output: string;
};

export type AllowedTag = { slug: string; nameZh: string };

export type IntakeConfig = {
  rulesVersion: string;
  workspaceRoot: string;
  directories: IntakeDirectories;
  maxBatchImages: number;
  maxImagesPerProduct: number;
  analysisImageMaxPixels: number;
  modelName: string;
  lmStudioBaseUrl: string;
  minimumConfidence: number;
  retryCount: number;
  requestTimeoutMs: number;
  generatePreview: boolean;
  runMode: "dry_run";
  allowedTags: AllowedTag[];
};

export type IntakeImage = {
  imageId: string;
  originalFileName: string;
  contentHash: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  byteSize: number;
  sourcePath: string;
  thumbnailPath: string;
};

export type SourceFile = Omit<IntakeImage, "sourcePath" | "thumbnailPath">;

export type DuplicateFile = {
  originalFileName: string;
  contentHash: string;
  duplicateOfImageId: string;
};

export type RejectedFile = {
  originalFileName: string;
  reason: string;
};

export type GroupingGroup = {
  groupId: string;
  imageIds: string[];
  confidence: number;
  uncertaintyReason: string;
};

export type GroupingResult = { groups: GroupingGroup[] };

export type DraftAltText = { imageId: string; altZh: string };

export type ProductDraft = {
  groupId: string;
  imageIds: string[];
  titleZh: string;
  descriptionZh: string;
  suggestedTags: string[];
  coverImageId: string;
  orderedImageIds: string[];
  altTexts: DraftAltText[];
  confidence: number;
  uncertainFields: string[];
  warnings: string[];
};

export type IntakeManifest = {
  schemaVersion: "0.1";
  batchId: string;
  sourceFiles: SourceFile[];
  duplicateFiles: DuplicateFile[];
  rejectedFiles: RejectedFile[];
  groups: ProductDraft[];
  modelName: string;
  rulesVersion: string;
  createdAt: string;
  runMode: "dry_run";
};

export type PipelineStage = "file_validation" | "grouping" | "drafting" | "manifest" | "preview" | "completed";

export type PipelineState = {
  batchId: string;
  stage: PipelineStage;
  grouping?: GroupingResult;
  drafts: Record<string, ProductDraft>;
  updatedAt: string;
};
