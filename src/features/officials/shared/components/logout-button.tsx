import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

type LogoutButtonProps = {
  onPress: () => void;
};

export function LogoutButton({ onPress }: LogoutButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityLabel="Logout"
      accessibilityRole="button">
      <Ionicons name="log-out-outline" size={20} color="#EF4444" />
      <Text style={styles.text}>Logout</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  pressed: {
    backgroundColor: '#FEE2E2',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
});
