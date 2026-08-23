import { supabase } from '../../../config/supabase';

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const updateProfile = async (userId: string, profileData: Record<string, any>) => {
  const payload = {
    id: userId,
    ...profileData,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
