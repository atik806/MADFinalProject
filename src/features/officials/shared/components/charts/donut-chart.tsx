import { Text, useWindowDimensions, View } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  data: DonutSegment[];
  size?: number;
  innerRadius?: number;
};

export function DonutChart({ data, size: propSize, innerRadius: propInner }: DonutChartProps) {
  const { width: screenW } = useWindowDimensions();
  const size = propSize || Math.min(screenW - 80, 200);
  const innerR = propInner || size * 0.55;
  const outerR = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0);

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  let currentAngle = 0;
  const slices = data.map((d) => {
    const sweep = (d.value / total) * 360;
    const outerStart = polarToCartesian(currentAngle, outerR);
    const outerEnd = polarToCartesian(currentAngle + sweep, outerR);
    const innerStart = polarToCartesian(currentAngle + sweep, innerR);
    const innerEnd = polarToCartesian(currentAngle, innerR);
    const largeArc = sweep > 180 ? 1 : 0;
    const path = [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
      'Z',
    ].join(' ');
    const slice = { ...d, path, startAngle: currentAngle, sweep };
    currentAngle += sweep;
    return slice;
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {slices.map((s, i) => (
          <G key={i}>
            <Path d={s.path} fill={s.color} stroke="#fff" strokeWidth={2} />
          </G>
        ))}
        <SvgText
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={16}
          fontWeight="800"
          fill="#1F2937">
          {total}%
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize={10}
          fill="#6B7280">
          Total
        </SvgText>
      </Svg>

      <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {data.map((d, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }} />
            <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '500' }}>
              {d.label} {Math.round((d.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
