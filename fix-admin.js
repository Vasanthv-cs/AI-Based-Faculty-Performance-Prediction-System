// Script to sign in as existing user and fix profile + admin role
// Run with: node fix-admin.js

const SUPABASE_URL = 'https://ygtlbwjerlhkxcgzezwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndGxid2plcmxoa3hjZ3plendyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjEwNTYsImV4cCI6MjA4ODY5NzA1Nn0.PgekDDLWWmmZFMe8h8ZGKU4GeHlfMEKT-et-tf-Nqjs';

const EMAIL = 'vasanthvvt@gmail.com';
const PASSWORD = 'Vasanth@123';

async function fixAdmin() {
  console.log('Step 1: Signing in with existing account...');

  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  const loginData = await loginRes.json();

  if (!loginRes.ok || loginData.error) {
    console.error('Login failed:', loginData.error || loginData);
    console.log('\n⚠️  If login fails, the password may have changed or email needs confirmation.');
    process.exit(1);
  }

  const userId = loginData.user?.id;
  const accessToken = loginData.access_token;

  if (!userId || !accessToken) {
    console.error('No user ID or token returned:', loginData);
    process.exit(1);
  }

  console.log(`✅ Signed in as: ${userId}`);

  console.log('Step 2: Upserting profile...');
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      email: EMAIL,
      full_name: 'Vasanth (Admin)',
    }),
  });

  if (!profileRes.ok) {
    const err = await profileRes.text();
    console.error('Profile upsert failed:', err);
  } else {
    console.log('✅ Profile ready');
  }

  console.log('Step 3: Upserting admin role...');
  const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      role: 'admin',
    }),
  });

  if (!roleRes.ok) {
    const err = await roleRes.text();
    console.error('Role upsert failed:', err);
  } else {
    console.log('✅ Admin role assigned');
    console.log('\n🎉 Done! You can now login with:');
    console.log('   Email   :', EMAIL);
    console.log('   Password:', PASSWORD);
    console.log('   Role    : admin');
  }
}

fixAdmin().catch(console.error);
