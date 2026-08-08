import { useWindowDimensions } from 'react-native';

const BASELINE_WIDTH = 390;

export function useScale(): number {
  const { width } = useWindowDimensions();
  return Math.max(0.78, Math.min(1.25, width / BASELINE_WIDTH));
}
