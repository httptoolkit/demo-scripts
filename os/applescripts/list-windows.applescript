tell application "System Events"
	set windowList to {}

	repeat with proc in (processes where visible is true)
        set pid to unix id of proc
        set winIndex to 1

        -- Skip any processes without windows
        repeat with win in (windows of proc)
            try
                log "id:" & pid & "-" & winIndex
                set winIndex to winIndex + 1
                log "name:" & name of win

                set {winPosition, winSize} to {position, size} of win
                set {posX, posY} to winPosition
                set {sizeW, sizeH} to winSize

                log "position:" & posX & "x" & posY
                log "size:" & sizeW & "x" & sizeH
                log "---"
            on error errMsg
                log "Error processing window " & winIndex & " of " & name of proc & ": " & errMsg
            end try
        end repeat
	end repeat
end tell