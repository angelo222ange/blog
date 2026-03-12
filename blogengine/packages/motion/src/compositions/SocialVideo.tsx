/**
 * Main composition: assembles slides with transitions using @remotion/transitions.
 * Uses TransitionSeries for proper slide-to-slide transitions without overlap.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { SocialSlide } from "./SocialSlide.js";
import type { MotionSlide, TransitionPreset } from "../types.js";

type SocialVideoProps = {
  slides: MotionSlide[];
  transition: TransitionPreset;
  transitionDurationFrames: number;
  brandName?: string;
  brandColor: string;
};

function getTimingForType(type: TransitionPreset, durationFrames: number) {
  if (type === "cut") {
    return linearTiming({ durationInFrames: 1 });
  }
  return springTiming({
    config: { damping: 200 },
    durationInFrames: durationFrames,
  });
}

// Render a TransitionSeries.Transition for the given preset
function renderTransition(type: TransitionPreset, durationFrames: number) {
  const timing = getTimingForType(type, durationFrames);

  switch (type) {
    case "slide-left":
      return (
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={timing}
        />
      );
    case "slide-up":
      return (
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={timing}
        />
      );
    case "wipe":
      return (
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={timing}
        />
      );
    case "fade":
    case "zoom":
    case "cut":
    default:
      return (
        <TransitionSeries.Transition
          presentation={fade()}
          timing={timing}
        />
      );
  }
}

export const SocialVideo: React.FC<SocialVideoProps> = ({
  slides,
  transition,
  transitionDurationFrames,
  brandName,
  brandColor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const brandOpacity = interpolate(frame, [0, 20], [0, 0.6], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Slides with proper transitions via TransitionSeries */}
      <TransitionSeries>
        {slides.map((slideData, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={slideData.durationFrames}>
              <SocialSlide slide={slideData} index={i} />
            </TransitionSeries.Sequence>

            {/* Transition between slides (not after the last one) */}
            {i < slides.length - 1 && renderTransition(transition, transitionDurationFrames)}
          </React.Fragment>
        ))}
      </TransitionSeries>

      {/* Brand watermark */}
      {brandName && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: brandOpacity,
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#ffffff",
              background: `${brandColor}30`,
              padding: "6px 18px",
              borderRadius: 20,
              backdropFilter: "blur(8px)",
              fontFamily: "'Quicksand', sans-serif",
              letterSpacing: "0.05em",
            }}
          >
            {brandName}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 3,
          width: `${(frame / durationInFrames) * 100}%`,
          background: brandColor,
          borderRadius: "0 2px 0 0",
          zIndex: 10,
        }}
      />
    </AbsoluteFill>
  );
};
