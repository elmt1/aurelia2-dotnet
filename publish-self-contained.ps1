param(
    [string]$Configuration = 'Release',
    [string]$Runtime = 'win-x64',
    [string]$OutputDir = ''
)

$ErrorActionPreference = 'Stop'

$restorePSNativeCommandUseErrorActionPreference = $false
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction Ignore) {
    $originalPSNativeCommandUseErrorActionPreference = $PSNativeCommandUseErrorActionPreference
    $PSNativeCommandUseErrorActionPreference = $false
    $restorePSNativeCommandUseErrorActionPreference = $true
}

$repoRoot = $PSScriptRoot
$clientDir = Join-Path $repoRoot 'src\client'
$apiProject = Join-Path $repoRoot 'src\Aurelia2.DotNet.Web.Api\Aurelia2.DotNet.Web.Api.csproj'
$clientDistDir = Join-Path $clientDir 'dist'
$defaultOutputDir = Join-Path $PSScriptRoot 'artifacts\publish\self-contained'
$publishDir = if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    Join-Path $defaultOutputDir $Runtime
}
else {
    $OutputDir
}
$publishDir = [System.IO.Path]::GetFullPath($publishDir)
$publishWwwrootDir = Join-Path $publishDir 'wwwroot'

Write-Host "Publishing Aurelia2.DotNet.Web.Api as a self-contained install..."
Write-Host "Configuration: $Configuration"
Write-Host "Runtime: $Runtime"
Write-Host "Output: $publishDir"
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    Write-Host "OutputDir parameter not supplied. Using default runtime-specific folder under: $defaultOutputDir"
}
else {
    Write-Host "OutputDir parameter supplied. Using exact publish folder: $publishDir"
}

try {

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
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE"
    }

    Write-Host 'Building client...'
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed with exit code $LASTEXITCODE"
    }
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

if (-not (Test-Path $publishDir)) {
    throw "Publish output directory was not created: $publishDir"
}

if (-not (Test-Path $publishWwwrootDir)) {
    throw "Published wwwroot directory was not created: $publishWwwrootDir"
}

$exePath = Join-Path $publishDir 'Aurelia2.DotNet.Web.Api.exe'
$dllPath = Join-Path $publishDir 'Aurelia2.DotNet.Web.Api.dll'

if (-not (Test-Path $dllPath)) {
    throw "Published DLL not found: $dllPath"
}

Write-Host ''
Write-Host 'Publish complete.'
if (Test-Path $exePath) {
    Write-Host "Executable: $exePath"
}
if (Test-Path $dllPath) {
    Write-Host "DLL: $dllPath"
}
Write-Host "Static files: $publishWwwrootDir"

}
finally {
    if ($restorePSNativeCommandUseErrorActionPreference) {
        $PSNativeCommandUseErrorActionPreference = $originalPSNativeCommandUseErrorActionPreference
    }
}
