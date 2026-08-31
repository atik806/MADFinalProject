import { supabase } from '../../../config/supabase';

export const getNotifications = async (userId?: string) => {
  if (!userId) {
    throw new Error('Unauthorized');
  }
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('id', notificationId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const deleteNotification = async (userId: string, notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('id', notificationId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
