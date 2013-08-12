#!/bin/sh
# Windows Azure OS X Package: Disk Image Creation Script

echo Windows Azure Command Line Interface Ship Tool
echo Creates a disk image provided an installer package
echo

if [ -d "out/dmg" ]; then
	rm -rf out/dmg
fi
if [ -f "out/temp.dmg" ]; then
	rm out/temp.dmg
fi
if [ -f "out/Windows Azure SDK.dmg" ]; then
	rm "out/Windows Azure SDK.dmg"
fi

if [ ! -f "out/Install Command Line Interface.pkg" ]; then
	echo No package named "Install Command Line Interface.pkg" found in the ./out/ folder.
	exit 1
fi

# Create a read/write disk image
echo Creating an empty disk image...
mkdir out/dmg
hdiutil create -fs HFSX -layout SPUD \
-size 40m \
out/temp.dmg \
-srcfolder ./out/dmg \
-format UDRW \
-volname "Windows Azure SDK" \
-quiet
rmdir out/dmg

# Mount the image
hdiutil attach out/temp.dmg -quiet

# Copy the package
cp "out/Install Command Line Interface.pkg" "/Volumes/Windows Azure SDK/Install Command Line Interface.pkg"

# Hide the file extension
SetFile -a E "/Volumes/Windows Azure SDK/Install Command Line Interface.pkg"

# Copy and set the icons
echo Customizing icons...
cp resources/AzureInstaller.icns /tmp/
cp resources/VolumeIcon.icns "/Volumes/Windows Azure SDK/.VolumeIcon.icns"
SetFile -c icnC "/Volumes/Windows Azure SDK/.VolumeIcon.icns"
SetFile -a C "/Volumes/Windows Azure SDK"

# Copy the background image
mkdir "/Volumes/Windows Azure SDK/.background"
cp resources/WindowsAzureBackground.png "/Volumes/Windows Azure SDK/.background/background.png" > /dev/null

# Customize the disk image visually
echo Customizing the image Finder window... Please do not interact with the UI.
osascript scripts/customizeDiskImage.applescript

# Detach the image
hdiutil detach "/Volumes/Windows Azure SDK" -quiet

# Create a compressed image for shipping
echo Creating the compressed disk image to ship...
hdiutil convert out/temp.dmg -format UDZO -imagekey zlib-level=9 -o "out/Windows Azure SDK.dmg" -quiet # | grep Savings

# Remove the temporary staging file
rm /tmp/AzureInstaller.icns
rm out/temp.dmg
echo
