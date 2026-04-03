import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function bootstrap() {
  const queries = [
    'ALTER TABLE empleados ADD COLUMN IF NOT EXISTS foto_url TEXT;',
    `INSERT INTO storage.buckets (id, name, public) 
     VALUES ('avatars', 'avatars', true) 
     ON CONFLICT (id) DO NOTHING;`,
    // RLS policy: allow anyone to select avatars
    `CREATE POLICY "Allow public select on avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');`,
    // RLS policy: allow authenticated users to insert their own avatar
    `CREATE POLICY "Allow authenticated users to upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');`,
    // RLS policy: allow users to update their own avatar
    `CREATE POLICY "Allow users to update their own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');`
  ];

  for (const query of queries) {
    console.log(`Running: ${query}`);
    const { error } = await supabase.rpc('exec_sql', { query_text: query });
    if (error) {
      console.error(`Error executing query: ${error.message}`);
    } else {
      console.log('Success');
    }
  }
}

bootstrap();
