import type { SlideTransition } from "./types";

/**
 * How Play mode brings a slide in: the framer-motion `initial` state the slide
 * animates from (to its resting state) and the duration in seconds. Fades and
 * every transition without a sliding equivalent come in with an opacity ramp;
 * push / cover / wipe / pull / split slide in from the side the source names
 * (`dir` is the direction of motion, so `l` enters from the right edge).
 */
export function enterMotion(
  transition: SlideTransition | undefined,
  width: number,
  height: number
): { initial: { opacity: number; x?: number; y?: number }; duration: number } {
  const duration =
    transition?.speed === "slow" ? 0.7 : transition?.speed === "fast" ? 0.25 : 0.35;
  const sliding =
    transition?.type === "push" ||
    transition?.type === "cover" ||
    transition?.type === "wipe" ||
    transition?.type === "pull";
  if (!sliding) return { initial: { opacity: 0 }, duration };
  switch (transition?.direction) {
    case "l":
      return { initial: { opacity: 1, x: width }, duration };
    case "r":
      return { initial: { opacity: 1, x: -width }, duration };
    case "u":
      return { initial: { opacity: 1, y: height }, duration };
    case "d":
      return { initial: { opacity: 1, y: -height }, duration };
    default:
      return { initial: { opacity: 0 }, duration };
  }
}
