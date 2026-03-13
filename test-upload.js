const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://ygtlbwjerlhkxcgzezwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndGxid2plcmxoa3hjZ3plendyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjEwNTYsImV4cCI6MjA4ODY5NzA1Nn0.PgekDDLWWmmZFMe8h8ZGKU4GeHlfMEKT-et-tf-Nqjs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    console.log("Buckets:", buckets?.map(b => b.name) || bucketError);

    // Provide the credentials from earlier session: hosurvvv@gmail.com / .......... 
    // since we do not know password, let's just make sure list buckets works.

  } catch(e) {
      console.error(e);
  }
}

testUpload();
