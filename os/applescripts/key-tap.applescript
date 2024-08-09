on run argv
    set keyCodeArg to (item 1 of argv) as integer
    tell application "System Events"
        key code keyCodeArg

        # The mouse disappears from recordings when typing, and seemingly due
        # to an AVFoundation bug, doesn't reappear (even though it's visible
        # when viewing live). This makes the mouse visible again:
        tell application "Finder" to activate
        key code 48 using {command down}
    end tell
end run