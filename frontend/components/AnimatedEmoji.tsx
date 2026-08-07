import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { MotionType } from '@/lib/api';

type Props = {
  emoji: string;
  motion: MotionType;
  size?: number;
};

export default function AnimatedEmoji({ emoji, motion, size = 110 }: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    tx.value = 0;
    ty.value = 0;
    rot.value = 0;
    scale.value = 1;

    switch (motion) {
      case 'bounce':
        ty.value = withRepeat(
          withSequence(
            withTiming(-30, { duration: 300, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })
          ),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.85, { duration: 60 }),
            withTiming(1, { duration: 240 })
          ),
          -1,
          false
        );
        break;
      case 'run':
        tx.value = withRepeat(withTiming(28, { duration: 450 }), -1, true);
        rot.value = withRepeat(
          withSequence(
            withTiming(0.12, { duration: 225 }),
            withTiming(-0.12, { duration: 225 })
          ),
          -1,
          false
        );
        break;
      case 'punch':
        tx.value = withRepeat(
          withSequence(
            withTiming(-20, { duration: 70, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 430 })
          ),
          -1,
          false
        );
        rot.value = withRepeat(
          withSequence(withTiming(-0.18, { duration: 70 }), withTiming(0, { duration: 430 })),
          -1,
          false
        );
        break;
      case 'dive':
        ty.value = withRepeat(
          withSequence(
            withTiming(26, { duration: 350, easing: Easing.inOut(Easing.quad) }),
            withTiming(-26, { duration: 350, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
        rot.value = withRepeat(
          withSequence(
            withTiming(0.55, { duration: 350, easing: Easing.inOut(Easing.quad) }),
            withTiming(-0.55, { duration: 350, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
        break;
      case 'swim':
        rot.value = withRepeat(
          withSequence(
            withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.sin) }),
            withTiming(-0.35, { duration: 600, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          false
        );
        break;
      case 'walk':
        tx.value = withRepeat(withTiming(26, { duration: 800 }), -1, true);
        rot.value = withRepeat(
          withSequence(withTiming(0.08, { duration: 400 }), withTiming(-0.08, { duration: 400 })),
          -1,
          false
        );
        break;
      case 'dance':
        rot.value = withRepeat(
          withSequence(
            withTiming(0.32, { duration: 300, easing: Easing.inOut(Easing.quad) }),
            withTiming(-0.32, { duration: 300, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(withTiming(1.12, { duration: 300 }), withTiming(1, { duration: 300 })),
          -1,
          false
        );
        break;
      case 'throw':
        ty.value = withRepeat(
          withSequence(
            withTiming(-10, { duration: 110 }),
            withTiming(0, { duration: 110 }),
            withTiming(-16, { duration: 110 }),
            withTiming(0, { duration: 110 }),
            withTiming(-22, { duration: 120 }),
            withTiming(0, { duration: 200 })
          ),
          -1,
          false
        );
        rot.value = withRepeat(
          withSequence(
            withTiming(-0.22, { duration: 110 }),
            withTiming(0, { duration: 110 }),
            withTiming(0.25, { duration: 120 }),
            withTiming(0, { duration: 200 })
          ),
          -1,
          false
        );
        break;
      case 'climb':
        ty.value = withRepeat(
          withTiming(30, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          -1,
          true
        );
        break;
      case 'sleep':
        scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 700 }),
            withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
        break;
    }
  }, [motion, tx, ty, rot, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}rad` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}
