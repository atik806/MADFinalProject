import { supabase } from '../../../config/supabase';

export interface RegisterInput {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}
//this is for the register farmer 
export const registerFarmer = async ({ email, password, full_name, phone }: RegisterInput) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone, role: 'farmer' },
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

//this is for login farmer

export const loginFarmer = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
