[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Agent,

  [Parameter(Mandatory = $true)]
  [ValidateSet("completed", "partial", "blocked", "reviewed")]
  [string]$Status,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Summary,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$NextAction,

  [string[]]$Validation = @("Not recorded")
)

$ErrorActionPreference = "Stop"
$repoRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
  throw "Run this script inside the Countdown 31 Git repository."
}

$branch = (& git -C $repoRoot branch --show-current).Trim()
$commit = (& git -C $repoRoot rev-parse --short HEAD).Trim()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
$validationText = ($Validation | Where-Object { $_ } | ForEach-Object { "  - $_" }) -join "`n"
if (-not $validationText) {
  $validationText = "  - Not recorded"
}

$handoffPath = Join-Path $repoRoot "docs/AI_HANDOFF.md"
$worklogPath = Join-Path $repoRoot "docs/AI_WORKLOG.md"
if (-not (Test-Path -LiteralPath $handoffPath)) {
  throw "Missing docs/AI_HANDOFF.md. Restore it before recording a handoff."
}

$checkpoint = @"
<!-- AI-HANDOFF:START -->
## Latest checkpoint

- **Updated:** $timestamp
- **Outgoing agent:** $Agent
- **Status:** $Status
- **Branch:** ``$branch``
- **Last verified commit:** ``$commit``
- **Summary:** $Summary
- **Validation:** $($Validation -join "; ")
- **Exact next action:** $NextAction
<!-- AI-HANDOFF:END -->
"@

$handoff = Get-Content -LiteralPath $handoffPath -Raw
$markerPattern = "(?s)<!-- AI-HANDOFF:START -->.*?<!-- AI-HANDOFF:END -->"
if (-not [regex]::IsMatch($handoff, $markerPattern)) {
  throw "The handoff marker block is missing or malformed."
}
$updatedHandoff = [regex]::Replace($handoff, $markerPattern, $checkpoint.TrimEnd())
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($handoffPath, $updatedHandoff, $utf8NoBom)

$worklogEntry = @"

## $timestamp — $Agent — $Status

- Branch: ``$branch``
- Starting commit: ``$commit``
- Summary: $Summary
- Validation:
$validationText
- Next: $NextAction
"@
[System.IO.File]::AppendAllText($worklogPath, $worklogEntry, $utf8NoBom)

Write-Host "Updated docs/AI_HANDOFF.md and docs/AI_WORKLOG.md"
Write-Host "Review both files, then stage them with the exact task files before committing."
