Add-Type -AssemblyName System.Drawing
$src = Join-Path $PSScriptRoot '..\assets\logo-cary.png'
$dst = Join-Path $PSScriptRoot '..\assets\logo-cary.jpg'
$img = [System.Drawing.Image]::FromFile($src)
$targetH = 56
$targetW = [int][Math]::Round($img.Width * ($targetH / $img.Height))
$bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $targetW, $targetH)
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 92L)
$bmp.Save($dst, $enc, $ep)
$img.Dispose()
$bmp.Dispose()
$g.Dispose()
Write-Host "OK $dst $targetW x $targetH"
