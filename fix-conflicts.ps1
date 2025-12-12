# Remove merge conflict markers by keeping HEAD version
$files = Get-ChildItem -Path "c:\Users\gacoki\Music\ecomerce\e-comerce" -Recurse -Include *.ts,*.tsx -File

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Check if file contains merge conflict markers
    if ($content -match '<<<<<<< HEAD') {
        Write-Host "Processing: $($file.Name)"
        
        # Pattern to match the entire conflict block and keep only HEAD version
        # This regex matches from <<<<<<< HEAD to >>>>>>> and keeps the HEAD section
        $pattern = '<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> [^\r\n]+'
        $replacement = '$1'
        $newContent = $content -replace $pattern, $replacement
        
        # Save back to file
        $newContent | Set-Content -Path $file.FullName -NoNewline
        Write-Host "  Fixed!"
    }
}

Write-Host "Done!"
