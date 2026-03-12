// Types
export type {
  MotionSlide,
  MotionVideoConfig,
  MotionTemplate,
  RenderResult,
  GeneratedMotionPost,
  AnimationPreset,
  TransitionPreset,
  SlideType,
} from "./types.js";
export {
  MotionSlideSchema,
  MotionVideoConfigSchema,
  AnimationPresetSchema,
  TransitionPresetSchema,
  SlideTypeSchema,
} from "./types.js";

// Templates
export { MOTION_TEMPLATES, getTemplate } from "./templates/presets.js";

// Generator (AI slide content)
export { generateMotionSlides } from "./motion-generator.js";

// Renderer (server-side video rendering)
export { renderMotionVideo, clearBundleCache } from "./renderer.js";
