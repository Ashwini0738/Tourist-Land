import React from 'react';
import { Circle, Path, Svg } from 'react-native-svg';

type SecurityIconName =
  | 'compass'
  | 'fingerprint'
  | 'face'
  | 'gift'
  | 'ticket'
  | 'pass'
  | 'lock'
  | 'wallet'
  | 'map'
  | 'location';

export function SecurityIcon({
  name,
  size,
  color,
}: {
  name: SecurityIconName;
  size: number;
  color: string;
}) {
  if (name === 'compass') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9.2" stroke={color} strokeWidth="1.7" />
        <Path d="m15.8 8.2-2.3 5.3-5.3 2.3 2.3-5.3 5.3-2.3Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'fingerprint') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 4.2a7.8 7.8 0 0 0-7.8 7.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M12 6.8a5.2 5.2 0 0 0-5.2 5.2c0 2.1-.5 4.1-1.4 5.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M12 9.4a2.6 2.6 0 0 0-2.6 2.6c0 3.1-.8 5.7-2.2 7.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M12 4.2a7.8 7.8 0 0 1 7.8 7.8c0 3.1-.7 5.9-2.1 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M12 6.8a5.2 5.2 0 0 1 5.2 5.2c0 2.1.4 4.1 1.2 5.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M12 9.4a2.6 2.6 0 0 1 2.6 2.6c0 3.1.7 5.7 1.8 7.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M12 12v7.6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'gift') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7H8.5a2.5 2.5 0 1 1 0-5c2.1 0 3.5 5 3.5 5Zm0 0h3.5a2.5 2.5 0 1 0 0-5c-2.1 0-3.5 5-3.5 5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'ticket' || name === 'pass') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V9a2 2 0 0 0 0 4v4.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5V13a2 2 0 0 0 0-4V6.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <Path d="M9 8.5v7M12 8.5v7M15 8.5v7" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeDasharray={name === 'pass' ? '0 0' : '1 2'} />
      </Svg>
    );
  }

  if (name === 'lock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
        <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14v3" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'wallet') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
        <Path d="M4 7h14.5A1.5 1.5 0 0 1 20 8.5V15h-4.5a2.5 2.5 0 0 1 0-5H20M16 12.5h.01" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'map') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="m3.5 6 5-2 7 2 5-2v14l-5 2-7-2-5 2V6Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <Path d="M8.5 4v14M15.5 6v14" stroke={color} strokeWidth="1.6" />
        <Circle cx="12" cy="11" r="1.6" fill={color} />
      </Svg>
    );
  }

  if (name === 'location') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 20s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
        <Circle cx="12" cy="10" r="2" stroke={color} strokeWidth="1.5" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5V8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M16 20h2.5a1.5 1.5 0 0 0 1.5-1.5V16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="12" cy="12" r="4.2" stroke={color} strokeWidth="1.8" />
      <Circle cx="10.5" cy="11.4" r="0.7" fill={color} />
      <Circle cx="13.5" cy="11.4" r="0.7" fill={color} />
      <Path d="M10.2 14.2c1.1.8 2.5.8 3.6 0" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}