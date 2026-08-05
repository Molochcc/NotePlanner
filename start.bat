@echo off
chcp 65001 >nul
cd /d "%~dp0"

set NODE_DIR=C:\Users\Moloch\.workbuddy\binaries\node\versions\22.22.2
set PATH=%NODE_DIR%;%PATH%
set ELECTRON_MIRROR=https://registry.npmmirror.com/-/binary/electron/

if not exist "node_modules\electron\dist\electron.exe" (
    echo Installing Electron...
    call "%NODE_DIR%\npm.cmd" install electron --save-dev
)

if not exist "node_modules\electron\path.txt" (
    <nul set /p ="electron.exe" > "node_modules\electron\path.txt"
)

call "node_modules\.bin\electron.cmd" .
