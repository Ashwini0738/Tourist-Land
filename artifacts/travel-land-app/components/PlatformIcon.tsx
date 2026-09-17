import React from 'react';
import type { ColorValue } from 'react-native';
import { Circle, Path, Svg } from 'react-native-svg';

type PlatformIconProps = {
  name: string;
  size?: number;
  color?: ColorValue;
  fill?: ColorValue;
  accessibilityLabel?: string;
};

const paths: Record<string, string> = {
  'alert-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v4m0 4h.01',
  'bar-chart': 'M4 19V5m5 14V9m5 10V3m5 16v-7',
  'arrow-left': 'M19 12H5m7-7-7 7 7 7',
  'arrow-right': 'M5 12h14m-7-7 7 7-7 7',
  'arrow-up-right': 'M7 17 17 7m-8 0h8v8',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
  briefcase: 'M4 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm4 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5h4m-2-2v4',
  box: 'm3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7m-9 4v10',
  calendar: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm-1 5h16M8 2v4m8-4v4',
  check: 'm5 12 4 4L19 6',
  'check-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-left': 'm15 18-6-6 6-6',
  'chevron-right': 'm9 18 6-6-6-6',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.8 5.2-2.3 5.3-5.3 2.3 2.3-5.3 5.3-2.3Z',
  'credit-card': 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 5h18',
  heart: 'M20.8 8.9c0 5.5-8.8 10.1-8.8 10.1S3.2 14.4 3.2 8.9A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.7Z',
  'help-circle': 'M9.5 9a2.6 2.6 0 1 1 4.8 1.4c-.8 1-2.3 1.3-2.3 3m.01 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  home: 'm3 11 9-8 9 8m-2-1v10H5V10',
  image: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 10 3-3 2 2 2-2 3 3M8 9h.01',
  inbox: 'M4 4h16v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4Zm0 9h4l1.5 2h5L16 13h4M8 8h8',
  info: 'M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5',
  lock: 'M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5ZM8 10.5V8a4 4 0 0 1 8 0v2.5M12 14v3',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m5 14 5-5-5-5m5 5H9',
  map: 'm3.5 6 5-2 7 2 5-2v14l-5 2-7-2-5 2V6Zm5 12V4m7 14V6',
  'map-pin': 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  minus: 'M5 12h14',
  'more-horizontal': 'M6 12h.01M12 12h.01M18 12h.01',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z',
  plus: 'M12 5v14M5 12h14',
  search: 'm21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  send: 'm22 2-7 20-4-9-9-4 20-7ZM22 2 11 13',
  share: 'M18 8a3 3 0 1 0-2.8-4 3 3 0 0 0 .1 1L8.8 8.5a3 3 0 1 0 0 7l6.5 3.5A3 3 0 1 0 17 17l-6.7-3.6a3 3 0 0 0 0-2.8L17 7a3 3 0 0 0 1 1Z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4',
  sliders: 'M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-8 4v4',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  coffee: 'M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 2h2a3 3 0 1 1 0 6h-2M7 4c0 1 1 1 1 2M11 4c0 1 1 1 1 2M15 4c0 1 1 1 1 2M3 22h16',
  gift: 'M20 12v8H4v-8m-2-4h20v4H2V8Zm10 0v12M12 8H7.5A2.5 2.5 0 1 1 10 5.5C10 7 12 8 12 8Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5C14 7 12 8 12 8Z',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  radio: 'M5 8a10 10 0 0 1 14 0M8 11a6 6 0 0 1 8 0M11 14a2 2 0 0 1 2 0M12 18h.01',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-13v2m0 15v2m8.5-10.5h-2m-13 0h-2m14.1-6.1-1.4 1.4M7.8 17.8l-1.4 1.4m11.2 0-1.4-1.4M7.8 6.2 6.4 4.8',
  ticket: 'M3 7a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4h18v-4a2 2 0 0 0 0-4V7H3Zm9 0v2m0 2v2m0 2v2',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-3a3 3 0 0 1 0 6m0-10a3 3 0 0 1 0 6',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  user: 'M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  x: 'm6 6 12 12M18 6 6 18',
  'x-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3 6-6 6m0-6 6 6',
};

export function PlatformIcon({ name, size = 24, color = '#000', fill = 'none', ...props }: PlatformIconProps) {
  const path = paths[name] ?? paths['alert-circle'];
  const iconFill = fill && fill !== 'transparent' ? fill : 'none';
  const strokeWidth = Math.max(1.4, size / 16);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel={props.accessibilityLabel}>
      <Path
        d={path}
        fill={iconFill}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {name === 'heart' && iconFill !== 'none' && <Path d={path} fill={iconFill} stroke="none" />}
      {name === 'star' && iconFill !== 'none' && <Path d={path} fill={iconFill} stroke="none" />}
      {name === 'more-horizontal' && (
        <>
          <Circle cx="6" cy="12" r="1.2" fill={color} />
          <Circle cx="12" cy="12" r="1.2" fill={color} />
          <Circle cx="18" cy="12" r="1.2" fill={color} />
        </>
      )}
    </Svg>
  );
}