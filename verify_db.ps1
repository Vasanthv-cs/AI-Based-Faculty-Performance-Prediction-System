$projectId = "ygtlbwjerlhkxcgzezwr"
$token = "sbp_506f190da9811a63c926fff784c2cc36c6fb9214"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

function Run-SQL($sql) {
    $body = @{ query = $sql } | ConvertTo-Json -Depth 10
    try {
        $r = Invoke-RestMethod -Method POST `
            -Uri "https://api.supabase.com/v1/projects/$projectId/database/query" `
            -Headers $headers `
            -Body $body
        return ($r | ForEach-Object { $_ | ConvertTo-Json -Compress })
    } catch {
        return "ERROR: $($_.ErrorDetails.Message)"
    }
}

$out = @()
$out += "PROFILES_COUNT: " + (Run-SQL "SELECT COUNT(*) as c FROM public.profiles;")
$out += "ROLES_COUNT: " + (Run-SQL "SELECT role, COUNT(*) as c FROM public.user_roles GROUP BY role;")
$out += "TABLES: " + (Run-SQL "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('teaching_learning_activities','memberships_fdp','research_activities','events_contributions','patents_guidance','projects_consultancy','networking_contributions','appraisal_cycles','announcements') ORDER BY table_name;")
$out += "STORAGE: " + (Run-SQL "SELECT id, name, public FROM storage.buckets WHERE id = 'faculty-files';")
$out | Set-Content "verify_results.txt"
$out
