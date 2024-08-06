on run argv
    set procId to (item 1 of argv)
    set windowIndex to (item 2 of argv) as integer

    tell application "System Events" to tell (first process whose unix id is procId)
        set win to item windowIndex of windows
        click button 1 of win
    end tell
end run