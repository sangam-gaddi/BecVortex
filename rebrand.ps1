$rootDir = "C:\Users\sanga\Desktop\homepage-preview\bec-vortex-os"

$replacements = @(
  [pscustomobject]@{ From = "Aurora OS.js"; To = "BEC VORTEX OS" },
  [pscustomobject]@{ From = "Aurora OS"; To = "BEC VORTEX OS" },
  [pscustomobject]@{ From = "aurora-os-js"; To = "bec-vortex-os" },
  [pscustomobject]@{ From = "aurora-os"; To = "bec-vortex-os" },
  [pscustomobject]@{ From = "AuroraOS"; To = "BecVortexOS" },
  [pscustomobject]@{ From = "auroraos"; To = "becvortexos" },
  [pscustomobject]@{ From = "com.auroraos.app"; To = "com.becvortexos.app" },
  [pscustomobject]@{ From = "Aurora-OS.js"; To = "BEC-VORTEX-OS" },
  [pscustomobject]@{ From = "mental.os()"; To = "BEC VORTEX OS" },
  [pscustomobject]@{ From = "mental-os"; To = "bec-team" },
  [pscustomobject]@{ From = "mental_os"; To = "bec_vortex" },
  [pscustomobject]@{ From = "Dope Pixels"; To = "BEC Team" },
  [pscustomobject]@{ From = "MOONHOUND Studio"; To = "BEC Studio" },
  [pscustomobject]@{ From = "MOONHOUND Orange"; To = "BEC Orange" },
  [pscustomobject]@{ From = "mental.os() Fuchsia"; To = "BEC Fuchsia" },
  [pscustomobject]@{ From = "Nova Republika"; To = "BEC VORTEX" },
  [pscustomobject]@{ From = "mentalos@proton.me"; To = "becvortex@bec.edu.in" },
  [pscustomobject]@{ From = "Catalin-Robert Dragoiu"; To = "BEC Team" },
  [pscustomobject]@{ From = "Aurora OS.js"; To = "BEC VORTEX OS" },
  [pscustomobject]@{ From = "uninstallDisplayName`": `"Aurora OS.js"; To = "uninstallDisplayName`": `"BEC VORTEX OS" },
  [pscustomobject]@{ From = "productName`": `"Aurora OS.js"; To = "productName`": `"BEC VORTEX OS" }
)

$extensions = @("*.ts","*.tsx","*.js","*.json","*.html","*.md","*.css","*.mjs","*.txt","*.sh","*.yml","*.yaml")

$allFiles = Get-ChildItem -Path $rootDir -Recurse -File | Where-Object {
  $_.FullName -notmatch "\\node_modules\\" -and
  $_.FullName -notmatch "\\.git\\"
}

$matchedFiles = $allFiles | Where-Object { $extensions -contains ("*" + $_.Extension) }

$count = 0
foreach ($file in $matchedFiles) {
  try {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $changed = $false
    foreach ($r in $replacements) {
      if ($content.Contains($r.From)) {
        $content = $content.Replace($r.From, $r.To)
        $changed = $true
      }
    }
    if ($changed) {
      [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
      Write-Output "REBRANDED: $($file.FullName)"
      $count++
    }
  } catch {
    Write-Output "SKIP (binary): $($file.FullName)"
  }
}

Write-Output ""
Write-Output "=== DONE: $count files rebranded ==="
