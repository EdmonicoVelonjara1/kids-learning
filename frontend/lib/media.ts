export const VIDEO_ASSETS: Record<string, number> = {
  jump: require('@/assets/animations/jump.mp4'),
  run: require('@/assets/animations/run.mp4'),
  punch: require('@/assets/animations/punch.mp4'),
  dive: require('@/assets/animations/dive.mp4'),
  swim: require('@/assets/animations/swim.mp4'),
  walk: require('@/assets/animations/walk.mp4'),
  dance: require('@/assets/animations/dance.mp4'),
  throw: require('@/assets/animations/throw.mp4'),
  climb: require('@/assets/animations/climb.mp4'),
  sleep: require('@/assets/animations/sleep.mp4'),
};

export function getVideoSource(asset: string): number | null {
  return VIDEO_ASSETS[asset] ?? null;
}
