import { useVideoPlayer, VideoView } from 'expo-video';
import { Text } from 'react-native';

import AnimatedEmoji from '@/components/AnimatedEmoji';
import type { Media, MotionType } from '@/lib/api';
import { getVideoSource } from '@/lib/media';
import { View } from './Themed';

type Props = {
  emoji: string;
  motion?: MotionType;
  media?: Media;
  size?: number;
};

export default function MotionVisual({ emoji, motion, media, size = 110 }: Props) {
  const source = media?.kind === 'video' ? getVideoSource(media.asset) : null;
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  if (source) {
    return (
      <View className='flex'>
        <VideoView
          player={player}
          style={{ width: size * 2.5, height: size * 2, padding: 5 }}
          contentFit="cover"
          nativeControls={false}
        />
      </View>
    );
  }

  if (motion) {
    return <AnimatedEmoji emoji={emoji} motion={motion} size={size} />;
  }

  return <Text style={{ fontSize: size * 1.5 }}>{emoji}</Text>;
}
