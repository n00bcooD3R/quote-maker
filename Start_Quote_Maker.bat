@echo off
setlocal
cd /d "%~dp0"
set PORT=8765
set URL=http://localhost:%PORT%/index.html

echo Starting STDA Quote Maker on %URL% ...

:: If already running on this port, just open the browser
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', %PORT%); $c.Close(); exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
    echo Quote Maker is already running. Opening browser...
    start "" %URL%
    exit /b 0
)

:: Open browser shortly after starting server
start "" /b cmd /c "timeout /t 1 /nobreak >nul & start "" %URL%"

:: Prefer Python if installed, otherwise fallback to Node.js
where python >nul 2>nul
if %errorlevel%==0 (
    echo Serving with Python. Keep this window open while using Quote Maker.
    python -m http.server %PORT% --bind 127.0.0.1
    goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
    echo Serving with Python Launcher. Keep this window open while using Quote Maker.
    py -3 -m http.server %PORT% --bind 127.0.0.1
    goto :eof
)

where node >nul 2>nul
if %errorlevel%==0 (
    echo Serving with Node.js. Keep this window open while using Quote Maker.
    node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'};http.createServer((req,res)=>{const rel=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\/+/,'')||'index.html';const f=path.resolve(root,rel);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(f).toLowerCase()]||'application/octet-stream'});fs.createReadStream(f).pipe(res);}).listen(%PORT%,'127.0.0.1',()=>console.log('Listening on %URL%'));"
    goto :eof
)

echo Neither Python nor Node.js was found on PATH.
echo Please install Python or Node.js, or open the GitHub Pages URL in Chrome/Edge.
pause
