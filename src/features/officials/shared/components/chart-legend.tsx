import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/features/officials/shared/constants/theme';

type ChartLegendItem = {
  label: string;
  color: string;
};

type ChartLegendProps = {
  items: ChartLegendItem[];
};

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={styles.text}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    color: BrandColors.dashboard.textSecondary,
    fontWeight: '500',
  },
});
