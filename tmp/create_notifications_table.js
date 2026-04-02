import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS notificaciones (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES empleados(id),
        role TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Habilitar RLS
    ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

    -- Política simple para permitir lectura/escritura (en este entorno de desarrollo)
    CREATE POLICY "Permitir todo" ON notificaciones FOR ALL USING (true) WITH CHECK (true);
    `;

    const { error } = await supabase.rpc('exec_sql', { query_text: sql });

    if (error) {
        console.error('Error creating table:', error.message);
    } else {
        console.log('Notifications table created successfully.');
    }
}

createTable();
