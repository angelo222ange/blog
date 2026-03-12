/**
 * Prompt Enhancer for AI image generation.
 *
 * Inspired by patterns extracted from the nano-banana prompt library
 * (https://github.com/YouMind-OpenLab/nano-banana-pro-prompts-recommend-skill).
 *
 * Instead of downloading all 11k+ prompts at runtime, this module hardcodes
 * the top ~30 professional prompt templates organized by style, each including
 * composition, lighting, camera settings, and quality keywords that reliably
 * improve AI image generation output.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptTemplate {
  /** Short label for logging */
  label: string;
  /** Composition / framing directives */
  composition: string;
  /** Lighting description */
  lighting: string;
  /** Camera / lens directives */
  camera: string;
  /** Quality / style keywords appended at the end */
  quality: string[];
  /** Negative prompts — things to explicitly avoid (Nano Banana technique) */
  negative: string[];
}

export type PromptStyle =
  | "cinematic"
  | "editorial"
  | "product"
  | "lifestyle"
  | "tech"
  | "architectural"
  | "minimal"
  | "local-service";

// ---------------------------------------------------------------------------
// Template library (extracted from nano-banana social-media-post,
// product-marketing, and poster-flyer categories)
// ---------------------------------------------------------------------------

const TEMPLATES: Record<PromptStyle, PromptTemplate[]> = {
  cinematic: [
    {
      label: "cinematic-dramatic",
      composition: "wide-angle establishing shot, rule of thirds, strong foreground interest, depth layers",
      lighting: "dramatic side lighting with deep shadows, golden hour warm tones, volumetric haze",
      camera: "full-frame DSLR, 35mm lens, f/2.8, ISO 100, shallow depth of field",
      quality: ["8K resolution", "cinematic color grading", "ultra-photorealistic", "RAW photo", "film grain texture", "global illumination"],
      negative: ["beauty filters", "over-smoothed skin", "cartoon look", "CGI feel", "watermark", "text artifacts"],
    },
    {
      label: "cinematic-moody",
      composition: "centered subject, negative space above, strong leading lines converging to subject",
      lighting: "high-contrast split lighting, cool blue shadows and warm amber highlights, Rembrandt triangle",
      camera: "85mm telephoto lens, f/1.8, ISO 200, compressed background bokeh circles",
      quality: ["ultra-photorealistic", "RAW photo", "cinematic look", "deep blacks", "rich color depth", "subtle film grain"],
      negative: ["oversaturated", "HDR look", "cartoon", "CGI", "watermark", "text", "extra limbs"],
    },
    {
      label: "cinematic-epic",
      composition: "low angle hero shot, dynamic perspective, sweeping vista background, foreground frame element",
      lighting: "volumetric god rays, atmospheric haze, backlit subject with rim light edge separation",
      camera: "24mm wide-angle, f/4, ISO 100, deep depth of field, hyperfocal distance",
      quality: ["8K detail", "epic scale", "cinematic atmosphere", "professional color grading", "ray-traced lighting"],
      negative: ["flat lighting", "snapshot quality", "blurry", "cartoon", "watermark", "logo", "distorted proportions"],
    },
    {
      label: "cinematic-intimate",
      composition: "tight medium close-up, subject fills two-thirds of frame, textured background out of focus",
      lighting: "diffused window light from left, subtle rim light on right, warm color temperature 5200K",
      camera: "85mm lens, f/1.4, ISO 400, creamy bokeh, tack sharp focus on subject",
      quality: ["hyper-realistic", "fine art photography", "natural skin tones with pores visible", "subtle film grain", "masterpiece"],
      negative: ["poreless skin", "beauty filter", "plastic look", "oversaturated", "CGI", "watermark"],
    },
  ],

  editorial: [
    {
      label: "editorial-magazine",
      composition: "symmetrical framing, clean negative space for text placement, balanced visual weight",
      lighting: "soft diffused studio lighting, beauty dish key, even exposure, soft shadow fill",
      camera: "medium format camera, 80mm lens, f/5.6, ISO 100, tethered shooting quality",
      quality: ["editorial photography", "Vogue magazine quality", "highly detailed", "professional finish", "RAW processing"],
      negative: ["amateur snapshot", "harsh flash", "red eye", "blurry", "watermark", "text overlay"],
    },
    {
      label: "editorial-documentary",
      composition: "candid framing, environmental context visible, decisive moment captured, layered scene",
      lighting: "available natural light only, authentic atmosphere, no artificial enhancement",
      camera: "50mm standard lens, f/2.0, ISO 800, natural perspective, fast shutter freeze",
      quality: ["photojournalistic style", "authentic feel", "8K resolution", "sharp detail", "natural color science"],
      negative: ["posed", "studio", "artificial", "oversaturated", "HDR", "watermark", "logo"],
    },
    {
      label: "editorial-fashion",
      composition: "three-quarter shot with breathing room, geometric architecture background, dynamic pose",
      lighting: "bright ring light with soft fill from reflector, high-key, clean shadow transitions",
      camera: "70-200mm zoom at 135mm, f/2.8, ISO 100, studio setup, tethered",
      quality: ["fashion campaign style", "ultra-clean composition", "DSLR photography", "8K", "sharp eyelash detail"],
      negative: ["amateur", "blurry", "snapshot", "over-processed", "watermark", "distorted body"],
    },
    {
      label: "editorial-minimalist",
      composition: "generous white space, subject positioned on golden ratio point, clean lines throughout",
      lighting: "flat even lighting from overhead softbox, soft shadows, neutral 5600K color temperature",
      camera: "50mm lens, f/4.0, ISO 100, crisp detail across entire frame",
      quality: ["clean aesthetic", "premium quality", "sharp focus", "professional studio finish", "gallery print quality"],
      negative: ["cluttered", "busy background", "harsh shadows", "grain", "watermark", "text"],
    },
  ],

  product: [
    {
      label: "product-hero",
      composition: "product centered, three-quarter angle, contextual props arranged deliberately, white sweep background",
      lighting: "three-point studio: soft key light at 45 degrees, fill at half stop, rim light for edge separation",
      camera: "100mm macro lens, f/8, ISO 100, focus stacking for full sharpness, tripod mounted",
      quality: ["commercial photography", "Amazon listing quality", "ultra sharp", "premium product shot", "color accurate"],
      negative: ["amateur photo", "phone camera", "blurry", "bad white balance", "watermark", "reflection artifacts"],
    },
    {
      label: "product-lifestyle",
      composition: "product in natural use context, lifestyle setting, human hands interacting with product",
      lighting: "warm natural window light from side, soft reflections on surfaces, inviting warm atmosphere",
      camera: "50mm lens, f/2.8, ISO 200, product sharp with soft background, natural color",
      quality: ["lifestyle photography", "aspirational feel", "highly detailed", "warm tones", "authentic materials"],
      negative: ["floating product", "white void", "studio sterile", "watermark", "text", "logo"],
    },
    {
      label: "product-flat-lay",
      composition: "top-down flat lay, organized grid layout, complementary props at 45 degrees, breathing room between items",
      lighting: "overhead diffused softbox, even illumination edge to edge, no harsh shadows",
      camera: "35mm lens, f/5.6, perpendicular to surface, full frame parallel alignment",
      quality: ["styled flat lay", "Instagram-worthy", "catalog quality", "crisp detail", "clean background"],
      negative: ["messy arrangement", "cluttered", "shadows crossing items", "watermark", "blurry edges"],
    },
    {
      label: "product-dramatic",
      composition: "low angle hero shot, product dominates frame, dark moody background, reflective surface",
      lighting: "dramatic spot from above, deep shadows, specular highlights on metallic/glass surfaces",
      camera: "90mm tilt-shift lens, f/4, ISO 100, selective focus plane through product center",
      quality: ["luxury brand aesthetic", "high-end advertising", "8K resolution", "dramatic contrast", "premium feel"],
      negative: ["cheap look", "flat lighting", "amateur", "watermark", "text", "logo"],
    },
  ],

  lifestyle: [
    {
      label: "lifestyle-outdoor",
      composition: "environmental portrait, subject naturally placed in context, depth through foreground bokeh elements",
      lighting: "golden hour sunlight at 15 degrees above horizon, warm backlight, natural lens flare, fill from reflector",
      camera: "85mm lens, f/2.0, ISO 200, subject isolated with creamy background bokeh",
      quality: ["natural photography", "warm golden tones", "authentic moment", "8K resolution", "skin texture visible"],
      negative: ["studio backdrop", "artificial", "oversaturated", "HDR", "watermark", "posed stiffly"],
    },
    {
      label: "lifestyle-urban",
      composition: "street-level perspective, urban architecture framing subject, leading lines converging",
      lighting: "mixed ambient and warm artificial city light, wet pavement reflections, twilight blue hour sky",
      camera: "35mm lens, f/2.8, ISO 800, environmental depth, fast shutter freeze",
      quality: ["street photography", "urban aesthetic", "vivid natural colors", "sharp detail", "atmospheric mood"],
      negative: ["tourist snapshot", "harsh flash", "overexposed", "watermark", "logo", "text"],
    },
    {
      label: "lifestyle-cozy",
      composition: "intimate interior scene, warm domestic setting, inviting textures in foreground (wool, wood)",
      lighting: "soft warm interior lighting at 3200K, candle glow accents, window light fill from side",
      camera: "50mm lens, f/1.8, ISO 400, shallow depth of field, warm white balance manually set",
      quality: ["cozy hygge atmosphere", "inviting warmth", "natural wood and fabric textures", "detailed interior"],
      negative: ["cold sterile", "clinical", "harsh lighting", "watermark", "text", "clutter"],
    },
    {
      label: "lifestyle-active",
      composition: "dynamic action freeze at peak moment, energetic diagonal lines, motion blur in background",
      lighting: "bright daylight, high contrast, sharp defined shadows, backlight rim on subject",
      camera: "24-70mm zoom at 35mm, f/4, ISO 200, 1/2000 shutter speed freeze",
      quality: ["action photography", "high energy", "crisp detail", "vivid saturation", "peak moment"],
      negative: ["static pose", "blurry subject", "motion smear", "watermark", "logo", "text"],
    },
  ],

  tech: [
    {
      label: "tech-modern",
      composition: "clean layout, device or interface as focal point, subtle gradient background, floating UI elements",
      lighting: "soft ambient glow from screen, blue LED accent reflections, cool undertones throughout",
      camera: "50mm lens, f/2.8, ISO 200, sharp across frame, neutral white balance",
      quality: ["modern tech aesthetic", "clean design", "ultra detailed", "professional polish", "Silicon Valley quality"],
      negative: ["cluttered desktop", "old hardware", "dated design", "watermark", "text overlay", "stock photo feel"],
    },
    {
      label: "tech-abstract",
      composition: "abstract geometric network, flowing data visualization, layered depth with parallax, connected nodes",
      lighting: "neon accent lighting (cyan + magenta), dark background, glowing edges, particle effects",
      camera: "standard lens, deep focus throughout, centered composition, digital render quality",
      quality: ["futuristic design", "digital art quality", "vibrant gradients", "8K resolution", "ray-traced reflections"],
      negative: ["pixelated", "low resolution", "90s clip art", "childish", "watermark", "busy noise"],
    },
    {
      label: "tech-workspace",
      composition: "overhead or three-quarter view, organized desk setup, multiple monitors, tasteful accessories",
      lighting: "bright even overhead LED panel, warm desk lamp accent, monitor glow fill, clean 5600K balance",
      camera: "35mm lens, f/4.0, ISO 200, full scene in focus, slight vignette",
      quality: ["workspace photography", "clean modern aesthetic", "highly detailed", "professional developer setup"],
      negative: ["messy desk", "cables tangled", "old hardware", "watermark", "text", "brand logos visible"],
    },
    {
      label: "tech-dashboard",
      composition: "screen interface in environmental context, data charts visible, dark mode UI, depth blur around screen",
      lighting: "soft screen glow illuminating surroundings, dark moody contrast, blue-purple palette dominant",
      camera: "50mm lens, f/2.8, ISO 400, screen sharp with ambient environment softly blurred",
      quality: ["UI visualization", "modern SaaS aesthetic", "crisp antialiased detail", "professional quality"],
      negative: ["Windows XP", "dated UI", "pixelated screen", "watermark", "stock photo", "low resolution"],
    },
  ],

  architectural: [
    {
      label: "arch-exterior",
      composition: "three-point perspective, converging vertical lines corrected, sky visible, human scale reference",
      lighting: "blue hour twilight, warm interior glow from windows, balanced HDR exposure, city lights beginning",
      camera: "17mm tilt-shift lens, f/8, ISO 100, corrected verticals, deep focus, tripod stability",
      quality: ["architectural photography", "ultra detailed facade", "professional quality", "HDR balanced", "material textures visible"],
      negative: ["distorted verticals", "fish-eye", "construction scaffolding", "watermark", "text", "people blocking"],
    },
    {
      label: "arch-interior",
      composition: "one-point perspective down corridor or through doorway, symmetrical framing, clean sight lines",
      lighting: "mixed natural daylight from windows and warm artificial, window highlights controlled, ambient fill",
      camera: "24mm wide-angle, f/5.6, ISO 400, full depth of field, manual white balance for mixed light",
      quality: ["interior photography", "real estate quality", "bright and airy feel", "sharp detail", "true colors"],
      negative: ["dark corners", "blown highlights", "fish-eye distortion", "watermark", "moving people blur"],
    },
    {
      label: "arch-detail",
      composition: "close-up of architectural detail, texture and material grain visible, abstract geometric crop",
      lighting: "raking side light at 15 degrees to emphasize surface texture, controlled specular highlights",
      camera: "100mm lens, f/4, ISO 100, selective focus on material surface, tripod for sharpness",
      quality: ["detail photography", "texture emphasis", "fine craftsmanship visible", "8K resolution", "material authenticity"],
      negative: ["flat lighting", "no texture visible", "overexposed", "watermark", "blurry"],
    },
  ],

  minimal: [
    {
      label: "minimal-clean",
      composition: "extreme negative space (70%+), single focal element, centered or golden ratio placement",
      lighting: "soft even illumination from all sides, no visible light source, shadow-free, high-key",
      camera: "50mm lens, f/5.6, ISO 100, sharp across entire frame, neutral color",
      quality: ["minimalist aesthetic", "clean composition", "premium feel", "studio quality", "gallery print ready"],
      negative: ["cluttered", "busy", "multiple subjects", "harsh shadows", "watermark", "text"],
    },
    {
      label: "minimal-geometric",
      composition: "geometric patterns, repeating forms, strong parallel lines and precise angles, mathematical beauty",
      lighting: "flat controlled lighting, subtle gradients, uniform exposure, no hot spots",
      camera: "35mm lens, f/8, ISO 100, parallel lines preserved sharp, tripod precision",
      quality: ["geometric design", "abstract beauty", "crisp lines", "modern aesthetic", "Bauhaus influence"],
      negative: ["organic messiness", "clutter", "distortion", "watermark", "text", "imprecise alignment"],
    },
    {
      label: "minimal-mono",
      composition: "single subject isolation, vast empty background, visual breathing room, deliberate simplicity",
      lighting: "single soft directional light from upper left, gentle shadow for depth, high-key 1 stop over",
      camera: "85mm lens, f/2.8, ISO 100, subject razor sharp against creamy soft background",
      quality: ["fine art style", "elegant simplicity", "ultra clean", "gallery quality", "museum print ready"],
      negative: ["busy background", "multiple elements", "harsh contrast", "watermark", "text", "distracting details"],
    },
  ],

  "local-service": [
    {
      label: "service-workplace",
      composition: "worker in action at job site, three-quarter view, tools and materials visible, professional context",
      lighting: "natural daylight with fill from environment, realistic shadows, warm ambient, no flash",
      camera: "35mm lens, f/2.8, ISO 400, environmental depth, subject sharp, background context visible",
      quality: ["ultra-photorealistic", "RAW photo", "authentic workplace", "professional tradesman", "real materials", "8K detail"],
      negative: ["stock photo pose", "fake smile", "studio backdrop", "clean room", "watermark", "text", "logo", "staged feel"],
    },
    {
      label: "service-close-up",
      composition: "close-up on hands working with tools, material texture and detail visible, shallow depth background",
      lighting: "directional work light or natural window light, specular highlights on metal/tools, realistic shadows",
      camera: "85mm macro, f/2.0, ISO 200, sharp focus on hands and tool contact point, bokeh background",
      quality: ["ultra-photorealistic", "RAW photo", "material texture detail", "tool steel reflections", "authentic craftsmanship", "8K"],
      negative: ["clean hands", "unused tools", "stock photo", "watermark", "text", "logo", "posed", "artificial"],
    },
    {
      label: "service-result",
      composition: "finished work result, before-and-after implied, clean professional outcome, environmental context",
      lighting: "bright natural daylight, even exposure showing detail, warm tone, professional quality",
      camera: "24mm wide-angle, f/5.6, ISO 200, full scene sharp, true-to-life colors",
      quality: ["ultra-photorealistic", "RAW photo", "professional result", "quality workmanship visible", "8K detail", "realistic"],
      negative: ["dirty", "messy", "unfinished", "watermark", "text", "logo", "before photo only", "stock photo"],
    },
    {
      label: "service-storefront",
      composition: "commercial building exterior with service context, French urban street, shop front visible, realistic setting",
      lighting: "natural daylight, blue sky, warm stone facade tones, street-level perspective",
      camera: "35mm lens, f/4, ISO 200, full storefront in frame, corrected verticals, true colors",
      quality: ["ultra-photorealistic", "RAW photo", "French commercial street", "authentic urban setting", "8K", "street photography"],
      negative: ["suburban house", "residential", "American style", "watermark", "text", "logo", "night time", "empty street"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Universal quality keywords (appended to every enhanced prompt)
// ---------------------------------------------------------------------------

const UNIVERSAL_QUALITY = [
  "no text or watermarks",
  "no logos",
  "landscape orientation 16:9 aspect ratio",
  "professional quality",
  "ultra-photorealistic",
  "RAW photo",
];

// Nano Banana universal negatives — always appended
const UNIVERSAL_NEGATIVE = [
  "beauty filters",
  "over-smoothed skin",
  "poreless skin",
  "exaggerated or distorted anatomy",
  "cartoon look",
  "CGI feel",
  "3D render",
  "watermark",
  "text artifacts",
  "extra limbs",
  "bad hands",
  "blurry",
  "low resolution",
  "oversaturated HDR",
];

// ---------------------------------------------------------------------------
// Style selection logic
// ---------------------------------------------------------------------------

/**
 * Determines the best prompt style based on the site theme and context.
 */
function inferStyle(
  siteTheme: string,
  hasCity: boolean,
  basePrompt: string,
): PromptStyle {
  const lower = basePrompt.toLowerCase();

  if (siteTheme === "SAAS" || lower.includes("saas") || lower.includes("dashboard") || lower.includes("software")) {
    return "tech";
  }
  if (lower.includes("architect") || lower.includes("building") || lower.includes("facade") || lower.includes("interior")) {
    return "architectural";
  }
  if (lower.includes("product") || lower.includes("marketing") || lower.includes("brand")) {
    return "product";
  }
  if (lower.includes("minimal") || lower.includes("clean") || lower.includes("simple")) {
    return "minimal";
  }
  if (hasCity) {
    // Local service businesses get specialized templates with realistic workplace imagery
    return "local-service";
  }
  // Default: editorial works well for blog hero images
  return "editorial";
}

/**
 * Picks a random template from the selected style category.
 * Uses a simple hash of the base prompt for deterministic but varied selection.
 */
function pickTemplate(style: PromptStyle, basePrompt: string): PromptTemplate {
  const templates = TEMPLATES[style];
  // Simple string hash for deterministic template selection per prompt
  let hash = 0;
  for (let i = 0; i < basePrompt.length; i++) {
    hash = ((hash << 5) - hash + basePrompt.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % templates.length;
  return templates[index]!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enhances a basic image generation prompt with professional photography
 * and design patterns inspired by the nano-banana prompt library.
 *
 * @param basePrompt - The original prompt text (from buildAIImagePrompt)
 * @param style      - Optional explicit style override; auto-detected if omitted
 * @param siteTheme  - The site theme (e.g. "SAAS", "LOCAL_SERVICE")
 * @param hasCity    - Whether the site targets a specific city
 * @returns The enriched prompt string
 */
export function enhanceImagePrompt(
  basePrompt: string,
  style?: PromptStyle,
  siteTheme: string = "",
  hasCity: boolean = false,
): string {
  const resolvedStyle = style ?? inferStyle(siteTheme, hasCity, basePrompt);
  const template = pickTemplate(resolvedStyle, basePrompt);

  console.log(`[prompt-enhancer] Style: ${resolvedStyle}, template: ${template.label}`);

  // Check if base prompt already has a NEGATIVE section (from buildAIImagePrompt)
  const hasNegative = basePrompt.includes("NEGATIVE:");

  // Build the enhanced prompt by appending professional directives
  // Nano Banana pattern: structured sections + quality markers + negative prompts
  const enhancedParts = [
    basePrompt.replace(/\s*$/, ""),
    "",
    `Composition: ${template.composition}.`,
    `Lighting: ${template.lighting}.`,
    `Camera: ${template.camera}.`,
    "",
    `Quality: ${[...template.quality, ...UNIVERSAL_QUALITY].join(", ")}.`,
  ];

  // Append negative prompts (merge template + universal, avoiding dupes with base prompt)
  if (!hasNegative) {
    const allNegatives = [...new Set([...template.negative, ...UNIVERSAL_NEGATIVE])];
    enhancedParts.push("", `NEGATIVE: ${allNegatives.join(", ")}.`);
  } else {
    // Base already has negatives, just add template-specific ones not already there
    const templateOnly = template.negative.filter(n => !basePrompt.toLowerCase().includes(n.toLowerCase()));
    if (templateOnly.length > 0) {
      // Append to the existing NEGATIVE line
      enhancedParts.push(`Additional NEGATIVE: ${templateOnly.join(", ")}.`);
    }
  }

  return enhancedParts.join("\n");
}
