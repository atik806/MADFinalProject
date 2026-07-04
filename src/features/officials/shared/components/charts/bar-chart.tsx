import { useWindowDimensions } from 'react-native';
import { G, Path, Rect, Svg, Text as SvgText } from 'react-native-svg';

type BarChartData = {
  label: string;
  values: { key: string; value: number; color: string }[];
};

type BarChartProps = {
  data: BarChartData[];
};

export function BarChart({ data }: BarChartProps) {
  const { width: screenW } = useWindowDimensions();
  const width = Math.min(screenW - 64, 500);
  const height = 200;
  const pad = { top: 20, bottom: 28, left: 36, right: 16 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const allVals = data.flatMap((d) => d.values.map((v) => v.value));
  const maxVal = Math.max(...allVals, 1);
  const groups = data.length;
  const barGroupWidth = cw / groups;
  const barCount = data[0]?.values.length || 1;
  const barWidth = Math.min((barGroupWidth * 0.7) / barCount, 28);
  const barGap = (barGroupWidth - barWidth * barCount) / (barCount + 1);

  const yScale = (v: number) => pad.top + ch - (v / maxVal) * ch;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f));

  return (
    <Svg width={width} height={height}>
      {yTicks.map((tick, i) => (
        <G key={i}>
          <Path
            d={`M ${pad.left} ${yScale(tick)} L ${width - pad.right} ${yScale(tick)}`}
            stroke="#E5E7EB"
            strokeWidth={1}
          />
          <SvgText
            x={pad.left - 8}
            y={yScale(tick) + 4}
            textAnchor="end"
            fontSize={10}
            fill="#9CA3AF">
            {tick}
          </SvgText>
        </G>
      ))}

      {data.map((group, gi) =>
        group.values.map((bar, bi) => {
          const barH = ch * (bar.value / maxVal);
          const bx = pad.left + gi * barGroupWidth + barGap + bi * (barWidth + barGap);
          const by = yScale(bar.value);
          return (
            <G key={`${gi}-${bi}`}>
              <Rect
                x={bx}
                y={by}
                width={barWidth}
                height={barH}
                rx={4}
                ry={4}
                fill={bar.color}
              />
            </G>
          );
        }),
      )}

      {data.map((d, i) => {
        const cx = pad.left + i * barGroupWidth + barGroupWidth / 2;
        return (
          <SvgText
            key={i}
            x={cx}
            y={height - 5}
            textAnchor="middle"
            fontSize={10}
            fill="#6B7280"
            fontWeight="500">
            {d.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}
