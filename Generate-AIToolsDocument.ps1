<#
.SYNOPSIS
Generate a reader-friendly Word/RTF document from the AI Tools website data.

.DESCRIPTION
This script consumes three CSV files and the website's index.html text content.
It builds a numbered document with:
  - First page index.html welcome text, pros, and cons
  - Table of contents
  - Categories, subcategories, and AI tools
  - Duplicate tool cross-references when a tool appears in multiple subcategories

.PARAMETER AiDataCsv
Path to data/AiData.csv

.PARAMETER SubcategoryCategoriesCsv
Path to data/SubcategoryCategories.csv

.PARAMETER EngineSubcategoriesCsv
Path to data/EngineSubcategories.csv

.PARAMETER IndexHtml
Path to index.html

.PARAMETER OutputRtf
Path to the generated RTF output file. Default is .\AI-Tools-Export.rtf

.PARAMETER LocalPageBaseUrl
Base URL used to build the AIEngine.html subcategory detail link.
Default is https://thomasmorer0982323-cmyk.github.io/AI-Tools
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$AiDataCsv = ".\data\AiData.csv",

    [Parameter(Mandatory=$false)]
    [string]$SubcategoryCategoriesCsv = ".\data\SubcategoryCategories.csv",

    [Parameter(Mandatory=$false)]
    [string]$EngineSubcategoriesCsv = ".\data\EngineSubcategories.csv",

    [Parameter(Mandatory=$false)]
    [string]$IndexHtml = ".\index.html",

    [Parameter(Mandatory=$false)]
    [string]$OutputRtf = ".\AI-Tools-Export.rtf",

    [Parameter(Mandatory=$false)]
    [string]$LocalPageBaseUrl = "https://thomasmorer0982323-cmyk.github.io/AI-Tools"
)

function ThrowIfMissingFile([string]$path) {
    if (-not (Test-Path -Path $path -PathType Leaf)) {
        throw "File not found: $path"
    }
}

function Escape-RtfText([string]$text) {
    if ($null -eq $text) { return "" }
    $decoded = [System.Net.WebUtility]::HtmlDecode($text)
    $escaped = $decoded -replace '\\','\\\\' -replace '{','\\{' -replace '}','\\}'
    $asciiOnly = $escaped -replace '[^\x00-\x7F]', ' '
    $normalized = $asciiOnly -replace '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', ' '
    return $normalized -replace "`r?`n", '\line '
}

function Add-RtfHyperlink([string]$target, [string]$display) {
    $escapedTarget = Escape-RtfText($target)
    $escapedDisplay = Escape-RtfText($display)
    return '{\field{\*\fldinst{HYPERLINK "' + $escapedTarget + '"}}{\fldrslt{\cf1\ul ' + $escapedDisplay + '\ulnone\cf0}}}\par'
}

function Strip-Html([string]$html) {
    if ($null -eq $html) { return "" }
    $cleanHtml = $html -replace '<[^>]+>', ''
    $text = [System.Net.WebUtility]::HtmlDecode($cleanHtml)
    return $text -replace '^[\s\r\n]+|[\s\r\n]+$',''
}

ThrowIfMissingFile $AiDataCsv
ThrowIfMissingFile $SubcategoryCategoriesCsv
ThrowIfMissingFile $EngineSubcategoriesCsv
ThrowIfMissingFile $IndexHtml

$indexHtmlContent = Get-Content -Path $IndexHtml -Raw

$welcomeMatch = [regex]::Match($indexHtmlContent, '<div\s+class="guide-copy">(.*?)</div>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$welcomeText = if ($welcomeMatch.Success) { Strip-Html($welcomeMatch.Groups[1].Value) } else { "Welcome text not found." }

$prosMatch = [regex]::Match($indexHtmlContent, '<div\s+id="prosDetails"[^>]*>(.*?)</div>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$prosText = if ($prosMatch.Success) { Strip-Html($prosMatch.Groups[1].Value) } else { "Pros text not found." }

$consMatch = [regex]::Match($indexHtmlContent, '<div\s+id="consDetails"[^>]*>(.*?)</div>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$consText = if ($consMatch.Success) { Strip-Html($consMatch.Groups[1].Value) } else { "Cons text not found." }

$aiRows = Import-Csv -Path $AiDataCsv -ErrorAction Stop
$subcategoryRows = Import-Csv -Path $SubcategoryCategoriesCsv -ErrorAction Stop
$engineRows = Import-Csv -Path $EngineSubcategoriesCsv -ErrorAction Stop

$subToCategory = @{ }
$categoryOrder = @()
foreach ($row in $subcategoryRows) {
    $sub = $row.Subcategory.Trim()
    $cat = $row.Category.Trim()
    if (-not $subToCategory.ContainsKey($sub)) {
        $subToCategory[$sub] = $cat
    }
    if (-not $categoryOrder.Contains($cat)) {
        $categoryOrder += $cat
    }
}

$orderedSubcategories = @()
foreach ($row in $subcategoryRows) {
    $sub = $row.Subcategory.Trim()
    if (-not $orderedSubcategories.Contains($sub)) { $orderedSubcategories += $sub }
}

$engineToSubcats = @{}
$subcategoryOrder = @{}
foreach ($row in $engineRows) {
    $engine = $row.Engine.Trim()
    $sub = $row.Subcategory.Trim()
    if (-not $engineToSubcats.ContainsKey($engine)) {
        $engineToSubcats[$engine] = @()
    }
    $engineToSubcats[$engine] += $sub
    if (-not $subcategoryOrder.ContainsKey($sub)) {
        $subcategoryOrder[$sub] = $orderedSubcategories.IndexOf($sub)
    }
}

$engineDataMap = @{}
foreach ($row in $aiRows) {
    $key = $row.Engine.Trim()
    if (-not $engineDataMap.ContainsKey($key)) {
        $engineDataMap[$key] = $row
    }
}

function Find-EngineData([string]$engineName) {
    $engineName = $engineName.Trim()
    if ($engineDataMap.ContainsKey($engineName)) { return $engineDataMap[$engineName] }
    $firstToken = $engineName.Split(' ')[0]
    $candidates = $engineDataMap.Keys | Where-Object { $_ -like "$firstToken*" }
    if ($candidates.Count -eq 1) { return $engineDataMap[$candidates[0]] }
    return $null
}

$categoryIndex = 0
$numbering = @{}
$seenEngine = @{}
$categoryStructures = @{}

foreach ($category in $categoryOrder) {
    $categoryStructures[$category] = @{}
}

foreach ($sub in $orderedSubcategories) {
    if (-not $subToCategory.ContainsKey($sub)) { continue }
    $category = $subToCategory[$sub]
    if (-not $categoryStructures.ContainsKey($category)) { $categoryStructures[$category] = @{} }
    if (-not $categoryStructures[$category].ContainsKey($sub)) {
        $categoryStructures[$category][$sub] = @()
    }
}

foreach ($row in $engineRows) {
    $engine = $row.Engine.Trim()
    $sub = $row.Subcategory.Trim()
    if (-not $subToCategory.ContainsKey($sub)) { continue }
    $category = $subToCategory[$sub]
    if (-not $categoryStructures.ContainsKey($category)) { $categoryStructures[$category] = @{} }
    if (-not $categoryStructures[$category].ContainsKey($sub)) { $categoryStructures[$category][$sub] = @() }
    $categoryStructures[$category][$sub] += $engine
}

# Build Table of Contents data
$tocEntries = @()
$categoryIndex = 0
foreach ($category in $categoryOrder) {
    $categoryIndex++
    $subcategoryIndex = 0
    $tocEntries += "${categoryIndex}. $category"
    $subs = $categoryStructures[$category].Keys | Sort-Object { $subcategoryOrder[$_] }
    foreach ($sub in $subs) {
        $subcategoryIndex++
        $subNumber = "$categoryIndex.$subcategoryIndex"
        $tocEntries += "    $subNumber $sub"
        $engineIndex = 0
        foreach ($engine in $categoryStructures[$category][$sub]) {
            $engineIndex++
            $tocEntries += "        $subNumber.$engineIndex $engine"
        }
    }
}

function Render-List([string]$prefix, [string[]]$items, [string]$type) {
    if ($items.Count -eq 0) { return "" }
    $result = ""
    $result += "${prefix}\line"
    foreach ($item in $items) {
        $result += " - ${item}\line"
    }
    return $result
}

$rtfLines = @()
$rtfLines += '{\rtf1\ansi\deff0'
$rtfLines += '{\colortbl;\red0\green0\blue255;}'
$rtfLines += '\viewkind4\uc1'
$rtfLines += '\pard\qc\b\fs40 AI Tools for Language Teaching\b0\fs24\par'
$rtfLines += '\pard\qr Generated on: ' + (Get-Date -Format "yyyy-MM-dd HH:mm") + '\par'
$rtfLines += '\pard\qc\b First page: website introduction \b0\line'
$rtfLines += '\pard\ql\fs24\b Welcome\b0\line'
$rtfLines += Escape-RtfText($welcomeText) + '\par\par'
$rtfLines += '\b Advantages of AI in language education\b0\line'
$rtfLines += Escape-RtfText($prosText) + '\par\par'
$rtfLines += '\b Disadvantages of AI in language education\b0\line'
$rtfLines += Escape-RtfText($consText) + '\par\page'

$rtfLines += '\pard\qc\b Table of Contents\b0\fs24\line'
foreach ($line in $tocEntries) {
    $rtfLines += Escape-RtfText($line) + '\line'
}
$rtfLines += '\page'

$categoryIndex = 0
foreach ($category in $categoryOrder) {
    $categoryIndex++
    $subcategoryIndex = 0
    $rtfLines += '\pard\b\fs32 ' + (Escape-RtfText("$categoryIndex. $category")) + '\b0\fs24\line'
    $subs = $categoryStructures[$category].Keys | Sort-Object { $subcategoryOrder[$_] }
    foreach ($sub in $subs) {
        $subcategoryIndex++
        $subNumber = "$categoryIndex.$subcategoryIndex"
        $rtfLines += '\pard\b\fs28 ' + (Escape-RtfText("$subNumber $sub")) + '\b0\fs24\line'
        $engineIndex = 0
        foreach ($engine in $categoryStructures[$category][$sub]) {
            $engineIndex++
            $engineNumber = "$subNumber.$engineIndex"
            if (-not $seenEngine.ContainsKey($engine)) {
                $seenEngine[$engine] = [PSCustomObject]@{ Category = $category; Subcategory = $sub; Number = $engineNumber }
                $rtfLines += '\pard\b\fs24 ' + (Escape-RtfText("$engineNumber $engine")) + '\b0\fs24\line'
                $engineData = Find-EngineData $engine
                if ($null -eq $engineData) {
                    $rtfLines += Escape-RtfText("Details for '$engine' were not found in $AiDataCsv.") + '\par'
                } else {
                    $website = if ($engineData.weblink) { $engineData.weblink.Trim() } else { 'N/A' }
                    $description = if ($engineData.description) { $engineData.description.Trim() } else { '' }
                    $prosItems = @()
                    if ($engineData.Pros) { $prosItems = ($engineData.Pros -split ';') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' } }
                    $consItems = @()
                    if ($engineData.Cons) { $consItems = ($engineData.Cons -split ';') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' } }
                    $ratings = if ($engineData.Ratings) { $engineData.Ratings.Trim() } else { '' }

                    $rtfLines += Escape-RtfText("Website: $website") + '\par'
                    $toolUrl = "$($LocalPageBaseUrl.TrimEnd('/'))/AIEngine.html?engine=$([uri]::EscapeDataString($engine))&from=subcat&subcategory=$([uri]::EscapeDataString($sub))&category=$([uri]::EscapeDataString($category))"
                    $rtfLines += Add-RtfHyperlink $toolUrl $engine
                    if ($description) {
                        $rtfLines += '\pard\ql\i ' + (Escape-RtfText("Description: $description")) + '\i0\par'
                    }
                    if ($prosItems.Count -gt 0) {
                        $rtfLines += '\b Pros:\b0\par'
                        foreach ($item in $prosItems) {
                            $rtfLines += Escape-RtfText("• $item") + '\line '
                        }
                    } else {
                        $rtfLines += '\b Pros:\b0 N/A\par'
                    }
                    if ($consItems.Count -gt 0) {
                        $rtfLines += '\b Cons:\b0\par'
                        foreach ($item in $consItems) {
                            $rtfLines += Escape-RtfText("• $item") + '\line '
                        }
                    } else {
                        $rtfLines += '\b Cons:\b0 N/A\par'
                    }
                    if ($ratings) {
                        $rtfLines += '\b Ratings:\b0 ' + (Escape-RtfText($ratings)) + '\par\par'
                    } else {
                        $rtfLines += '\par'
                    }
                }
            } else {
                $first = $seenEngine[$engine]
                $rtfLines += '\pard\i ' + (Escape-RtfText("$engineNumber $engine - See $($first.Number) $engine in Category $($first.Category), Subcategory $($first.Subcategory).")) + ' \i0\par'
            }
        }
    }
}

$rtfLines += '}'

$rtfContent = $rtfLines -join "`r`n"
Set-Content -Path $OutputRtf -Value $rtfContent -Encoding ASCII

Write-Host "Generated $OutputRtf" -ForegroundColor Green
