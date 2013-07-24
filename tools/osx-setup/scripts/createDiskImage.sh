#!/bin/sh
# Windows Azure OS X Package: Disk Image Creation Script

if [ -d ./dmg ]; then
	rm -rf ./dmg
fi
if [ -f "temp.dmg" ]; then
	rm temp.dmg
fi
if [ -f "Windows Azure.dmg" ]; then
	rm "Windows Azure.dmg"
fi

# Create a read/write disk image
echo Creating an empty disk image...
mkdir dmg
hdiutil create -fs HFSX -layout SPUD \
-size 40m \
temp.dmg \
-srcfolder dmg \
-format UDRW \
-volname "Windows Azure SDK" \
-quiet
rmdir dmg

# Mount the image
hdiutil attach temp.dmg -quiet

### XXX TEMP ###
touch "/Volumes/Windows Azure SDK/Install Command Line Interface.pkg"

# Copy and set the icons
echo Customizing icons...
cp ../resources/AzureInstaller.icns /tmp/
cp ../resources/VolumeIcon.icns "/Volumes/Windows Azure SDK/.VolumeIcon.icns"
SetFile -c icnC "/Volumes/Windows Azure SDK/.VolumeIcon.icns"
SetFile -a C "/Volumes/Windows Azure SDK"

# Copy the background image
mkdir "/Volumes/Windows Azure SDK/.background"
cp ../resources/background.png "/Volumes/Windows Azure SDK/.background/"

# Customize the disk image visually
echo Customizing the image Finder window... Please do not interact with the UI.
osascript customizeDiskImage.scpt

# Detach the image
hdiutil detach "/Volumes/Windows Azure SDK" -quiet

# Create a compressed image for shipping
echo Creating the compressed disk image to ship...
hdiutil convert temp.dmg -format UDZO -imagekey zlib-level=9 -o "Windows Azure.dmg" -quiet # | grep Savings

# Remove the temporary staging file
rm /tmp/AzureInstaller.icns
rm temp.dmg
echo
