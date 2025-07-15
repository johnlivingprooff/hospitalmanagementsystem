# Update CSS paths in HTML files
$htmlFiles = Get-ChildItem -Path "." -Filter "*.html" | Where-Object { $_.Name -notlike "base*" -and $_.Name -notlike "Index*" }

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Update CSS references to use /css/ prefix
    $content = $content -replace 'href="([^"]*\.css)"', 'href="/css/$1"'
    $content = $content -replace 'href="/css//css/', 'href="/css/'
    $content = $content -replace 'href="/css//', 'href="/css/'
    
    # Update image references to use /images/ prefix
    $content = $content -replace 'src="([^"]*\.(png|jpg|jpeg|gif|svg))"', 'src="/images/$1"'
    $content = $content -replace 'src="/images//images/', 'src="/images/'
    $content = $content -replace 'src="/images//', 'src="/images/'
    
    Set-Content $file.FullName -Value $content
    Write-Host "Updated: $($file.Name)"
}

Write-Host "CSS and image paths updated in all HTML files."
