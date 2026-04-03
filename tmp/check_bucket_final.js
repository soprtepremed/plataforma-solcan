import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBucketExistence() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: "SELECT id FROM storage.buckets WHERE id = 'avatars';"
  });
  if (error) {
    console.error('Error querying buckets:', error.message);
  } else {
    // If it returns null, it might be because exec_sql is void.
    // I'll try to use a function that returns something.
    console.log('Query executed successfully');
  }
}

checkBucketExistence();
