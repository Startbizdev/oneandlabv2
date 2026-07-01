#Requires -RunAsAdministrator
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses ("8.8.8.8", "1.1.1.1")
Clear-DnsClientCache
Write-Host "DNS Wi-Fi -> 8.8.8.8, 1.1.1.1"
Get-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 | Format-List
