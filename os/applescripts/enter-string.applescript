on run argv
    tell application "System Events"
        set theText to (item 1 of argv)
        keystroke thetext

        # The mouse disappears from recordings when typing, and seemingly due
        # to an AVFoundation bug, doesn't reappear (even though it's visible
        # when viewing live). Adding this resolves that:
        tell application "Finder" to activate
        key code 48 using {command down}
    end tell
end run