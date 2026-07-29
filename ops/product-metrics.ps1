[CmdletBinding()]
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SqlPath = Join-Path $PSScriptRoot "product-metrics.sql"
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content $SqlPath) -join " "

$Output = & $Wrangler d1 execute site-hodoki $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) {
    throw "D1 metrics query failed with exit code $LASTEXITCODE"
}

$Payload = ($Output -join [Environment]::NewLine) | ConvertFrom-Json
$Row = $Payload[0].results[0]
if (-not $Row) {
    throw "D1 metrics query returned no result"
}

function Get-Percent {
    param([int]$Numerator, [int]$Denominator)
    if ($Denominator -eq 0) { return $null }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}

$Users = [int]$Row.users
$Inspectors = [int]$Row.inspectors
$Exporters = [int]$Row.exporters

[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "site-hodoki"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = $Users
        inspectors = $Inspectors
        inspections = [int]$Row.inspections
        exporters = $Exporters
        json_exporters = [int]$Row.json_exporters
        html_exporters = [int]$Row.html_exporters
        returned = [int]$Row.returned
        users_7d = [int]$Row.users_7d
        inspectors_7d = [int]$Row.inspectors_7d
    }
    rates = [ordered]@{
        inspection_percent = Get-Percent $Inspectors $Users
        export_percent = Get-Percent $Exporters $Inspectors
        return_percent = Get-Percent ([int]$Row.returned) $Users
    }
} | ConvertTo-Json -Depth 4
