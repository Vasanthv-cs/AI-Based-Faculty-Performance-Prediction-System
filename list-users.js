import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ygtlbwjerlhkxcgzezwr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndGxid2plcmxoa3hjZ3plendyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjEwNTYsImV4cCI6MjA4ODY5NzA1Nn0.PgekDDLWWmmZFMe8h8ZGKU4GeHlfMEKT-et-tf-Nqjs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function getUsers() {
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role')
  
  if (rolesError) {
    console.error('Error fetching roles:', rolesError)
    return
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return
  }

  const users = profiles.map(p => {
    const role = roles.find(r => r.user_id === p.user_id)
    return {
      email: p.email,
      name: p.full_name,
      role: role ? role.role : 'unknown'
    }
  })

  console.log(JSON.stringify(users, null, 2))
}

getUsers()
