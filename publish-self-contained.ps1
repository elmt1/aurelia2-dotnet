param(
    [string]$Configuration = 'Release',
    [string]$Runtime = 'win-x64',
    [string]$OutputDir = (Join-Path $PSScriptRoot 'artifacts\publish\self-contained')
)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$clientDir = Join-Path $repoRoot 'src\client'
$apiProject = Join-Path $repoRoot 'src\Aurelia2.DotNet.Web.Api\Aurelia2.DotNet.Web.Api.csproj'
$clientDistDir = Join-Path $clientDir 'dist'
$publishDir = Join-Path $OutputDir $Runtime
$publishWwwrootDir = Join-Path $publishDir 'wwwroot'

Write-Host "Publishing Aurelia2.DotNet.Web.Api as a self-contained install..."
Write-Host "Configuration: $Configuration"
Write-Host "Runtime: $Runtime"
Write-Host "Output: $publishDir"

if (-not (Test-Path $apiProject)) {
    throw "API project not found: $apiProject"
}

if (-not (Test-Path $clientDir)) {
    throw "Client directory not found: $clientDir"
}

Push-Location $clientDir
try {
    Write-Host 'Installing client dependencies...'
    npm install

    Write-Host 'Building client...'
    npm run build
}
finally {
    Pop-Location
}

if (-not (Test-Path $clientDistDir)) {
    throw "Client build output not found: $clientDistDir"
}

if (Test-Path $publishDir) {
    Write-Host 'Cleaning existing publish output...'
    Remove-Item -Recurse -Force $publishDir
}

Write-Host 'Publishing API...'
& dotnet publish $apiProject -c $Configuration --self-contained --runtime $Runtime --output $publishDir

if ($LASTEXITCODE -ne 0) {
    throw "dotnet publish failed with exit code $LASTEXITCODE"
}

Write-Host 'Copying client assets into published wwwroot...'
New-Item -ItemType Directory -Path $publishWwwrootDir -Force | Out-Null
Copy-Item (Join-Path $clientDistDir '*') $publishWwwrootDir -Recurse -Force

$exePath = Join-Path $publishDir 'Aurelia2.DotNet.Web.Api.exe'
$dllPath = Join-Path $publishDir 'Aurelia2.DotNet.Web.Api.dll'

Write-Host ''
Write-Host 'Publish complete.'
if (Test-Path $exePath) {
    Write-Host "Executable: $exePath"
}
if (Test-Path $dllPath) {
    Write-Host "DLL: $dllPath"
}
Write-Host "Static files: $publishWwwrootDir"
