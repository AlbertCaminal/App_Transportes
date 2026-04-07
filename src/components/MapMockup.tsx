import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Truck, Calendar, Users } from 'lucide-react-native';
import { theme } from '../theme';

interface Props {
  isTracking?: boolean;
  isProgrammed?: boolean;
  isOpenRoute?: boolean;
  originSet?: boolean;
  destinations?: string[];
}

const originPos = { x: 42, y: 45 };
const destPositions = [
  { x: 58, y: 55 },
  { x: 65, y: 40 },
  { x: 30, y: 60 },
];
const carrierStart = { x: 10, y: 85 };
const coPassengerPos = { x: 55, y: 35 };

export default function MapMockup({
  isTracking = false,
  isProgrammed = false,
  isOpenRoute = false,
  originSet = false,
  destinations = [],
}: Props) {
  const [dims, setDims] = useState({ w: 1, h: 1 });
  const dw = useSharedValue(1);
  const dh = useSharedValue(1);
  const t = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    dw.value = width;
    dh.value = height;
    setDims({ w: width, h: height });
  };

  useEffect(() => {
    if (!isTracking) {
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: 25000, easing: Easing.linear }),
      -1,
      false
    );
  }, [isTracking, t]);

  const truckStyle = useAnimatedStyle(() => {
    const u = t.value;
    let px = carrierStart.x;
    let py = carrierStart.y;
    if (u <= 0.4) {
      const s = u / 0.4;
      px = carrierStart.x + (originPos.x - carrierStart.x) * s;
      py = carrierStart.y + (originPos.y - carrierStart.y) * s;
    } else {
      const s = (u - 0.4) / 0.6;
      const dx = destPositions[0];
      px = originPos.x + (dx.x - originPos.x) * s;
      py = originPos.y + (dx.y - originPos.y) * s;
    }
    const left = (dw.value * px) / 100 - 24;
    const top = (dh.value * py) / 100 - 24;
    return { left, top, position: 'absolute' as const };
  });

  const pathD =
    destinations.length > 0
      ? `M ${originPos.x} ${originPos.y} ${destinations
          .map((_, i) => {
            const p = destPositions[i % destPositions.length];
            return `L ${p.x} ${p.y}`;
          })
          .join(' ')}`
      : '';

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <Svg
        width={dims.w}
        height={dims.h}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        opacity={0.1}
      >
        <Path
          d="M0 40 L100 40 M40 0 L40 100 M0 75 L100 75 M75 0 L75 100"
          stroke={theme.brandBlue}
          strokeWidth={0.2}
        />
      </Svg>

      {originSet && (
        <View style={[styles.marker, { left: `${originPos.x}%`, top: `${originPos.y}%` }]}>
          {isProgrammed && (
            <View style={styles.calBadge}>
              <Calendar color="#fff" size={16} />
            </View>
          )}
          <View style={styles.originDot} />
        </View>
      )}

      {isOpenRoute && isTracking && (
        <View style={[styles.marker, { left: `${coPassengerPos.x}%`, top: `${coPassengerPos.y}%` }]}>
          <View style={styles.coPassenger}>
            <Users color={theme.brandBlue} size={14} />
          </View>
          <View style={styles.coDot} />
        </View>
      )}

      {destinations.length > 0 &&
        destinations.map((_, i) => {
          const pos = destPositions[i % destPositions.length];
          return (
            <View key={i} style={[styles.marker, { left: `${pos.x}%`, top: `${pos.y}%` }]}>
              <View style={styles.destRing} />
              <View style={styles.destLabel}>
                <Text style={styles.destLabelText}>PARADA {i + 1}</Text>
              </View>
            </View>
          );
        })}

      {!isTracking && originSet && destinations.length > 0 && pathD ? (
        <Svg
          width={dims.w}
          height={dims.h}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
          opacity={0.35}
        >
          <Path
            d={pathD}
            stroke={theme.brandBlue}
            strokeWidth={0.6}
            strokeDasharray={isOpenRoute ? '2.5 2' : '0'}
            fill="none"
          />
        </Svg>
      ) : null}

      {isTracking && (
        <Animated.View style={[truckStyle, { zIndex: 40 }]}>
          <View style={styles.truckBox}>
            <Truck color="#fff" size={24} />
          </View>
          <Pulse />
        </Animated.View>
      )}

      <View style={styles.vignetteBottom} pointerEvents="none" />
    </View>
  );
}

function Pulse() {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
  }, [s]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: 2 - s.value,
  }));
  return <Animated.View style={[styles.pulseRing, style]} />;
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.bgRoot,
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
    zIndex: 20,
    marginLeft: -10,
    marginTop: -10,
    alignItems: 'center',
  },
  calBadge: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.electricBlue,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  originDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: theme.electricBlue,
  },
  coPassenger: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
  },
  coDot: {
    position: 'absolute',
    bottom: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.brandBlue,
  },
  destRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.brandBlue,
  },
  destLabel: {
    position: 'absolute',
    bottom: -28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(11,14,20,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  destLabelText: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.brandBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  truckBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: theme.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: theme.electricBlue,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: theme.electricBlue,
  },
  vignetteBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
    backgroundColor: theme.deepNight,
    opacity: 0.5,
  },
});
