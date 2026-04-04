param(
    [string]$Mode = "both"
)

Push-Location $PSScriptRoot
cargo build --quiet 2>$null

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = (Get-Command cargo).Source
$psi.Arguments = "run --quiet"
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.CreateNoWindow = $true
$psi.WorkingDirectory = $PSScriptRoot

$proc = [System.Diagnostics.Process]::Start($psi)
$writer = $proc.StandardInput

function Send($msg) {
    $writer.WriteLine($msg)
    $writer.Flush()
}

function Emit-Levels($duration, $baseAmp = 0.4, $variance = 0.4) {
    $frames = [math]::Floor($duration / 0.066)
    for ($i = 1; $i -le $frames; $i++) {
        $a = [math]::Round($baseAmp + $variance * [math]::Sin($i * 0.15), 2)
        $b = [math]::Round($baseAmp + $variance * [math]::Sin($i * 0.2 + 1), 2)
        $c = [math]::Round($baseAmp + $variance * [math]::Sin($i * 0.25 + 2), 2)
        Send "{`"type`":`"levels`",`"levels`":[$a,$b,$c]}"
        Start-Sleep -Milliseconds 66
    }
}

function Run-Dictation {
    Write-Host "--- Dictation: recording with style selector ---" -ForegroundColor Cyan
    Send '{"type":"visibility","visibility":"persistent"}'
    Send '{"type":"style_info","count":3,"name":"Professional"}'
    Send '{"type":"phase","phase":"recording"}'
    Emit-Levels 3 0.35 0.45

    Write-Host "--- Dictation: loading ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"loading"}'
    Start-Sleep -Seconds 2

    Write-Host "--- Dictation: idle ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"idle"}'
    Send '{"type":"style_info","count":3,"name":"Casual"}'
    Start-Sleep -Seconds 2

    Write-Host "--- Dictation: second recording ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"recording"}'
    Emit-Levels 2 0.5 0.3
    Send '{"type":"phase","phase":"idle"}'
    Start-Sleep -Seconds 1
}

function Run-Assistant {
    Write-Host "--- Assistant: compact ---" -ForegroundColor Cyan
    Send '{"type":"visibility","visibility":"persistent"}'
    Send '{"type":"window_size","size":"assistant_compact"}'
    Send '{"type":"assistant_state","active":true,"input_mode":"voice","compact":true,"conversation_id":"conv_1","user_prompt":null,"messages":[],"streaming":null,"permissions":[]}'
    Start-Sleep -Seconds 1

    Write-Host "--- Assistant: compact + recording ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"recording"}'
    Emit-Levels 2 0.4 0.5
    Send '{"type":"phase","phase":"loading"}'
    Start-Sleep -Milliseconds 1500

    Write-Host "--- Assistant: thinking ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"idle"}'
    Send '{"type":"window_size","size":"assistant_expanded"}'
    Send '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"Tell me about the weather in SF","messages":[{"id":"m1","content":null,"is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":{"message_id":"m1","tool_calls":[],"reasoning":"Looking up weather...","is_streaming":true},"permissions":[]}'
    Start-Sleep -Milliseconds 1500

    Write-Host "--- Assistant: response ---" -ForegroundColor Cyan
    Send '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"Tell me about the weather in SF","messages":[{"id":"m1","content":"Currently 62F in San Francisco with partly cloudy skies.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
    Start-Sleep -Seconds 2

    Write-Host "--- Assistant: typing mode ---" -ForegroundColor Cyan
    Send '{"type":"window_size","size":"assistant_typing"}'
    Send '{"type":"assistant_state","active":true,"input_mode":"type","compact":false,"conversation_id":"conv_1","user_prompt":"What should I wear","messages":[{"id":"m1","content":"Currently 62F in San Francisco.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
    Start-Sleep -Seconds 4

    Write-Host "--- Closing assistant ---" -ForegroundColor Cyan
    Send '{"type":"window_size","size":"dictation"}'
    Send '{"type":"assistant_state","active":false,"input_mode":"voice","compact":true,"conversation_id":null,"user_prompt":null,"messages":[],"streaming":null,"permissions":[]}'
    Start-Sleep -Seconds 1
}

function Run-Flash {
    Write-Host "--- Flash ---" -ForegroundColor Cyan
    Send '{"type":"visibility","visibility":"persistent"}'
    Start-Sleep -Seconds 1
    Send '{"type":"flash_message","message":"Copied to clipboard"}'
    Start-Sleep -Seconds 4
}

function Run-Fireworks {
    Write-Host "--- Fireworks ---" -ForegroundColor Cyan
    Send '{"type":"visibility","visibility":"persistent"}'
    Start-Sleep -Milliseconds 500
    Send '{"type":"fireworks","message":"Congratulations!"}'
    Start-Sleep -Seconds 9
}

function Run-Flame {
    Write-Host "--- Flame ---" -ForegroundColor Cyan
    Send '{"type":"visibility","visibility":"persistent"}'
    Start-Sleep -Milliseconds 500
    Send '{"type":"flame","message":"On fire!"}'
    Start-Sleep -Seconds 7
}

function Run-Keyboard {
    Write-Host "--- Keyboard: typing mode (Ctrl-C to quit) ---" -ForegroundColor Cyan
    Send '{"type":"visibility","visibility":"persistent"}'
    Send '{"type":"window_size","size":"assistant_typing"}'
    Send '{"type":"assistant_state","active":true,"input_mode":"type","compact":false,"conversation_id":"conv_1","user_prompt":"Tell me about the weather in SF","messages":[{"id":"m1","content":"Currently 62F in San Francisco with partly cloudy skies.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
    while (-not $proc.HasExited) { Start-Sleep -Seconds 1 }
}

# Wait for ready
Start-Sleep -Milliseconds 500

try {
    switch ($Mode) {
        "dictation"  { Run-Dictation }
        "assistant"  { Run-Assistant }
        "flash"      { Run-Flash }
        "fireworks"  { Run-Fireworks }
        "flame"      { Run-Flame }
        "keyboard"   { Run-Keyboard }
        default {
            Run-Dictation
            Start-Sleep -Milliseconds 500
            Run-Assistant
            Write-Host "--- Final recording ---" -ForegroundColor Cyan
            Send '{"type":"phase","phase":"recording"}'
            Emit-Levels 1.5 0.5 0.4
            Send '{"type":"phase","phase":"loading"}'
            Start-Sleep -Milliseconds 1500
            Send '{"type":"phase","phase":"idle"}'
            Start-Sleep -Seconds 1
        }
    }

    if ($Mode -ne "keyboard") {
        Send '{"type":"quit"}'
    }
}
finally {
    $writer.Close()
    if (-not $proc.HasExited) {
        $proc.WaitForExit(3000)
        if (-not $proc.HasExited) { $proc.Kill() }
    }
    Pop-Location
}
