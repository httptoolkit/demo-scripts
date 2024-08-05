on run argv
    set procId to (item 1 of argv)
    set windowIndex to (item 2 of argv) as integer

    tell application "System Events"
        set proc to first process whose unix id is procId
        set procWindows to windows of proc
        set win to item windowIndex of procWindows
        click button 1 of win
    end tell
end run