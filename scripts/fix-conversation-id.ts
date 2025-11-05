import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyFix() {
  try {
    console.log('🔧 Applying fix for null conversation_id...');
    
    const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '018_fix_null_conversation_id.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct execution
      const { error: directError } = await supabase
        .from('_sql')
        .insert({ query: sql });
        
      if (directError) {
        console.error('❌ Error applying fix:', directError);
        process.exit(1);
      }
    }
    
    console.log('✅ Fix applied successfully!');
    console.log('The trigger now validates conversation_id before inserting messages.');
  } catch (error) {
    console.error('❌ Failed to apply fix:', error);
    process.exit(1);
  }
}

applyFix();
