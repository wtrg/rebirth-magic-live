$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    $revision = git rev-parse --short HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Cannot identify the source commit.' }
    $changes = git status --porcelain
    if ($LASTEXITCODE -ne 0 -or $changes) { throw 'Package from a clean checkout.' }

    $name = "RE-BIRTH-WINDOWS-MOCK-$revision"
    $output = Join-Path $root 'test-results'
    $archive = Join-Path $output "$name.zip"
    if (Test-Path -LiteralPath $archive) { throw "Archive already exists: $archive" }

    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }

    $temporary = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString()))
    try {
        $stage = Join-Path $temporary.FullName $name
        New-Item -ItemType Directory -Path "$stage/node_modules" -Force | Out-Null
        $runtimeFiles = git ls-files -- 'apps/server/*.ts' 'packages/combat/*.ts' 'packages/shared/*.ts' 'packages/tiktok-adapter/*.ts'
        if ($LASTEXITCODE -ne 0 -or !$runtimeFiles) { throw 'Cannot enumerate runtime source files.' }
        foreach ($file in $runtimeFiles) {
            $destination = Join-Path $stage $file
            New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
            Copy-Item -LiteralPath $file -Destination $destination
        }
        Copy-Item -LiteralPath 'node_modules/ws' -Destination "$stage/node_modules/ws" -Recurse
        Copy-Item -LiteralPath 'dist', 'package.json', 'LICENSE', 'THIRD_PARTY.md' -Destination $stage -Recurse
        @'
@echo off
setlocal
cd /d "%~dp0"
set "REBIRTH_MODE=mock"
set "DB_PATH=data\mock.sqlite"
set "PORT=4273"
set "REBIRTH_RECORD_REPLAY=0"
echo Operator: http://127.0.0.1:4273/
echo OBS preview: http://127.0.0.1:4273/?overlay=1^&fire-preview=1^&boss-preview=1
node apps/server/index.ts
if errorlevel 1 pause
'@ | Set-Content -LiteralPath "$stage/start-mock.cmd" -Encoding Ascii
        @"
# RE:BIRTH Windows MOCK

Source commit: $revision

Requires Node.js 24 on Windows. Extract the whole archive, run start-mock.cmd,
and open the operator URL printed in the terminal. The OBS URL enables both
optional models and is intended for a 1080 x 1920 Browser Source.

The launcher creates data/mock.sqlite in the extracted directory. Once Node
is installed, MOCK play needs no internet connection or account. Stop with Ctrl+C.
"@ | Set-Content -LiteralPath "$stage/START.md" -Encoding Ascii
        New-Item -ItemType Directory -Path $output -Force | Out-Null
        $stagedArchive = Join-Path $temporary.FullName "$name.zip"
        Compress-Archive -LiteralPath $stage -DestinationPath $stagedArchive
        Move-Item -LiteralPath $stagedArchive -Destination $archive
        Get-FileHash -LiteralPath $archive -Algorithm SHA256
    } finally {
        $resolved = (Resolve-Path -LiteralPath $temporary.FullName).Path
        if ($resolved -eq $temporary.FullName) {
            Remove-Item -LiteralPath $resolved -Recurse -Force
        }
    }
} finally {
    Pop-Location
}
