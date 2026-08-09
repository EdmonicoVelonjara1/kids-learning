import { Text, TextProps } from './Themed';

export function MonoText(props: TextProps) {
  return <Text {...props} className={[props.className, 'font-[SpaceMono]'].filter(Boolean).join(' ')} />;
}
