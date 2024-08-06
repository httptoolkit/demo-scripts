on run argv
    set procId to (item 1 of argv)
    set windowIndex to (item 2 of argv) as integer

    set x to (item 3 of argv) as integer
    set y to (item 4 of argv) as integer
    set width to (item 5 of argv) as integer
    set height to (item 6 of argv) as integer

    tell application "System Events" to tell (first process whose unix id is procId)
        set position of (item windowIndex of windows) to {x, y}
        set size of (item windowIndex of windows) to {width, height}
    end tell
end run
