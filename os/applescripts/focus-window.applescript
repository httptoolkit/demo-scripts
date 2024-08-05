on run argv
    set procId to (item 1 of argv)
    set windowIndex to (item 2 of argv) as integer

    tell application "System Events"
        set frontmost of first process whose unix id is procId to true
        perform action "AXRaise" of (item windowIndex of (windows of (first process whose unix id is procId)))
    end tell
end run