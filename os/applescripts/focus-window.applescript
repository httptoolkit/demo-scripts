on run argv
    set procId to (item 1 of argv)
    set windowIndex to (item 2 of argv) as integer

    tell application "System Events"
        set proc to first process whose id is procId
        set procWindows to windows of proc
        set win to item windowIndex of procWindows

        set frontmost of proc to true
        perform action "AXRaise" of win
    end tell
end run