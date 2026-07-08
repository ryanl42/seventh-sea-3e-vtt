/**
 * 7th Sea 3e — Wound Track Display Helper
 *
 * Computes the segmented dot/Dramatic-Wound-box track for display, where
 * each pip (Minor Wound dot or Dramatic Wound box) carries a flat index
 * across the whole track. That flat index is what the click handler uses:
 * clicking pip K sets the total wound count to K+1 (or K, if K was already
 * the topmost filled pip — a one-click "remove this one" toggle).
 *
 * Track shape for Toughness T, dramaticLimit N segments:
 *   [T dots][1 box] repeated N times — e.g. Toughness 2, 4 segments:
 *   OO-D-OO-D-OO-D-OO-D  (flat indices 0-2 dots, 3 box, 4-6 dots, 7 box, ...)
 */
export function computeWoundTrack(toughness, minor, dramatic, dramaticLimit) {
  const relevant    = dramatic.slice(0, dramaticLimit);
  const activeIndex = relevant.findIndex(marked => !marked); // -1 = fully Helpless

  return relevant.map((marked, segIndex) => {
    const isActive = segIndex === activeIndex;
    const segStart = segIndex * (toughness + 1);

    const dots = Array.from({ length: toughness }, (_, dotIndex) => ({
      filled:    marked || (isActive && dotIndex < minor),
      flatIndex: segStart + dotIndex,
    }));

    return {
      dots,
      marked,
      active:           isActive,
      dramaticFlatIndex: segStart + toughness,
    };
  });
}