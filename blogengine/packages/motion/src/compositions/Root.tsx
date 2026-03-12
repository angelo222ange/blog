/**
 * Root composition file for Remotion.
 * Registers all available compositions.
 */
import React from "react";
import { Composition, registerRoot } from "remotion";
import { SocialVideo } from "./SocialVideo.js";
import type { MotionSlide, TransitionPreset } from "../types.js";

const defaultSlides: MotionSlide[] = [
  {
    slideType: "hook",
    title: "Le secret que personne ne vous dit",
    subtitle: "Sur la productivite en 2026",
    backgroundColor: "#0f172a",
    textColor: "#ffffff",
    accentColor: "#3b82f6",
    animation: "slide-up",
    durationFrames: 90,
  },
  {
    slideType: "problem",
    title: "80% des entrepreneurs echouent",
    subtitle: "Parce qu'ils ignorent cette seule chose",
    highlight: "80%",
    backgroundColor: "#1e1b4b",
    textColor: "#ffffff",
    accentColor: "#8b5cf6",
    animation: "zoom-in",
    durationFrames: 90,
  },
  {
    slideType: "value",
    title: "La methode en 3 etapes",
    subtitle: "Simple. Efficace. Prouvee.",
    backgroundColor: "#0c4a6e",
    textColor: "#ffffff",
    accentColor: "#06b6d4",
    animation: "slide-left",
    durationFrames: 90,
  },
  {
    slideType: "cta",
    title: "Passez a l'action",
    subtitle: "Suivez-moi pour plus de conseils",
    backgroundColor: "#0f172a",
    textColor: "#ffffff",
    accentColor: "#3b82f6",
    animation: "bounce-in",
    durationFrames: 90,
  },
];

const defaultTransitionDuration = 15;

const RemotionRoot: React.FC = () => {
  // TransitionSeries: total = sum(durations) - (transitions * transitionDuration)
  const totalSlideFrames = defaultSlides.reduce((sum, s) => sum + s.durationFrames, 0);
  const transitionCount = defaultSlides.length - 1;
  const totalFrames = totalSlideFrames - transitionCount * defaultTransitionDuration;

  return (
    <>
      <Composition
        id="SocialVideo"
        component={SocialVideo}
        durationInFrames={totalFrames}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          slides: defaultSlides,
          transition: "fade" as TransitionPreset,
          transitionDurationFrames: defaultTransitionDuration,
          brandName: "BlogEngine",
          brandColor: "#3b82f6",
        }}
      />
      <Composition
        id="SocialVideoVertical"
        component={SocialVideo}
        durationInFrames={totalFrames}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          slides: defaultSlides,
          transition: "slide-up" as TransitionPreset,
          transitionDurationFrames: defaultTransitionDuration,
          brandName: "BlogEngine",
          brandColor: "#3b82f6",
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
