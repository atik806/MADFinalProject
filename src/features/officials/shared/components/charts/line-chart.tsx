import { useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { BrandColors } from '@/features/officials/shared/constants/theme';

type LineChartData = {
  label: string;
  value: number;
};

type LineChartProps = {
  data: LineChartData[];
  color?: string;
  title?: string;
};

export function LineChart({ data, color = BrandColors.greenLight }: LineChartProps) {
  const { width: screenW } = useWindowDimensions();
  const width = Math.min(screenW - 64, 500);
  const height = 200;
  const pad = { top: 20, bottom: 28, left: 32, right: 16 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const x = (i: number) => pad.left + (i / (data.length - 1)) * cw;
  const y = (v: number) => pad.top + ch - ((v - minVal) / range) * ch;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.value)}`)
    .join(' ');

  const areaPath = `${linePath} L ${x(data.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(minVal + f * range));

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {yTicks.map((tick, i) => (
        <G key={i}>
          <Path
            d={`M ${pad.left} ${y(tick)} L ${width - pad.right} ${y(tick)}`}
            stroke="#E5E7EB"
            strokeWidth={1}
          />
          <SvgText
            x={pad.left - 8}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize={10}
            fill="#9CA3AF">
            {tick}
          </SvgText>
        </G>
      ))}

      <Path d={areaPath} fill="url(#lineFill)" />
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {data.map((d, i) => (
        <G key={i}>
          <Circle cx={x(i)} cy={y(d.value)} r={4} fill={color} />
          <Circle cx={x(i)} cy={y(d.value)} r={2} fill="#fff" />
          <SvgText
            x={x(i)}
            y={height - 5}
            textAnchor="middle"
            fontSize={10}
            fill="#6B7280"
            fontWeight="500">
            {d.label}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}
