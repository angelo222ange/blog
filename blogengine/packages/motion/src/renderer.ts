/**
 * Server-side video renderer using Remotion.
 * Bundles compositions and renders to MP4/WebM.
 */
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { MotionVideoConfig, RenderResult } from "./types.js";

let bundleLocation: string | null = null;

async function getBundleLocation(): Promise<string> {
  if (bundleLocation) return bundleLocation;

  const entryPoint = path.resolve(
    import.meta.dirname || __dirname,
    "./compositions/Root.tsx"
  );

  bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".json"],
        extensionAlias: {
          ".js": [".tsx", ".ts", ".jsx", ".js"],
        },
      },
    }),
  });

  console.log("[motion] Remotion bundle created at:", bundleLocation);
  return bundleLocation;
}

type RenderOptions = {
  config: MotionVideoConfig;
  outputDir: string;
  filename?: string;
};

export async function renderMotionVideo(
  options: RenderOptions
): Promise<RenderResult> {
  const { config, outputDir, filename } = options;
  // TransitionSeries: total = sum(durations) - (transitionCount * transitionDuration)
  const totalSlideFrames = config.slides.reduce((sum, s) => sum + s.durationFrames, 0);
  const transitionCount = config.slides.length - 1;
  const totalFrames = totalSlideFrames - transitionCount * config.transitionDurationFrames;
  const outputFile = path.join(
    outputDir,
    filename || `motion-${Date.now()}.${config.outputFormat}`
  );

  const bundlePath = await getBundleLocation();

  const compositionId =
    config.height > config.width ? "SocialVideoVertical" : "SocialVideo";

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: compositionId,
    inputProps: {
      slides: config.slides,
      transition: config.transition,
      transitionDurationFrames: config.transitionDurationFrames,
      brandName: config.brandName,
      brandColor: config.brandColor,
    },
  });

  // Override composition with actual config
  const finalComposition = {
    ...composition,
    width: config.width,
    height: config.height,
    fps: config.fps,
    durationInFrames: totalFrames,
  };

  console.log(
    `[motion] Rendering ${compositionId}: ${config.width}x${config.height}, ${totalFrames} frames (${(totalFrames / config.fps).toFixed(1)}s)`
  );

  await renderMedia({
    composition: finalComposition,
    serveUrl: bundlePath,
    codec: config.outputFormat === "webm" ? "vp8" : "h264",
    outputLocation: outputFile,
    inputProps: {
      slides: config.slides,
      transition: config.transition,
      transitionDurationFrames: config.transitionDurationFrames,
      brandName: config.brandName,
      brandColor: config.brandColor,
    },
  });

  const fs = await import("fs");
  const stat = fs.statSync(outputFile);

  console.log(`[motion] Rendered: ${outputFile} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

  return {
    videoUrl: outputFile,
    thumbnailUrl: "", // TODO: extract thumbnail frame
    durationMs: (totalFrames / config.fps) * 1000,
    width: config.width,
    height: config.height,
    sizeBytes: stat.size,
  };
}

export async function clearBundleCache(): Promise<void> {
  bundleLocation = null;
}
