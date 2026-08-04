import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qrlzgojxzbcjswpfaoto.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybHpnb2p4emJjanN3cGZhb3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTgyODc4OCwiZXhwIjoyMTAxNDA0Nzg4fQ.9oBsxZNTHcZWE7FBVAYqk45-vzCxZRpkYs8c0jJdJFI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
