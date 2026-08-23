import { supabase } from '../../../config/supabase';

const BUCKET = 'farmer-documents';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const FOLDERS: Record<string, string> = {
  profile: 'profiles',
  nid: 'nids',
  land: 'lands',
};

const ensureBucket = async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  await supabase.storage.createBucket(BUCKET, { public: true });
};

export const uploadPhoto = async (file: Express.Multer.File, type: string): Promise<string> => {
  if (!file || !file.buffer) {
    throw new Error('No file provided');
  }

  await ensureBucket();

  const ext = EXTENSIONS[file.mimetype] ?? 'jpg';
  const folder = FOLDERS[type] ?? 'misc';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};
