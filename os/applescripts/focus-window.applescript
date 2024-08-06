on run argv
    set procId to (item 1 of argv)
    set windowIndex to (item 2 of argv) as integer

    tell application "System Events" to tell (first process whose unix id is procId)
        set frontmost to true
        perform action "AXRaise" of (item windowIndex of windows)
    end tell
end run