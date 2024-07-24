tell application "System Events"
	set windowList to {}

	repeat with proc in (processes where visible is true)
        set pid to id of proc

        -- For now we don't support this, because windows have no ids
        if (count of windows) > 1 then
            error "More than one " & name of proc & " window is open"
        end if

        -- Given the above, the below will run either 0 or 1 times
        repeat with w in windows
            log "id:" & pid
            log "name:" & name of proc

            set {winPosition, winSize} to {position, size} of w
            set {posX, posY} to winPosition
            set {sizeW, sizeH} to winSize

            log "position:" & posX & "x" & posY
            log "size:" & sizeW & "x" & sizeH
            log "---"
        end repeat
	end repeat
end tell