import { runIntake } from "./pipeline.ts";

async function main() {
  console.log("Happy Beans 本地 AI 上新助手 v0.1（dry_run）");
  console.log("只读取项目内 incoming 图片；不会上传 Supabase、发布网站或修改原图。\n");
  const result = await runIntake({
    onProgress: (message) => console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${message}`),
  });
  if (result.status === "already_completed") {
    console.log(`批次 ${result.batchId} 已完成，本次未重复生成。`);
    return;
  }
  console.log(`批次完成：${result.batchId}`);
  console.log(`manifest：${result.manifestPath}`);
  if (result.previewPath) console.log(`本地预览：${result.previewPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `处理失败：${error.message}` : "处理失败：未知错误");
  process.exitCode = 1;
});
