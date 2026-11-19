import type { Slide } from "./types";

/**
 * The slides a slide show steps through: hidden slides (`Slide.hidden`) are
 * skipped, as in PowerPoint. When every slide is hidden the full list is
 * returned so Play mode always has something to show.
 */
export function playableSlides(slides: Slide[]): Slide[] {
  const visible = slides.filter((s) => !s.hidden);
  return visible.length ? visible : slides;
}
