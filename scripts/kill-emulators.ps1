# Kill all processes running on Firebase emulator ports

# Firebase emulator ports from firebase.json
$PORTS = @(9099, 5001, 8760, 4000, 9199, 9000)

Write-Host "Killing processes on Firebase emulator ports..."

foreach ($PORT in $PORTS) {
    $process = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue | 
               Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($process) {
        foreach ($procId in $process) {
            Write-Host "Killing process on port $PORT (PID: $procId)"
            try {
                Stop-Process -Id $procId -Force -ErrorAction Stop
                Write-Host "  Successfully killed process on port $PORT" -ForegroundColor Green
            } catch {
                Write-Host "  Failed to kill process on port $PORT" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  No process found on port $PORT" -ForegroundColor Gray
    }
}

Write-Host "Done!"