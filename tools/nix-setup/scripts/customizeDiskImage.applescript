-- Microsoft Azure Command Line Interface
-- Finder customizer
--
-- Note: this is finicky because of the use of UI + copy actions 
-- instead of SetFile for the custom icon on the package itself.

set customInstallerIcon to POSIX file "/tmp/AzureInstaller.icns"

-- Open the custom installer icon
tell application "Preview"
	open customInstallerIcon
	activate
	delay 2
	tell application "System Events"
		--keystroke "w" using command down
		--delay 1
		keystroke "c" using command down
		delay 1
		keystroke "w" using command down
	end tell
	quit
end tell

-- Customize the appearance of the disk image
tell application "Finder"
	tell disk "Microsoft Azure SDK"
		open
		
		tell container window
			set bounds to {200, 100, 910, 550}
			set toolbar visible to false
			set statusbar visible to false
			set current view to icon view
		end tell
		
		set icon size of the icon view options of container window to 72
		
		set background picture of the icon view options of container window to file ".background:background.png"
		
		set arrangement of the icon view options of container window to not arranged
		
		delay 1
		
		-- Store the custom icon
		set infoWindow to open information window of item "Install Command Line Interface.pkg"
		set infoWindowName to name of infoWindow
		
		tell window infoWindowName
			activate
		end tell
		
		tell application "System Events"
			--			tell application process "Finder"
			--			tell window infoWindowName
			delay 1
			keystroke tab
			delay 1
			keystroke "v" using command down
			keystroke tab
			delay 1
			--			end tell
			--			end tell
		end tell
		
		close infoWindow
		
		-- Finish up
		update without registering applications
		delay 1
		close
	end tell
	
	tell disk "Microsoft Azure SDK"
		open
		set position of item "Install Command Line Interface.pkg" of container window to {175, 280}
		delay 1
		close
	end tell
	
	-- visual inspection phase
	tell disk "Microsoft Azure SDK"
		open
		delay 5
		close
	end tell
	
end tell
