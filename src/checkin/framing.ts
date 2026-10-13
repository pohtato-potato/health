/**
 * Check-in photos are framed head to hips, the way they are really shot.
 * Guide lines sit at these fractions of the frame's height so every month lines up.
 */
export const TORSO_GUIDES = {
  /** Top of the head. */
  head: 0.08,
  /** The shoulder line. */
  shoulder: 0.27,
  /** The hip edge, just above the bottom of the frame. */
  hip: 0.9,
} as const;

/**
 * Whether the saved photo is flipped left to right. The front camera's preview is a mirror,
 * so its photo is flipped to match; in mirror mode (shooting a reflection) the flip is reversed.
 */
export function flipFor(facing: 'user' | 'environment', mirror: boolean): boolean {
  return (facing === 'user') !== mirror;
}
