on run argv
    tell application "System Events"
        set theText to (item 1 of argv)
        set theDelay to (item 2 of argv)/1000
        repeat with i from 1 to length of theText
            set c to text i of theText
            delay theDelay
            keystroke c
        end repeat
    end tell
end run