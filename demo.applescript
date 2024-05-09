set APP_URL to "http://localhost:8080"
set VIDEO_DURATION to 10
set OUTPUT_PATH to "/Users/tim/htk/demo-script/output.mov"

tell application "Google Chrome"
	activate
	open location APP_URL
end tell

delay 1

# We want a 1080p video, but with content scaled up a bit. To do this we aim
# for 1440x810 (3/4 size). We lose 87 vertical pixels to Chrome's top section,
# so we need 897 height. We then shift by 100x100 to avoid Mac's top menu bar
# (which we can't overlap) giving us:
tell application "Google Chrome" to set bounds of front window to {100, 100, 1540, 997}

log "Browser ready"

# Capture the active Chrome area (not that this is x,y,w,h - not full coordinates)
do shell script "rm -f " & OUTPUT_PATH
do shell script "screencapture -C -v -R 100,187,1440,810 -d -V " & VIDEO_DURATION & " " & OUTPUT_PATH & " &"

