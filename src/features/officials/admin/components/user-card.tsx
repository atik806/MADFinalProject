import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';
import { USER_CARD_AVATAR_COLORS } from '@/data';

type User = {
  id: string;
  name: string;
  role: 'Farmer' | 'Field Officer' | 'Bank Officer';
  location: string;
  crop: string;
  status: 'verified' | 'pending' | 'rejected';
};

type UserCardProps = {
  user: User;
  onView?: (user: User) => void;
  onEdit?: (user: User) => void;
  onDeactivate?: (user: User) => void;
};

type StatusIcon = 'checkmark-circle' | 'time' | 'close-circle';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return USER_CARD_AVATAR_COLORS[Math.abs(hash) % USER_CARD_AVATAR_COLORS.length];
}

export function UserCard({ user, onView, onEdit, onDeactivate }: UserCardProps) {
  const colors = useColors();

  const STATUS_CONFIG: Record<string, { bg: string; text: string; color: string; icon: StatusIcon }> = {
    verified: { bg: colors.userVerified, text: 'Verified', color: colors.userVerifiedText, icon: 'checkmark-circle' },
    pending: { bg: colors.userPending, text: 'Pending', color: colors.userPendingText, icon: 'time' },
    rejected: { bg: colors.userRejected, text: 'Rejected', color: colors.userRejectedText, icon: 'close-circle' },
  };

  const status = STATUS_CONFIG[user.status];
  const avatarColor = getAvatarColor(user.id);

  return (
    <View style={[styles.card, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.userBorder }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { backgroundColor: avatarColor + '18' }]}>
            <Text style={[styles.avatarText, { color: avatarColor }]}>{getInitials(user.name)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.dashboard.textPrimary }]}>{user.name}</Text>
            <Text style={[styles.userMeta, { color: colors.dashboard.textSecondary }]}>
              <Ionicons name="location-outline" size={12} color={colors.dashboard.textSecondary} /> {user.location}
              {'  '}·{'  '}
              {user.crop}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.userView }, pressed && styles.actionPressed]}
          onPress={() => onView?.(user)}>
          <Ionicons name="eye-outline" size={14} color={colors.userViewText} />
          <Text style={[styles.actionLabel, { color: colors.userViewText }]}>View</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.userEdit }, pressed && styles.actionPressed]}
          onPress={() => onEdit?.(user)}>
          <Ionicons name="create-outline" size={14} color={colors.userEditText} />
          <Text style={[styles.actionLabel, { color: colors.userEditText }]}>Edit</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.userDeactivate }, pressed && styles.actionPressed]}
          onPress={() => onDeactivate?.(user)}>
          <Ionicons name="ban-outline" size={14} color={colors.userDeactivateText} />
          <Text style={[styles.actionLabel, { color: colors.userDeactivateText }]}>Deactivate</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  userMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
