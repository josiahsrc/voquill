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
    Write-Host "--- Flash: info toast (no action) ---" -ForegroundColor Cyan
    Send '{"type":"visibility","visibility":"persistent"}'
    Start-Sleep -Seconds 1
    Send '{"type":"toast","message":"Copied to clipboard","toast_type":"info","duration":null,"action":null,"action_label":null}'
    Start-Sleep -Seconds 4

    Write-Host "--- Flash: during recording ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"recording"}'
    Emit-Levels 1 0.4 0.4
    Send '{"type":"toast","message":"Style changed to Casual","toast_type":"info","duration":null,"action":null,"action_label":null}'
    Emit-Levels 3 0.35 0.45
    Send '{"type":"phase","phase":"idle"}'
    Start-Sleep -Seconds 2

    Write-Host "--- Flash: longer message ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Your trial has been extended by 7 days","toast_type":"info","duration":null,"action":null,"action_label":null}'
    Start-Sleep -Seconds 4

    Write-Host "--- Flash: info with action button ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Version 2.1.0 is ready to install","toast_type":"info","duration":8.0,"action":"surface_window","action_label":"Open"}'
    Start-Sleep -Seconds 10

    Write-Host "--- Flash: error with action button ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Chat request failed","toast_type":"error","duration":5.0,"action":"open_agent_settings","action_label":"Fix"}'
    Start-Sleep -Seconds 7

    Write-Host "--- Flash: cancel action ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Press cancel again to discard transcript","toast_type":"info","duration":5.0,"action":"confirm_cancel_transcription","action_label":"Yes, cancel"}'
    Start-Sleep -Seconds 7

    Write-Host "--- Flash: dismiss test ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"This will be dismissed early","toast_type":"info","duration":10.0,"action":"upgrade","action_label":"Upgrade"}'
    Start-Sleep -Seconds 3
    Send '{"type":"dismiss_toast"}'
    Start-Sleep -Seconds 2

    Write-Host "--- Flash: back to tooltip ---" -ForegroundColor Cyan
    Send '{"type":"style_info","count":3,"name":"Professional"}'
    Send '{"type":"phase","phase":"recording"}'
    Emit-Levels 2 0.4 0.4
    Send '{"type":"phase","phase":"idle"}'
    Start-Sleep -Seconds 2
}

function Run-Toast {
    Write-Host "--- Toast: info, no action, default duration ---" -ForegroundColor Cyan
    Send '{"type":"visibility","visibility":"persistent"}'
    Start-Sleep -Seconds 1
    Send '{"type":"toast","message":"Added \"hello\" to dictionary","toast_type":"info","duration":null,"action":null,"action_label":null}'
    Start-Sleep -Seconds 4

    Write-Host "--- Toast: error, no action ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Recording failed","toast_type":"error","duration":null,"action":null,"action_label":null}'
    Start-Sleep -Seconds 4

    Write-Host "--- Toast: info with action button (click it!) ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Version 2.1.0 is ready to install","toast_type":"info","duration":8.0,"action":"surface_window","action_label":"Open"}'
    Start-Sleep -Seconds 10

    Write-Host "--- Toast: error with action button ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Chat request failed","toast_type":"error","duration":5.0,"action":"open_agent_settings","action_label":"Fix"}'
    Start-Sleep -Seconds 7

    Write-Host "--- Toast: info with cancel action ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Press cancel again to discard transcript","toast_type":"info","duration":5.0,"action":"confirm_cancel_transcription","action_label":"Yes, cancel"}'
    Start-Sleep -Seconds 7

    Write-Host "--- Toast: info with upgrade action ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Upgrade to continue without limits","toast_type":"info","duration":8.0,"action":"upgrade","action_label":"Upgrade"}'
    Start-Sleep -Seconds 10

    Write-Host "--- Toast: custom short duration (1.5s) ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Saved","toast_type":"info","duration":1.5,"action":null,"action_label":null}'
    Start-Sleep -Seconds 3

    Write-Host "--- Toast: custom long duration (10s) + dismiss ---" -ForegroundColor Cyan
    Send '{"type":"toast","message":"Recording will stop in 60 seconds","toast_type":"info","duration":10.0,"action":null,"action_label":null}'
    Start-Sleep -Seconds 5
    Send '{"type":"dismiss_toast"}'
    Start-Sleep -Seconds 3

    Write-Host "--- Toast: during recording with action ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"recording"}'
    Emit-Levels 1 0.4 0.4
    Send '{"type":"toast","message":"Recording stopped: duration limit reached","toast_type":"info","duration":5.0,"action":"surface_window","action_label":"Open"}'
    Emit-Levels 3 0.35 0.45
    Send '{"type":"phase","phase":"idle"}'
    Start-Sleep -Seconds 3
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

function Run-FlameBug {
    Write-Host "--- Flame bug: tongues spread wide when pill is expanded ---" -ForegroundColor Cyan
    Send '{"type":"visibility","visibility":"persistent"}'
    Start-Sleep -Milliseconds 500

    Write-Host "--- Flame bug: normal flame (pill collapsed) for comparison ---" -ForegroundColor Cyan
    Send '{"type":"flame","message":"Normal flame (collapsed pill)"}'
    Start-Sleep -Seconds 6

    Write-Host "--- Flame bug: starting recording to expand the pill ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"recording"}'
    Emit-Levels 1 0.4 0.4

    Write-Host "--- Flame bug: firing flame WHILE pill is expanded (recording) ---" -ForegroundColor Cyan
    Send '{"type":"flame","message":"Wide flame (expanded pill)"}'
    Start-Sleep -Seconds 2

    Write-Host "--- Flame bug: stopping recording - pill contracts but tongues stay wide ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"idle"}'
    Start-Sleep -Seconds 5

    Write-Host "--- Flame bug: loading phase (also expands pill) ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"loading"}'
    Start-Sleep -Milliseconds 500

    Write-Host "--- Flame bug: firing flame during loading ---" -ForegroundColor Cyan
    Send '{"type":"flame","message":"Wide flame (loading)"}'
    Start-Sleep -Milliseconds 1500

    Write-Host "--- Flame bug: back to idle - tongues should look too spread out ---" -ForegroundColor Cyan
    Send '{"type":"phase","phase":"idle"}'
    Start-Sleep -Seconds 5
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
        "toast"      { Run-Toast }
        "fireworks"  { Run-Fireworks }
        "flame"      { Run-Flame }
        "flame_bug"  { Run-FlameBug }
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
