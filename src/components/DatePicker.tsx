import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';
import { useTranslation } from '@/hooks/use-translation';

// Lightweight, dependency-free calendar modal used by the farmer registration
// date-of-birth field. Built from RN primitives so it runs on Android, iOS and
// web identically. Dates are always produced in the backend-compatible
// YYYY-MM-DD format; impossible dates (e.g. 31 February) can never be picked
// because the grid only renders the real number of days for the visible month
// and leap years are handled by the Date constructor.
//
// The body only mounts while the modal is visible, so its state is reset to
// the stored value every time the picker opens — no effect-based reset needed.
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();
const firstWeekday = (year: number, month: number): number => new Date(year, month, 1).getDay();
const pad2 = (value: number): string => String(value).padStart(2, '0');

const parseInitial = (initialDate?: string): Date => {
  if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
    const date = new Date(`${initialDate}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
};

type DatePickerProps = {
  visible: boolean;
  initialDate?: string;
  onCancel: () => void;
  onConfirm: (isoDate: string) => void;
};

type CalendarBodyProps = {
  initialDate?: string;
  onCancel: () => void;
  onConfirm: (isoDate: string) => void;
};

function CalendarBody({ initialDate, onCancel, onConfirm }: CalendarBodyProps) {
  const colors = useColors();
  const { t } = useTranslation();

  const initial = parseInitial(initialDate);
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const totalDays = daysInMonth(year, month);
  const lead = firstWeekday(year, month);

  const changeMonth = (delta: number) => {
    setSelectedDay(null);
    setMonth((prev) => {
      let next = prev + delta;
      if (next < 0) {
        next = 11;
        setYear((y) => y - 1);
      } else if (next > 11) {
        next = 0;
        setYear((y) => y + 1);
      }
      return next;
    });
  };

  const changeYear = (delta: number) => {
    setSelectedDay(null);
    setYear((y) => Math.min(2100, Math.max(1900, y + delta)));
  };

  const handleConfirm = () => {
    if (selectedDay === null) return;
    onConfirm(`${year}-${pad2(month + 1)}-${pad2(selectedDay)}`);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(day);

  const { textPrimary, textSecondary, border } = colors.dashboard;
  const selectedStyle = { backgroundColor: colors.deepGreen, borderColor: colors.deepGreen };

  return (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]}>{t('selectDate')}</Text>
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={t('close')} hitSlop={8}>
          <Ionicons name="close" size={22} color={textSecondary} />
        </Pressable>
      </View>

      <View style={styles.navRow}>
        <Pressable onPress={() => changeMonth(-1)} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={textPrimary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: textPrimary }]}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={() => changeMonth(1)} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={textPrimary} />
        </Pressable>
      </View>

      <View style={styles.yearRow}>
        <Pressable onPress={() => changeYear(-10)} accessibilityRole="button" accessibilityLabel="Jump 10 years back" hitSlop={8} style={styles.yearBtn}>
          <Ionicons name="chevron-back" size={14} color={textSecondary} />
          <Ionicons name="chevron-back" size={14} color={textSecondary} style={styles.yearBtnIcon} />
        </Pressable>
        <Pressable onPress={() => changeYear(-1)} accessibilityRole="button" accessibilityLabel="Previous year" hitSlop={8} style={styles.yearBtn}>
          <Ionicons name="chevron-back" size={16} color={textSecondary} />
        </Pressable>
        <Text style={[styles.yearLabel, { color: textPrimary }]}>{year}</Text>
        <Pressable onPress={() => changeYear(1)} accessibilityRole="button" accessibilityLabel="Next year" hitSlop={8} style={styles.yearBtn}>
          <Ionicons name="chevron-forward" size={16} color={textSecondary} />
        </Pressable>
        <Pressable onPress={() => changeYear(10)} accessibilityRole="button" accessibilityLabel="Jump 10 years forward" hitSlop={8} style={styles.yearBtn}>
          <Ionicons name="chevron-forward" size={14} color={textSecondary} />
          <Ionicons name="chevron-forward" size={14} color={textSecondary} style={styles.yearBtnIcon} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((label) => (
          <Text key={label} style={[styles.weekLabel, { color: textSecondary }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) =>
          day === null ? (
            <View key={`blank-${index}`} style={styles.dayCell} />
          ) : (
            <Pressable
              key={`${year}-${month}-${day}`}
              onPress={() => setSelectedDay(day)}
              accessibilityRole="button"
              accessibilityState={selectedDay === day ? { selected: true } : undefined}
              accessibilityLabel={`${day} ${MONTHS[month]} ${year}`}
              style={[styles.dayCell, selectedDay === day && selectedStyle]}
            >
              <Text style={[styles.dayText, { color: textPrimary }, selectedDay === day && styles.dayTextSelected]}>
                {day}
              </Text>
            </Pressable>
          ),
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={t('cancel')}
          style={[styles.footerBtn, { borderColor: border }]}
        >
          <Text style={[styles.footerBtnText, { color: textSecondary }]}>{t('cancel')}</Text>
        </Pressable>
        <Pressable
          onPress={handleConfirm}
          disabled={selectedDay === null}
          accessibilityRole="button"
          accessibilityLabel={t('ok')}
          accessibilityState={{ disabled: selectedDay === null }}
          style={[styles.footerBtn, { backgroundColor: colors.deepGreen }, selectedDay === null && styles.disabled]}
        >
          <Text style={[styles.footerBtnText, styles.footerBtnPrimary]}>{t('ok')}</Text>
        </Pressable>
      </View>
    </>
  );
}

export default function DatePicker({ visible, initialDate, onCancel, onConfirm }: DatePickerProps) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
        <View
          style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}
          accessibilityViewIsModal
        >
          {visible && <CalendarBody initialDate={initialDate} onCancel={onCancel} onConfirm={onConfirm} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  yearBtn: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  yearBtnIcon: {
    marginLeft: -5,
  },
  yearLabel: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 6,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  footerBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  footerBtnPrimary: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
});