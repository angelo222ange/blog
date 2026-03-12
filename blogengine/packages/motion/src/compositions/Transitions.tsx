/**
 * Transition effects between slides.
 * Follows Remotion rules: all via useCurrentFrame(), spring(), interpolate().
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { TransitionPreset } from "../types.js";

type TransitionProps = {
  type: TransitionPreset;
  durationFrames: number;
  children: React.ReactNode;
  nextChildren?: React.ReactNode;
};

export const Transition: React.FC<TransitionProps> = ({
  type,
  durationFrames,
  children,
  nextChildren,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sp = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
    durationInFrames: durationFrames,
  });

  switch (type) {
    case "cut":
      return <>{progress < 0.5 ? children : nextChildren}</>;

    case "fade":
      return (
        <div style={{ position: "relative", width, height }}>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - sp }}>
            {children}
          </div>
          {nextChildren && (
            <div style={{ position: "absolute", inset: 0, opacity: sp }}>
              {nextChildren}
            </div>
          )}
        </div>
      );

    case "slide-left":
      return (
        <div style={{ position: "relative", width, height, overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateX(${interpolate(sp, [0, 1], [0, -width], { extrapolateRight: "clamp" })}px)`,
            }}
          >
            {children}
          </div>
          {nextChildren && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateX(${interpolate(sp, [0, 1], [width, 0], { extrapolateRight: "clamp" })}px)`,
              }}
            >
              {nextChildren}
            </div>
          )}
        </div>
      );

    case "slide-up":
      return (
        <div style={{ position: "relative", width, height, overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateY(${interpolate(sp, [0, 1], [0, -height], { extrapolateRight: "clamp" })}px)`,
            }}
          >
            {children}
          </div>
          {nextChildren && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateY(${interpolate(sp, [0, 1], [height, 0], { extrapolateRight: "clamp" })}px)`,
              }}
            >
              {nextChildren}
            </div>
          )}
        </div>
      );

    case "wipe":
      return (
        <div style={{ position: "relative", width, height, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>{children}</div>
          {nextChildren && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                clipPath: `inset(0 ${interpolate(sp, [0, 1], [100, 0], { extrapolateRight: "clamp" })}% 0 0)`,
              }}
            >
              {nextChildren}
            </div>
          )}
        </div>
      );

    case "zoom":
      return (
        <div style={{ position: "relative", width, height, overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 1 - sp,
              transform: `scale(${interpolate(sp, [0, 1], [1, 1.3], { extrapolateRight: "clamp" })})`,
            }}
          >
            {children}
          </div>
          {nextChildren && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: sp,
                transform: `scale(${interpolate(sp, [0, 1], [0.8, 1], { extrapolateRight: "clamp" })})`,
              }}
            >
              {nextChildren}
            </div>
          )}
        </div>
      );

    default:
      return <>{children}</>;
  }
};
