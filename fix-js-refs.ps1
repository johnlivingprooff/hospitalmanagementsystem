# Update JavaScript references in HTML files to use CDN
$htmlFiles = Get-ChildItem -Path "." -Filter "*.html" | Where-Object { $_.Name -notlike "base*" }

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace local JS references with CDN
    $content = $content -replace '<script src="jquery-3\.4\.1\.js"></script>', '<script src="https://code.jquery.com/jquery-3.4.1.min.js"></script>'
    $content = $content -replace '<script src="bootstrap\.min\.js"></script>', '<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js"></script>'
    $content = $content -replace '<script src="all\.min\.js"></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/js/all.min.js"></script>'
    $content = $content -replace '<script src="datatables\.min\.js"></script>', '<script src="https://cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>'
    
    # Fix the incorrect image path
    $content = $content -replace '/images/assets/static/placeholder-face-big\.png', '/images/placeholder-face-big.png'
    
    Set-Content $file.FullName -Value $content
    Write-Host "Updated: $($file.Name)"
}

Write-Host "All HTML files updated with CDN references."
