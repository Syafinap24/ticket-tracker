# ==============================================================================
# Lightweight Native PowerShell HTTP Server for Ticket Tracker
# Zero external runtime needed (No Node.js, Python, or Apache required!)
# ==============================================================================

param(
    [int]$Port = 8080,
    [string]$Root = $PSScriptRoot
)

if (-not $Root) {
    $Root = (Get-Location).Path
}

# Resolve local IP address
$ip = "localhost"
try {
    $netConfig = ipconfig | Out-String
    if ($netConfig -match "IPv4 Address[.\s]+:\s+([0-9.]+)") {
        $ip = $matches[1]
    }
} catch {
    $ip = "127.0.0.1"
}

# MIME Types Dictionary
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".csv"  = "text/csv; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".txt"  = "text/plain; charset=utf-8"
}

# Create TcpListener
try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
} catch {
    $Port = $Port + 1
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "    📡 TICKET TRACKER & NOC WEB SERVER TELAH BERJALAN           " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " [Laptop] Buka di browser laptop :" -NoNewline
Write-Host " http://localhost:$Port" -ForegroundColor Yellow
Write-Host " [HP]     Buka di browser HP     :" -NoNewline
Write-Host " http://$($ip):$Port" -ForegroundColor Yellow
Write-Host ""
Write-Host " * Pastikan HP dan Laptop terhubung ke jaringan Wi-Fi yang sama." -ForegroundColor DarkGray
Write-Host " * Tekan Ctrl+C di terminal ini untuk menghentikan server." -ForegroundColor DarkGray
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        
        $buffer = New-Object byte[] 4096
        $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -le 0) {
            $client.Close()
            continue
        }
        
        $requestText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
        $firstLine = $requestText.Split("`r`n")[0]
        $tokens = $firstLine.Split(" ")
        
        if ($tokens.Length -ge 2) {
            $method = $tokens[0]
            $urlPath = $tokens[1].Split("?")[0]
            if ($urlPath -eq "/" -or [string]::IsNullOrWhiteSpace($urlPath)) {
                $urlPath = "/index.html"
            }
            
            # Map URL path to local file path
            $relPath = $urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $fullFilePath = [System.IO.Path]::Combine($Root, $relPath)
            
            if ([System.IO.File]::Exists($fullFilePath)) {
                $ext = [System.IO.Path]::GetExtension($fullFilePath).ToLower()
                $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                $fileBytes = [System.IO.File]::ReadAllBytes($fullFilePath)
                
                $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($fileBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($fileBytes, 0, $fileBytes.Length)
                $stream.Flush()
            } else {
                $notFoundMsg = "<h1>404 Not Found</h1><p>File $urlPath tidak ditemukan.</p>"
                $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes($notFoundMsg)
                $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($notFoundBytes.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($notFoundBytes, 0, $notFoundBytes.Length)
                $stream.Flush()
            }
        }
        
        $client.Close()
    }
} finally {
    $listener.Stop()
    Write-Host "Server dihentikan." -ForegroundColor Red
}
