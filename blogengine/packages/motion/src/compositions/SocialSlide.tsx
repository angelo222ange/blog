/**
 * Individual slide component for motion design videos.
 * Features: entrance + exit animations, decorative shapes, gradient orbs, staggered text.
 * All animations via useCurrentFrame() — no CSS animations (Remotion rule).
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  AbsoluteFill,
} from "remotion";
import type { MotionSlide, AnimationPreset } from "../types.js";

type SocialSlideProps = {
  slide: MotionSlide;
  index: number;
};

// ─── Decorative floating shapes ───

const SHAPE_CONFIGS = [
  { x: 0.08, y: 0.12, size: 50, speed: 0.018, shape: "circle" as const },
  { x: 0.85, y: 0.2, size: 35, speed: 0.022, shape: "square" as const },
  { x: 0.15, y: 0.75, size: 28, speed: 0.025, shape: "diamond" as const },
  { x: 0.9, y: 0.65, size: 45, speed: 0.015, shape: "circle" as const },
  { x: 0.5, y: 0.08, size: 22, speed: 0.03, shape: "square" as const },
  { x: 0.7, y: 0.85, size: 38, speed: 0.02, shape: "diamond" as const },
  { x: 0.3, y: 0.9, size: 18, speed: 0.028, shape: "circle" as const },
  { x: 0.95, y: 0.4, size: 32, speed: 0.019, shape: "square" as const },
];

const FloatingShapes: React.FC<{
  frame: number;
  accentColor: string;
  width: number;
  height: number;
  slideIndex: number;
  masterOpacity: number;
}> = ({ frame, accentColor, width, height, slideIndex, masterOpacity }) => {
  // Each slide gets a different subset of shapes for variety
  const offset = slideIndex * 3;

  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: masterOpacity }}>
      {SHAPE_CONFIGS.map((cfg, i) => {
        const idx = (i + offset) % SHAPE_CONFIGS.length;
        const s = SHAPE_CONFIGS[idx]!;
        const floatY = Math.sin(frame * s.speed + i * 1.5) * 18;
        const floatX = Math.cos(frame * s.speed * 0.8 + i * 2) * 12;
        const rotation = frame * s.speed * 25 + i * 45;

        const borderRadius =
          s.shape === "circle" ? "50%" : s.shape === "diamond" ? "4px" : "6px";
        const transform =
          s.shape === "diamond"
            ? `rotate(${rotation + 45}deg)`
            : `rotate(${rotation}deg)`;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x * width + floatX,
              top: s.y * height + floatY,
              width: s.size,
              height: s.size,
              borderRadius,
              border: `1.5px solid ${accentColor}30`,
              backgroundColor: `${accentColor}08`,
              transform,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ─── Gradient orbs background ───

const GradientOrbs: React.FC<{
  frame: number;
  accentColor: string;
  backgroundColor: string;
  width: number;
  height: number;
  masterOpacity: number;
}> = ({ frame, accentColor, width, height, masterOpacity }) => {
  const orbs = [
    { cx: 0.2, cy: 0.3, r: 0.2, opacity: 0.12 },
    { cx: 0.8, cy: 0.25, r: 0.15, opacity: 0.08 },
    { cx: 0.6, cy: 0.7, r: 0.18, opacity: 0.1 },
  ];

  return (
    <AbsoluteFill style={{ overflow: "hidden", filter: "blur(60px)", opacity: masterOpacity }}>
      {orbs.map((orb, i) => {
        const x = orb.cx * width + Math.sin(frame * 0.01 + i * 2) * 40;
        const y = orb.cy * height + Math.cos(frame * 0.008 + i * 3) * 30;
        const r = orb.r * width;
        const scale = 1 + Math.sin(frame * 0.012 + i) * 0.12;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${accentColor}, transparent)`,
              opacity: orb.opacity,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ─── Decorative lines (for "value" and "proof" slides) ───

const DecorativeLines: React.FC<{
  frame: number;
  accentColor: string;
  width: number;
  height: number;
  masterOpacity: number;
}> = ({ frame, accentColor, width, height, masterOpacity }) => {
  const lineCount = 5;

  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: masterOpacity }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: lineCount }).map((_, i) => {
          const progress = interpolate(
            frame,
            [i * 8, i * 8 + 40],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const y1 = height * (0.15 + i * 0.18);
          const y2 = y1 + Math.sin(frame * 0.02 + i) * 15;

          return (
            <line
              key={i}
              x1={0}
              y1={y1}
              x2={width * progress}
              y2={y2}
              stroke={`${accentColor}15`}
              strokeWidth={1}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ─── Animation helpers ───

function getEntranceStyle(
  preset: AnimationPreset,
  frame: number,
  fps: number
): React.CSSProperties {
  const sp = spring({ frame, fps, config: { damping: 200 } });

  switch (preset) {
    case "fade-in":
      return { opacity: sp };
    case "slide-up":
      return {
        opacity: sp,
        transform: `translateY(${interpolate(sp, [0, 1], [50, 0], { extrapolateRight: "clamp" })}px)`,
      };
    case "slide-left":
      return {
        opacity: sp,
        transform: `translateX(${interpolate(sp, [0, 1], [60, 0], { extrapolateRight: "clamp" })}px)`,
      };
    case "zoom-in":
      return {
        opacity: sp,
        transform: `scale(${interpolate(sp, [0, 1], [0.8, 1], { extrapolateRight: "clamp" })})`,
      };
    case "typewriter":
      return {
        opacity: 1,
        clipPath: `inset(0 ${interpolate(sp, [0, 1], [100, 0], { extrapolateRight: "clamp" })}% 0 0)`,
      };
    case "blur-reveal":
      return {
        opacity: sp,
        filter: `blur(${interpolate(sp, [0, 1], [10, 0], { extrapolateRight: "clamp" })}px)`,
      };
    case "bounce-in": {
      const bounce = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
      return {
        opacity: bounce,
        transform: `scale(${interpolate(bounce, [0, 1], [0.4, 1], { extrapolateRight: "clamp" })})`,
      };
    }
    case "scale-pop": {
      const pop = spring({ frame, fps, config: { damping: 15, stiffness: 150 } });
      return {
        opacity: pop,
        transform: `scale(${interpolate(pop, [0, 1], [0.6, 1], { extrapolateRight: "clamp" })})`,
      };
    }
    default:
      return { opacity: sp };
  }
}

function getExitOpacity(
  frame: number,
  fps: number,
  durationFrames: number
): number {
  const exitStart = durationFrames - Math.round(fps * 0.6); // Exit starts 0.6s before end
  return interpolate(
    frame,
    [exitStart, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
}

function getExitTranslateY(
  frame: number,
  fps: number,
  durationFrames: number
): number {
  const exitStart = durationFrames - Math.round(fps * 0.6);
  return interpolate(
    frame,
    [exitStart, durationFrames],
    [0, -25],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
}

// ─── Staggered word animation ───

const AnimatedText: React.FC<{
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  frame: number;
  fps: number;
  durationFrames: number;
  delay?: number;
  lineHeight?: number;
  letterSpacing?: string;
  maxWidth?: number;
}> = ({
  text,
  fontSize,
  fontWeight,
  color,
  frame,
  fps,
  durationFrames,
  delay = 0,
  lineHeight = 1.2,
  letterSpacing,
  maxWidth,
}) => {
  const words = text.split(" ");
  const STAGGER = 3; // frames between each word

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${fontSize * 0.3}px`,
        maxWidth,
      }}
    >
      {words.map((word, i) => {
        const enterFrame = Math.max(0, frame - delay - i * STAGGER);
        const entrance = spring({
          frame: enterFrame,
          fps,
          config: { damping: 200 },
        });

        const exitOpacity = getExitOpacity(frame, fps, durationFrames);
        const exitY = getExitTranslateY(frame, fps, durationFrames);

        const opacity = entrance * exitOpacity;
        const translateY = interpolate(entrance, [0, 1], [18, 0], {
          extrapolateRight: "clamp",
        }) + exitY;

        return (
          <span
            key={i}
            style={{
              fontSize,
              fontWeight,
              color,
              lineHeight,
              letterSpacing,
              opacity,
              transform: `translateY(${translateY}px)`,
              display: "inline-block",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ─── Main slide component ───

export const SocialSlide: React.FC<SocialSlideProps> = ({ slide, index }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationFrames = slide.durationFrames;

  // Master exit opacity - ensures EVERYTHING fades out
  const exitOpacity = getExitOpacity(frame, fps, durationFrames);
  const exitY = getExitTranslateY(frame, fps, durationFrames);

  // Entrance animation for the content block
  const contentEntrance = getEntranceStyle(slide.animation, frame, fps);

  // Determine which decorative elements to show based on slide type
  const showOrbs = ["hook", "cta", "stat"].includes(slide.slideType);
  const showLines = ["value", "proof", "problem"].includes(slide.slideType);
  const showShapes = true; // Always show floating shapes

  // Animated accent bar for hooks
  const accentBarHeight = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill
      style={{
        background: slide.backgroundColor,
        fontFamily: "'Quicksand', 'Inter', sans-serif",
      }}
    >
      {/* Background image if present — with animated entrance + dark overlay for readability */}
      {slide.imageUrl && (() => {
        const imgEntrance = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
        const imgScale = interpolate(imgEntrance, [0, 1], [1.1, 1], { extrapolateRight: "clamp" });
        return (
          <>
            <AbsoluteFill style={{
              opacity: interpolate(imgEntrance, [0, 1], [0, 0.45]) * exitOpacity,
              transform: `scale(${imgScale})`,
            }}>
              <Img
                src={slide.imageUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </AbsoluteFill>
            {/* Gradient overlay for text contrast */}
            <AbsoluteFill style={{
              background: `linear-gradient(180deg, ${slide.backgroundColor}ee 0%, ${slide.backgroundColor}88 40%, ${slide.backgroundColor}cc 100%)`,
              opacity: exitOpacity,
            }} />
          </>
        );
      })()}

      {/* Gradient orbs */}
      {showOrbs && (
        <GradientOrbs
          frame={frame}
          accentColor={slide.accentColor}
          backgroundColor={slide.backgroundColor}
          width={width}
          height={height}
          masterOpacity={exitOpacity}
        />
      )}

      {/* Decorative lines */}
      {showLines && (
        <DecorativeLines
          frame={frame}
          accentColor={slide.accentColor}
          width={width}
          height={height}
          masterOpacity={exitOpacity}
        />
      )}

      {/* Floating shapes */}
      {showShapes && (
        <FloatingShapes
          frame={frame}
          accentColor={slide.accentColor}
          width={width}
          height={height}
          slideIndex={index}
          masterOpacity={exitOpacity}
        />
      )}

      {/* Accent bar for hook slides */}
      {slide.slideType === "hook" && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 80,
            width: 5,
            height: interpolate(accentBarHeight, [0, 1], [0, 70]),
            borderRadius: 3,
            background: slide.accentColor,
            opacity: exitOpacity,
          }}
        />
      )}

      {/* Corner accent for CTA slides */}
      {slide.slideType === "cta" && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: interpolate(
                spring({ frame, fps, config: { damping: 200 }, durationInFrames: 25 }),
                [0, 1],
                [0, 120]
              ),
              height: 4,
              background: slide.accentColor,
              opacity: exitOpacity,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 4,
              height: interpolate(
                spring({ frame, fps, config: { damping: 200 }, durationInFrames: 25 }),
                [0, 1],
                [0, 120]
              ),
              background: slide.accentColor,
              opacity: exitOpacity,
            }}
          />
        </>
      )}

      {/* Main content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          ...contentEntrance,
          opacity:
            (contentEntrance.opacity as number ?? 1) * exitOpacity,
          transform: `${contentEntrance.transform || ""} translateY(${exitY}px)`,
        }}
      >
        {/* Stat number (big, separate from title) */}
        {slide.slideType === "stat" && slide.highlight && (
          <div style={{ marginBottom: 20 }}>
            <AnimatedText
              text={slide.highlight}
              fontSize={96}
              fontWeight={800}
              color={slide.accentColor}
              frame={frame}
              fps={fps}
              durationFrames={durationFrames}
              delay={0}
              letterSpacing="-0.04em"
            />
          </div>
        )}

        {/* Title */}
        <AnimatedText
          text={slide.title}
          fontSize={slide.slideType === "hook" ? 60 : slide.slideType === "stat" ? 44 : 50}
          fontWeight={700}
          color={slide.textColor}
          frame={frame}
          fps={fps}
          durationFrames={durationFrames}
          delay={slide.slideType === "stat" ? 10 : 0}
          lineHeight={1.2}
          letterSpacing="-0.02em"
          maxWidth={width - 160}
        />

        {/* Subtitle */}
        {slide.subtitle && (
          <div style={{ marginTop: 24 }}>
            <AnimatedText
              text={slide.subtitle}
              fontSize={26}
              fontWeight={400}
              color={`${slide.textColor}bb`}
              frame={frame}
              fps={fps}
              durationFrames={durationFrames}
              delay={12}
              lineHeight={1.5}
              maxWidth={650}
            />
          </div>
        )}

        {/* Highlight badge (not for stat slides, they use the big number) */}
        {slide.highlight && slide.slideType !== "stat" && (() => {
          const badgeEntrance = spring({
            frame: Math.max(0, frame - 22),
            fps,
            config: { damping: 200 },
          });
          const badgeOpacity = badgeEntrance * exitOpacity;

          return (
            <div
              style={{
                marginTop: 32,
                opacity: badgeOpacity,
                transform: `scale(${interpolate(badgeEntrance, [0, 1], [0.8, 1], { extrapolateRight: "clamp" })}) translateY(${exitY}px)`,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "12px 28px",
                  borderRadius: 14,
                  background: `${slide.accentColor}20`,
                  border: `1.5px solid ${slide.accentColor}40`,
                  color: slide.accentColor,
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {slide.highlight}
              </span>
            </div>
          );
        })()}

        {/* Quote decorative marks */}
        {slide.slideType === "quote" && (
          <div
            style={{
              position: "absolute",
              top: 100,
              left: 60,
              fontSize: 120,
              fontWeight: 800,
              color: `${slide.accentColor}20`,
              lineHeight: 1,
              opacity: exitOpacity,
            }}
          >
            &ldquo;
          </div>
        )}
      </AbsoluteFill>

      {/* Slide number indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 60,
          opacity: 0.25 * exitOpacity,
          color: slide.textColor,
          fontSize: 16,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: interpolate(
            spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 }),
            [0, 1],
            [0, 60]
          ),
          height: 3,
          borderRadius: 2,
          background: slide.accentColor,
          opacity: 0.4 * exitOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
