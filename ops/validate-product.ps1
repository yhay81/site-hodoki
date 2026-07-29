[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PagesPath = Join-Path $RepoRoot "src\ui\pages.tsx"
$ProductPath = Join-Path $RepoRoot "src\config\product.ts"
$WorkerPath = Join-Path $RepoRoot "src\worker.tsx"
$MigrationPath = Join-Path $RepoRoot "migrations\0001_product_events.sql"
$PublicDirectory = Join-Path $RepoRoot "public"
$Pages = Get-Content -Raw -LiteralPath $PagesPath
$Product = Get-Content -Raw -LiteralPath $ProductPath
$Worker = Get-Content -Raw -LiteralPath $WorkerPath
$Migration = Get-Content -Raw -LiteralPath $MigrationPath

if ($Pages.Contains('data-template-surface="replace-before-release"')) {
    throw "Replace the starter workspace before release"
}
if ($Pages.Contains('class="hero"') -or $Pages.Contains('class="product-flow"')) {
    throw "Text-led hero and generic product-flow sections are not releaseable"
}
if (-not $Pages.Contains("unravel-stage") -or -not $Pages.Contains('id="inspect-form"')) {
    throw "Expected the product-specific unravel visualization and inspection workspace"
}
if (-not $Pages.Contains('id="result"') -or -not $Pages.Contains('id="map-branches"')) {
    throw "Expected the portable map result workspace"
}
if ($Pages -match '(?i)public validation|success criteria|experiment|仮説|成功条件') {
    throw "Research copy must not appear on the product surface"
}
if (
    -not $Worker.Contains('normalized.endsWith(".amebaownd.com")') -or
    -not $Worker.Contains("robotsAllows") -or
    -not $Worker.Contains("maximumHtmlBytes")
) {
    throw "Expected strict Ownd host, robots and response-size controls"
}
if ($Migration -match '(?i)source.?url|site.?title|heading|description|content') {
    throw "Product event storage must not contain source URLs or inspected content"
}
if ($Product.Contains('"kairan-to"') -or $Product.Contains('"回覧灯"')) {
    throw "Replace the previous product identity before release"
}

$OgPath = Join-Path $PublicDirectory "og.svg"
if (-not (Test-Path -LiteralPath $OgPath) -or (Get-Item -LiteralPath $OgPath).Length -lt 3000) {
    throw "Expected a product-specific OG SVG larger than 3 KB"
}

$KeyFiles = @(
    Get-ChildItem -LiteralPath $PublicDirectory -File |
        Where-Object { $_.Name -match "^[a-zA-Z0-9-]{8,128}\.txt$" }
)
if ($KeyFiles.Count -ne 1) {
    throw "Expected exactly one generated IndexNow key file, found $($KeyFiles.Count)"
}
$Key = (Get-Content -Raw -LiteralPath $KeyFiles[0].FullName).Trim()
if ($Key -ne $KeyFiles[0].BaseName) {
    throw "IndexNow key file name and content do not match"
}

Write-Output "Product release contract is satisfied"
