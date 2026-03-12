import { z } from "zod";

// ─── Slide Types ───

export const SlideTypeSchema = z.enum([
  "hook",
  "problem",
  "value",
  "proof",
  "stat",
  "quote",
  "cta",
]);

export type SlideType = z.infer<typeof SlideTypeSchema>;

// ─── Animation Presets ───

export const AnimationPresetSchema = z.enum([
  "fade-in",
  "slide-up",
  "slide-left",
  "zoom-in",
  "typewriter",
  "blur-reveal",
  "bounce-in",
  "scale-pop",
]);

export type AnimationPreset = z.infer<typeof AnimationPresetSchema>;

// ─── Transition Presets ───

export const TransitionPresetSchema = z.enum([
  "cut",
  "fade",
  "slide-left",
  "slide-up",
  "wipe",
  "zoom",
]);

export type TransitionPreset = z.infer<typeof TransitionPresetSchema>;

// ─── Motion Slide ───

export const MotionSlideSchema = z.object({
  slideType: SlideTypeSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  highlight: z.string().optional(),
  imageUrl: z.string().optional(),
  imagePrompt: z.string().optional(),
  backgroundColor: z.string().default("#0f172a"),
  textColor: z.string().default("#ffffff"),
  accentColor: z.string().default("#3b82f6"),
  animation: AnimationPresetSchema.default("fade-in"),
  durationFrames: z.number().default(90), // 3 seconds at 30fps
});

export type MotionSlide = z.infer<typeof MotionSlideSchema>;

// ─── Motion Video Config ───

export const MotionVideoConfigSchema = z.object({
  fps: z.number().default(30),
  width: z.number().default(1080),
  height: z.number().default(1080), // Square for social
  slides: z.array(MotionSlideSchema).min(1).max(12),
  transition: TransitionPresetSchema.default("fade"),
  transitionDurationFrames: z.number().default(15), // 0.5s
  brandName: z.string().optional(),
  brandColor: z.string().default("#3b82f6"),
  watermark: z.boolean().default(false),
  outputFormat: z.enum(["mp4", "webm"]).default("mp4"),
});

export type MotionVideoConfig = z.infer<typeof MotionVideoConfigSchema>;

// ─── Motion Template ───

export type MotionTemplate = {
  id: string;
  name: string;
  description: string;
  category: "social" | "promo" | "educational" | "storytelling";
  defaultSlides: MotionSlide[];
  defaultTransition: TransitionPreset;
  previewColor: string; // For UI thumbnail
};

// ─── Render Result ───

export type RenderResult = {
  videoUrl: string;
  thumbnailUrl: string;
  durationMs: number;
  width: number;
  height: number;
  sizeBytes: number;
};

// ─── Generated Motion Post (from AI) ───

export type GeneratedMotionPost = {
  platform: string;
  content: string;
  hashtags: string[];
  slides: MotionSlide[];
  templateId?: string;
};
