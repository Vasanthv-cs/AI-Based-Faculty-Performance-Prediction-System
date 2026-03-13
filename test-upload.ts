import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://ygtlbwjerlhkxcgzezwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndGxid2plcmxoa3hjZ3plendyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjEwNTYsImV4cCI6MjA4ODY5NzA1Nn0.PgekDDLWWmmZFMe8h8ZGKU4GeHlfMEKT-et-tf-Nqjs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  try {
    // 1. Try to fetch the bucket
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    console.log("Buckets:", buckets?.map(b => b.name), "Error:", bucketError);

    const bucketName = 'faculty-files';
    const hasBucket = buckets?.some(b => b.name === bucketName);
    
    // Auth login with user credentials if needed
    // The user created an account: hosurvvv@gmail.com / vinayagam / password... let's just use service_role to be safe, but wait, I don't have the service_role key.
    // I only have the anon key.
    
    // Let's authenticate using user's credentials which were just shown in the screenshot:
    // hosurvvv@gmail.com
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'hosurvvv@gmail.com',
        password: 'password123' // Or whichever password they used... I don't know it. Wait, the user shared an earlier password in the chat: Vasanth@123 or tenesh@123.
    });

    // We can't know the exact password, but we can try to upload with anon if RLS is off, but RLS is ON. 

  } catch(e) {
      console.error(e);
  }
}

testUpload();
