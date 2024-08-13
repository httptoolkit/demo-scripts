on run argv
    set keyCodeArg to (item 1 of argv) as integer
    set restoreCursor to (item 2 of argv) as boolean

    tell application "System Events"
        key code keyCodeArg

        if restoreCursor then
            # The mouse disappears from recordings when typing, and seemingly due
            # to an AVFoundation bug, doesn't reappear (even though it's visible
            # when viewing live). Adding this resolves that:
            tell application "Finder" to activate
            key code 48 using {command down}
        end if
    end tell
end run