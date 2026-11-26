param(
    [int]$Port = 8765,
    [string]$Root = $PSScriptRoot
)

$rootFull = [System.IO.Path]::GetFullPath($Root)
if (-not $rootFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $rootFull += [System.IO.Path]::DirectorySeparatorChar
}

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.pdf'  = 'application/pdf'
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Serving with Windows PowerShell at http://localhost:$Port/index.html"
Write-Host "Keep this window open while using Quote Maker. Press Ctrl+C or close to stop."

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

            while ($true) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($line)) { break }
            }

            $parts = $requestLine.Split(' ')
            $rawUrl = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
            $pathOnly = $rawUrl.Split('?')[0]
            $rel = [System.Uri]::UnescapeDataString($pathOnly).TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
            $rel = $rel.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $fullPath = [System.IO.Path]::GetFullPath((Join-Path $rootFull $rel))

            if ($fullPath.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -and
                (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
                $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
                $ctype = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
                $body = [System.IO.File]::ReadAllBytes($fullPath)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: $ctype`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
            } else {
                $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
                $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
            }

            $hBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($body, 0, $body.Length)
            $stream.Flush()
        } catch {
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
