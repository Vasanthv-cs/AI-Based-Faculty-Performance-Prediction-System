// Script to create admin account in Supabase
// Run with: node create-admin.js

const SUPABASE_URL = 'https://ygtlbwjerlhkxcgzezwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndGxid2plcmxoa3hjZ3plendyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjEwNTYsImV4cCI6MjA4ODY5NzA1Nn0.PgekDDLWWmmZFMe8h8ZGKU4GeHlfMEKT-et-tf-Nqjs';

const EMAIL = 'vasanthvvt@gmail.com';
const PASSWORD = 'Vasanth@123';
const FULL_NAME = 'Vasanth (Admin)';

async function createAdmin() {
  console.log('Step 1: Creating auth user...');

  // Sign up the user
  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  const signupData = await signupRes.json();

  if (!signupRes.ok || signupData.error) {
    console.error('Signup failed:', signupData.error || signupData);
    process.exit(1);
  }

  const userId = signupData.user?.id;
  if (!userId) {
    console.error('No user ID returned:', signupData);
    process.exit(1);
  }

  console.log(`✅ User created: ${userId}`);

  // Get the access token
  const accessToken = signupData.session?.access_token;
  if (!accessToken) {
    console.log('⚠️  No session returned (email confirmation may be required).');
    console.log('   Sign in manually and re-run this script to insert profile/role.');
    console.log('   User ID:', userId);
    return;
  }

  console.log('Step 2: Inserting profile...');
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      email: EMAIL,
      full_name: FULL_NAME,
    }),
  });

  if (!profileRes.ok) {
    const err = await profileRes.text();
    console.error('Profile insert failed:', err);
  } else {
    console.log('✅ Profile created');
  }

  console.log('Step 3: Inserting admin role...');
  const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      role: 'admin',
    }),
  });

  if (!roleRes.ok) {
    const err = await roleRes.text();
    console.error('Role insert failed:', err);
  } else {
    console.log('✅ Admin role assigned');
    console.log('\n🎉 Done! Login with:');
    console.log('   Email   :', EMAIL);
    console.log('   Password:', PASSWORD);
  }
}

createAdmin().catch(console.error);
