$projectId = "ygtlbwjerlhkxcgzezwr"
$token = "sbp_506f190da9811a63c926fff784c2cc36c6fb9214"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

$sql = @"
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'faculty'::app_role
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = u.id AND ur.role = 'faculty'::app_role
);
"@

$body = @{ query = $sql } | ConvertTo-Json -Depth 10
try {
    $r = Invoke-RestMethod -Method POST `
        -Uri "https://api.supabase.com/v1/projects/$projectId/database/query" `
        -Headers $headers `
        -Body $body
    Write-Host "user_roles sync: OK"
    $r | ConvertTo-Json | Write-Host
} catch {
    Write-Host "user_roles sync FAILED: $($_.ErrorDetails.Message)"
}
