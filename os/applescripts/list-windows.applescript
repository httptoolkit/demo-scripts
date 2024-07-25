tell application "System Events"
	set windowList to {}

	repeat with proc in (processes where visible is true)
        set pid to id of proc
        set procWindows to windows of proc
        set winIndex to 1

        -- Skip any processes without windows
        repeat with win in procWindows
            log "id:" & pid & "-" & winIndex
            set winIndex to winIndex + 1
            log "name:" & name of proc

            set {winPosition, winSize} to {position, size} of win
            set {posX, posY} to winPosition
            set {sizeW, sizeH} to winSize

            log "position:" & posX & "x" & posY
            log "size:" & sizeW & "x" & sizeH
            log "---"
        end repeat
	end repeat
end tell