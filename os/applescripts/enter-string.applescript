on run argv
    tell application "System Events"
        set theText to (item 1 of argv)
        keystroke thetext
    end tell
end run