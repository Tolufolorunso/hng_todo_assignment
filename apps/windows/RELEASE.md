# TaskFlow Windows Release and Packaging Guide

This document describes the compilation, self-contained packaging, code signing, and Microsoft Store submission workflows for the TaskFlow Windows WPF client.

## 1. System Requirements

- Windows 10 (version 1809, build 17763 or higher) or Windows 11.
- .NET 10 SDK with Windows Desktop workload (`net10.0-windows`).
- Windows SDK (build 10.0.22621.0 or higher) for SignTool and MakeAppx utilities.

## 2. Standalone Single-File Compilation

To produce optimized, self-contained single-file binaries without external runtime dependencies, run the following commands from the repository root:

### x64 Architecture (Intel/AMD)
```powershell
dotnet publish apps/windows/TaskFlow/TaskFlow.csproj `
  -c Release `
  -r win-x64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -o apps/windows/publish/x64
```

### Arm64 Architecture (Surface Pro, Snapdragon X)
```powershell
dotnet publish apps/windows/TaskFlow/TaskFlow.csproj `
  -c Release `
  -r win-arm64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -o apps/windows/publish/arm64
```

## 3. MSIX Packaging

The MSIX package configuration is defined in `apps/windows/TaskFlow/Package.appxmanifest`.

To package the published files into an `.msix` container using the Windows SDK:

```powershell
# Copy manifest and assets to publish directory
Copy-Item apps/windows/TaskFlow/Package.appxmanifest apps/windows/publish/x64/AppxManifest.xml

# Pack into MSIX
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\MakeAppx.exe" pack `
  /d apps/windows/publish/x64 `
  /p apps/windows/publish/TaskFlow_1.0.0.0_x64.msix
```

## 4. Code Signing

### Development Side-Loading Certificate
For local testing or distribution outside the Microsoft Store, sign the package with a trusted certificate:

```powershell
# Create self-signed development certificate (run once as Administrator)
$cert = New-SelfSignedCertificate `
  -Type Custom `
  -Subject "CN=TaskFlow" `
  -KeyUsage DigitalSignature `
  -FriendlyName "TaskFlow Dev Cert" `
  -CertStoreLocation "Cert:\CurrentUser\My"

# Export certificate to PFX
$password = ConvertTo-SecureString -String "LocalDevPassword123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath apps/windows/dev-cert.pfx -Password $password

# Sign the MSIX package
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\SignTool.exe" sign `
  /fd SHA256 `
  /a `
  /f apps/windows/dev-cert.pfx `
  /p "LocalDevPassword123" `
  apps/windows/publish/TaskFlow_1.0.0.0_x64.msix
```

## 5. Microsoft Store Submission Protocol

When distributing via the Microsoft Store, digital signing is handled automatically by the Store ingestion pipeline.

### Submission Steps
1. Reserve application name `TaskFlow` in Microsoft Partner Center.
2. In Partner Center under Product Identity, copy the Package/Identity/Name and Publisher ID.
3. Update `apps/windows/TaskFlow/Package.appxmanifest` with your assigned Publisher ID.
4. Build release bundle:
   ```powershell
   dotnet publish apps/windows/TaskFlow/TaskFlow.csproj -c Release -p:GenerateAppxPackageOnBuild=true
   ```
5. In Partner Center, create a new submission:
   - Pricing and Availability: Select target regions and free tier.
   - Properties: Select Productivity category.
   - Age Ratings: Complete questionnaire (no mature content).
   - Store Listings: Add screenshots and description.
   - Privacy Policy URL: Link to `apps/windows/PRIVACY.md`.
   - Packages: Upload the `.msixupload` bundle.
6. Submit for Store certification.
