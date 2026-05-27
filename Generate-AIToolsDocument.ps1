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

.PARAMETER ImagesFolder
Path to the folder that contains the main engine images.
Default is .\images
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
    [string]$LocalPageBaseUrl = "https://thomasmorer0982323-cmyk.github.io/AI-Tools",

    [Parameter(Mandatory=$false)]
    [string]$ImagesFolder = ".\images"
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

function Get-RtfHyperlinkField([string]$target, [string]$display) {
    $escapedTarget = Escape-RtfText($target)
    $escapedDisplay = Escape-RtfText($display)
    return '{\field{\*\fldinst{HYPERLINK "' + $escapedTarget + '"}}{\fldrslt{\cf1\ul ' + $escapedDisplay + '\ulnone\cf0}}}'
}

function Add-RtfHyperlink([string]$target, [string]$display) {
    return (Get-RtfHyperlinkField $target $display) + '\par'
}

function Add-RtfLine([string]$text, [string]$prefix = '') {
    return $prefix + (Escape-RtfText($text)) + '\line'
}

function Add-RtfImage([string]$imagePath, [int]$maxWidthTwips = 1800, [int]$maxHeightTwips = 1350) {
    if ([string]::IsNullOrWhiteSpace($imagePath) -or -not (Test-Path -Path $imagePath -PathType Leaf)) {
        return ''
    }

    $extension = [System.IO.Path]::GetExtension($imagePath).ToLowerInvariant()
    $blipTag = switch ($extension) {
        '.png' { '\pngblip' }
        '.jpg' { '\jpegblip' }
        '.jpeg' { '\jpegblip' }
        default { return '' }
    }

    $image = $null
    try {
        Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue | Out-Null
        $image = [System.Drawing.Image]::FromFile($imagePath)
        $originalWidthTwips = [double]$image.Width * 15
        $originalHeightTwips = [double]$image.Height * 15
        $scale = [Math]::Min(1.0, [Math]::Min($maxWidthTwips / $originalWidthTwips, $maxHeightTwips / $originalHeightTwips))
        $targetWidthTwips = [Math]::Max(1, [int][Math]::Round($originalWidthTwips * $scale))
        $targetHeightTwips = [Math]::Max(1, [int][Math]::Round($originalHeightTwips * $scale))
        $hexBytes = -join ([System.IO.File]::ReadAllBytes($imagePath) | ForEach-Object { $_.ToString('x2') })
        return '{\pard\ql{\pict' + $blipTag + '\picw' + $image.Width + '\pich' + $image.Height + '\picwgoal' + $targetWidthTwips + '\pichgoal' + $targetHeightTwips + ' ' + $hexBytes + '}\par}'
    }
    catch {
        return ''
    }
    finally {
        if ($image) {
            $image.Dispose()
        }
    }
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
$rtfLines += '{\fonttbl{\f0 Calibri;}{\f1 Arial;}}'
$rtfLines += '{\colortbl;\red0\green0\blue255;}'
$rtfLines += '\viewkind4\uc1\pard\sa180\sl276\slmult1\f0\fs24'
$rtfLines += '\pard\qc\sb240\sa240\b\fs44 AI Tools for Language Teaching\b0\fs24\par'
$rtfLines += '\pard\qr\i Generated on: ' + (Get-Date -Format "yyyy-MM-dd HH:mm") + '\i0\par\par'
$rtfLines += '\pard\ql\b\fs30 Website Introduction\b0\fs24\par\par'
$rtfLines += '\pard\ql\sb120\sa120\b\fs32 Welcome\b0\fs24\par\par'
$rtfLines += '\pard\ql\li0\fi0 ' + (Escape-RtfText($welcomeText)) + '\par\par'
$rtfLines += '\pard\ql\sb120\sa120\b Advantages of AI in language education\b0\par\par'
$rtfLines += '\pard\ql\li0\fi0 ' + (Escape-RtfText($prosText)) + '\par\par'
$rtfLines += '\pard\ql\sb120\sa120\b Disadvantages of AI in language education\b0\par\par'
$rtfLines += '\pard\ql\li0\fi0 ' + (Escape-RtfText($consText)) + '\par\par\page'

$rtfLines += '\pard\qc\b\fs36 Table of Contents\b0\fs24\par\par'
foreach ($line in $tocEntries) {
    if ($line -match '^\d+\. ') {
        # Category
        $rtfLines += Add-RtfLine $line '\pard\b\fs28 '
    }
    elseif ($line -match '^\s+\d+\.\d+') {
        # Subcategory
        $rtfLines += Add-RtfLine ($line.Trim()) '\pard\li360 '
    }
    else {
        # Engine/tool
        $rtfLines += Add-RtfLine ($line.Trim()) '\pard\li720\sa120 '
    }
}
$rtfLines += '\par\page'

$categoryIndex = 0
foreach ($category in $categoryOrder) {
    $categoryIndex++
    $subcategoryIndex = 0
    $rtfLines += '\page'
    $rtfLines += '\pard\sb240\sa240\b\fs36 ' + (Escape-RtfText("$categoryIndex. $category")) + '\b0\fs24\par\par'
    $subs = $categoryStructures[$category].Keys | Sort-Object { $subcategoryOrder[$_] }
    foreach ($sub in $subs) {
        $subcategoryIndex++
        $subNumber = "$categoryIndex.$subcategoryIndex"
        $rtfLines += '\pard\sb180\sa180\b\fs30 ' + (Escape-RtfText("$subNumber $sub")) + '\b0\fs24\par'
        $engineIndex = 0
        foreach ($engine in $categoryStructures[$category][$sub]) {
            $engineIndex++
            $engineNumber = "$subNumber.$engineIndex"
            if (-not $seenEngine.ContainsKey($engine)) {
                $seenEngine[$engine] = [PSCustomObject]@{ Category = $category; Subcategory = $sub; Number = $engineNumber }
                $engineData = Find-EngineData $engine
                if ($null -eq $engineData) {
                    $rtfLines += '\pard\sb120\sa120\b\fs26 ' + (Escape-RtfText("$engineNumber $engine")) + '\b0\fs24\par'
                    $rtfLines += Escape-RtfText("Details for '$engine' were not found in $AiDataCsv.") + '\par'
                } else {
                    $website = if ($engineData.weblink) { $engineData.weblink.Trim() } else { '' }
                    $description = if ($engineData.description) { $engineData.description.Trim() } else { '' }
                    $prosItems = @()
                    if ($engineData.Pros) { $prosItems = ($engineData.Pros -split ';') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' } }
                    $consItems = @()
                    if ($engineData.Cons) { $consItems = ($engineData.Cons -split ';') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' } }
                    $ratings = if ($engineData.Ratings) { $engineData.Ratings.Trim() } else { '' }
                    $toolUrl = "$($LocalPageBaseUrl.TrimEnd('/'))/AIEngine.html?engine=$([uri]::EscapeDataString($engine))&from=subcat&subcategory=$([uri]::EscapeDataString($sub))&category=$([uri]::EscapeDataString($category))"
                    $headerLinkTarget = if ($website) { $website } else { $toolUrl }
                    $rtfLines += '\pard\sb120\sa120\b\fs26 ' + (Escape-RtfText("$engineNumber ")) + (Get-RtfHyperlinkField $headerLinkTarget $engine) + '\b0\fs24\par'
                    if ($website) {
                        $rtfLines += '\pard\ql Website: ' + (Get-RtfHyperlinkField $website $website) + '\par'
                    }

                    $imagePath = if ($engineData.imagelink) { Join-Path -Path $ImagesFolder -ChildPath $engineData.imagelink.Trim() } else { '' }
                    $imageRtf = Add-RtfImage $imagePath
                    if ($imageRtf) {
                        $rtfLines += $imageRtf
                        $rtfLines += '\par'
                    }

                    if ($description) {
                        $rtfLines += '\pard\ql\i ' + (Escape-RtfText("Description: $description")) + '\i0\par'
                    }
                    if ($prosItems.Count -gt 0) {
                        $rtfLines += '\par\b Pros:\b0\par'
                        foreach ($item in $prosItems) {
                            $rtfLines += Add-RtfLine "• $item" '\pard\li360\sa120 '
                        }
                        $rtfLines += '\par'
                    } else {
                        $rtfLines += '\b Pros:\b0 N/A\par'
                    }
                    if ($consItems.Count -gt 0) {
                        $rtfLines += '\b Cons:\b0\par'
                        foreach ($item in $consItems) {
                            $rtfLines += Add-RtfLine "• $item" '\pard\li360\sa120 '
                        }
                        $rtfLines += '\par'
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
