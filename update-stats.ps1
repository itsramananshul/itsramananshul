$ErrorActionPreference = 'Stop'
$url = 'https://github-readme-stats-xi-seven-52.vercel.app/api?username=itsramananshul&show_icons=true&theme=github_dark&hide_border=true&include_all_commits=true&count_private=true&hide=stars'
$svg = New-Object System.Xml.XmlDocument
$svg.PreserveWhitespace = $true
$svg.LoadXml((Invoke-WebRequest -Uri $url -UseBasicParsing).Content)
$rank = $svg.SelectSingleNode('//*[@data-testid="level-rank-icon"]')
$commits = $svg.SelectSingleNode('//*[@data-testid="commits"]')
$ring = $svg.SelectSingleNode('//*[local-name()="circle" and @class="rank-circle"]')
if ($null -eq $rank -or $null -eq $commits -or $null -eq $ring) {
    throw 'Stats service returned an unexpected card. Existing asset was not changed.'
}
# The custom badge uses a decorative full ring, not the provider's percentile arc.
$rank.InnerText = 'A+'
$ring.SetAttribute('style', 'animation: none; stroke-dasharray: none; stroke-dashoffset: 0;')
$svg.SelectSingleNode('//*[@id="titleId"]').InnerText = "Anshul Raman's GitHub Stats; A+ is a manually assigned display grade, not a calculated rank"
$svg.Save((Join-Path $PSScriptRoot 'assets/stats.svg'))
Write-Output 'Refreshed real activity numbers with custom A+ display grade; stars hidden.'
