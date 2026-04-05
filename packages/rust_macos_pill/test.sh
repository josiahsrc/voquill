#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
cargo build --quiet 2>&1

MODE="${1:-both}"  # dictation | assistant | flash | toast | fireworks | flame | both

emit_levels() {
  local duration=$1 base_amp=${2:-0.4} variance=${3:-0.4}
  local frames=$(awk "BEGIN{printf \"%d\", $duration / 0.066}")
  for i in $(seq 1 "$frames"); do
    a=$(awk "BEGIN{printf \"%.2f\", $base_amp + $variance * sin($i * 0.15)}")
    b=$(awk "BEGIN{printf \"%.2f\", $base_amp + $variance * sin($i * 0.2 + 1)}")
    c=$(awk "BEGIN{printf \"%.2f\", $base_amp + $variance * sin($i * 0.25 + 2)}")
    echo "{\"type\":\"levels\",\"levels\":[$a,$b,$c]}"
    sleep 0.066
  done
}

run_dictation() {
  echo '--- Dictation: recording with style selector ---' >&2
  echo '{"type":"visibility","visibility":"persistent"}'
  echo '{"type":"style_info","count":3,"name":"Professional"}'
  echo '{"type":"phase","phase":"recording"}'
  emit_levels 3 0.35 0.45

  echo '--- Dictation: loading ---' >&2
  echo '{"type":"phase","phase":"loading"}'
  sleep 2

  echo '--- Dictation: idle (hover to see tooltip) ---' >&2
  echo '{"type":"phase","phase":"idle"}'
  echo '{"type":"style_info","count":3,"name":"Casual"}'
  sleep 2

  echo '--- Dictation: second recording (hover for cancel button) ---' >&2
  echo '{"type":"phase","phase":"recording"}'
  emit_levels 2 0.5 0.3
  echo '{"type":"phase","phase":"idle"}'
  sleep 1
}

run_assistant() {
  # Compact — no messages
  echo '--- Assistant: compact (no messages) ---' >&2
  echo '{"type":"visibility","visibility":"persistent"}'
  echo '{"type":"window_size","size":"assistant_compact"}'
  echo '{"type":"assistant_state","active":true,"input_mode":"voice","compact":true,"conversation_id":"conv_1","user_prompt":null,"messages":[],"streaming":null,"permissions":[]}'
  sleep 1

  echo '--- Assistant: compact + recording ---' >&2
  echo '{"type":"phase","phase":"recording"}'
  emit_levels 2 0.4 0.5
  echo '{"type":"phase","phase":"loading"}'
  sleep 1.5

  # Expanded — thinking
  echo '--- Assistant: thinking ---' >&2
  echo '{"type":"phase","phase":"idle"}'
  echo '{"type":"window_size","size":"assistant_expanded"}'
  echo '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"Tell me about the weather ... in San Francisco today please","messages":[{"id":"m1","content":null,"is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":{"message_id":"m1","tool_calls":[],"reasoning":"Let me look up the current weather...","is_streaming":true},"permissions":[]}'
  sleep 1.5

  # Tool call
  echo '--- Assistant: using tool ---' >&2
  echo '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"Tell me about the weather ... in San Francisco today please","messages":[{"id":"m1","content":null,"is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":{"message_id":"m1","tool_calls":[{"id":"tc1","name":"get_weather","done":false}],"reasoning":"Let me look up the current weather...","is_streaming":true},"permissions":[]}'
  sleep 1.5

  # Response
  echo '--- Assistant: response ---' >&2
  echo '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"Tell me about the weather ... in San Francisco today please","messages":[{"id":"m1","content":"It'\''s currently **62°F** (17°C) in San Francisco with partly cloudy skies.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
  sleep 2

  # Multiple messages
  echo '--- Assistant: multiple messages ---' >&2
  echo '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"Tell me about the weather ... in San Francisco today please","messages":[{"id":"m1","content":"It'\''s currently **62°F** (17°C) in San Francisco with partly cloudy skies.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null},{"id":"m2","content":null,"is_error":false,"is_tool_result":true,"tool_name":"get_forecast","tool_description":"Get weather forecast","reason":"Checking weekly outlook"},{"id":"m3","content":"The forecast for the rest of the week:\n\n- Tuesday: 65°F, sunny\n- Wednesday: 58°F, fog\n- Thursday: 61°F, partly cloudy\n- Friday: 63°F, clear","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
  sleep 2.5

  # Second voice turn
  echo '--- Assistant: second voice turn ---' >&2
  echo '{"type":"phase","phase":"recording"}'
  emit_levels 2 0.45 0.35
  echo '{"type":"phase","phase":"loading"}'
  sleep 1.5
  echo '{"type":"phase","phase":"idle"}'
  echo '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"What should I wear ... for that weather this week","messages":[{"id":"m1","content":"It'\''s currently **62°F** (17°C) in San Francisco with partly cloudy skies.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null},{"id":"m2","content":null,"is_error":false,"is_tool_result":true,"tool_name":"get_forecast","tool_description":"Get weather forecast","reason":"Checking weekly outlook"},{"id":"m3","content":"The forecast for the rest of the week:\n\n- Tuesday: 65°F, sunny\n- Wednesday: 58°F, fog\n- Thursday: 61°F, partly cloudy\n- Friday: 63°F, clear","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null},{"id":"m4","content":"I'\''d recommend **layers**! A light jacket or hoodie is essential for SF weather.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
  sleep 2

  # Permission prompt
  echo '--- Assistant: tool permission prompt ---' >&2
  echo '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"What should I wear ... for that weather this week","messages":[{"id":"m1","content":"It'\''s currently **62°F** (17°C) in San Francisco.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null},{"id":"m5","content":null,"is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":{"message_id":"m5","tool_calls":[],"reasoning":"","is_streaming":true},"permissions":[{"id":"perm_1","tool_name":"calendar_write","description":"Add event to calendar","reason":"Schedule outfit reminder"}]}'
  sleep 3

  # Error message
  echo '--- Assistant: error message ---' >&2
  echo '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"What should I wear ... for that weather this week","messages":[{"id":"m1","content":"It'\''s currently **62°F** (17°C) in San Francisco.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null},{"id":"m6","content":"Sorry, I encountered an error connecting to the weather service. Please try again.","is_error":true,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
  sleep 2

  # Typing mode
  echo '--- Assistant: typing mode (type + Enter to send) ---' >&2
  echo '{"type":"window_size","size":"assistant_typing"}'
  echo '{"type":"assistant_state","active":true,"input_mode":"type","compact":false,"conversation_id":"conv_1","user_prompt":"What should I wear ... for that weather this week","messages":[{"id":"m1","content":"It'\''s currently **62°F** (17°C) in San Francisco.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null},{"id":"m6","content":"Sorry, I encountered an error connecting to the weather service. Please try again.","is_error":true,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
  sleep 4

  # Back to voice
  echo '--- Assistant: back to voice ---' >&2
  echo '{"type":"window_size","size":"assistant_expanded"}'
  echo '{"type":"assistant_state","active":true,"input_mode":"voice","compact":false,"conversation_id":"conv_1","user_prompt":"What should I wear ... for that weather this week","messages":[{"id":"m1","content":"It'\''s currently **62°F** (17°C) in San Francisco.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null},{"id":"m7","content":"No problem! The weather service is back. Looks like a beautiful day ahead.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
  echo '{"type":"phase","phase":"recording"}'
  emit_levels 1.5 0.3 0.5
  echo '{"type":"phase","phase":"idle"}'
  sleep 1.5

  # Close assistant
  echo '--- Closing assistant ---' >&2
  echo '{"type":"window_size","size":"dictation"}'
  echo '{"type":"assistant_state","active":false,"input_mode":"voice","compact":true,"conversation_id":null,"user_prompt":null,"messages":[],"streaming":null,"permissions":[]}'
  sleep 1
}

run_flash() {
  echo '--- Flash: showing pill with toast messages ---' >&2
  echo '{"type":"visibility","visibility":"persistent"}'
  sleep 1

  echo '--- Flash: info toast (no action) ---' >&2
  echo '{"type":"toast","message":"Copied to clipboard","toast_type":"info","duration":null,"action":null,"action_label":null}'
  sleep 4

  echo '--- Flash: during recording ---' >&2
  echo '{"type":"phase","phase":"recording"}'
  emit_levels 1 0.4 0.4
  echo '{"type":"toast","message":"Style changed to Casual","toast_type":"info","duration":null,"action":null,"action_label":null}'
  emit_levels 3 0.35 0.45
  echo '{"type":"phase","phase":"idle"}'
  sleep 2

  echo '--- Flash: longer message ---' >&2
  echo '{"type":"toast","message":"Your trial has been extended by 7 days","toast_type":"info","duration":null,"action":null,"action_label":null}'
  sleep 4

  echo '--- Flash: info with action button ---' >&2
  echo '{"type":"toast","message":"Version 2.1.0 is ready to install","toast_type":"info","duration":8.0,"action":"surface_window","action_label":"Open"}'
  sleep 10

  echo '--- Flash: error with action button ---' >&2
  echo '{"type":"toast","message":"Chat request failed","toast_type":"error","duration":5.0,"action":"open_agent_settings","action_label":"Fix"}'
  sleep 7

  echo '--- Flash: cancel action ---' >&2
  echo '{"type":"toast","message":"Press cancel again to discard transcript","toast_type":"info","duration":5.0,"action":"confirm_cancel_transcription","action_label":"Yes, cancel"}'
  sleep 7

  echo '--- Flash: dismiss test ---' >&2
  echo '{"type":"toast","message":"This will be dismissed early","toast_type":"info","duration":10.0,"action":"upgrade","action_label":"Upgrade"}'
  sleep 3
  echo '{"type":"dismiss_toast"}'
  sleep 2

  echo '--- Flash: back to tooltip after flash ---' >&2
  echo '{"type":"style_info","count":3,"name":"Professional"}'
  echo '{"type":"phase","phase":"recording"}'
  emit_levels 2 0.4 0.4
  echo '{"type":"phase","phase":"idle"}'
  sleep 2
}

run_toast() {
  echo '--- Toast: all parameter combinations ---' >&2
  echo '{"type":"visibility","visibility":"persistent"}'
  sleep 1

  echo '--- Toast: info, no action, default duration ---' >&2
  echo '{"type":"toast","message":"Added \"hello\" to dictionary","toast_type":"info","duration":null,"action":null,"action_label":null}'
  sleep 4

  echo '--- Toast: error, no action ---' >&2
  echo '{"type":"toast","message":"Recording failed","toast_type":"error","duration":null,"action":null,"action_label":null}'
  sleep 4

  echo '--- Toast: info with action button (click it!) ---' >&2
  echo '{"type":"toast","message":"Version 2.1.0 is ready to install","toast_type":"info","duration":8.0,"action":"surface_window","action_label":"Open"}'
  sleep 10

  echo '--- Toast: error with action button ---' >&2
  echo '{"type":"toast","message":"Chat request failed","toast_type":"error","duration":5.0,"action":"open_agent_settings","action_label":"Fix"}'
  sleep 7

  echo '--- Toast: info with cancel action ---' >&2
  echo '{"type":"toast","message":"Press cancel again to discard transcript","toast_type":"info","duration":5.0,"action":"confirm_cancel_transcription","action_label":"Yes, cancel"}'
  sleep 7

  echo '--- Toast: info with upgrade action ---' >&2
  echo '{"type":"toast","message":"Upgrade to continue without limits","toast_type":"info","duration":8.0,"action":"upgrade","action_label":"Upgrade"}'
  sleep 10

  echo '--- Toast: custom short duration (1.5s) ---' >&2
  echo '{"type":"toast","message":"Saved","toast_type":"info","duration":1.5,"action":null,"action_label":null}'
  sleep 3

  echo '--- Toast: custom long duration (10s) ---' >&2
  echo '{"type":"toast","message":"Recording will stop in 60 seconds","toast_type":"info","duration":10.0,"action":null,"action_label":null}'
  sleep 5
  echo '--- Toast: dismiss mid-way ---' >&2
  echo '{"type":"dismiss_toast"}'
  sleep 3

  echo '--- Toast: during recording with action ---' >&2
  echo '{"type":"phase","phase":"recording"}'
  emit_levels 1 0.4 0.4
  echo '{"type":"toast","message":"Recording stopped: duration limit reached","toast_type":"info","duration":5.0,"action":"surface_window","action_label":"Open"}'
  emit_levels 3 0.35 0.45
  echo '{"type":"phase","phase":"idle"}'
  sleep 3
}

run_fireworks() {
  echo '--- Fireworks: celebration ---' >&2
  echo '{"type":"visibility","visibility":"persistent"}'
  sleep 0.5

  echo '--- Fireworks: launching ---' >&2
  echo '{"type":"fireworks","message":"Welcome to Voquill! 🎉"}'
  sleep 9

  echo '--- Fireworks: launching ---' >&2
  echo '{"type":"fireworks","message":"Congratulations!"}'
  sleep 9

  echo '--- Fireworks: second round ---' >&2
  echo '{"type":"fireworks","message":"You did it!"}'
  sleep 9
}

run_flame() {
  echo '--- Flame: pill on fire ---' >&2
  echo '{"type":"visibility","visibility":"persistent"}'
  sleep 0.5

  echo '--- Flame: igniting ---' >&2
  echo '{"type":"flame","message":"2 day streak 🔥"}'
  sleep 7

  echo '--- Flame: second round ---' >&2
  echo '{"type":"flame","message":"10 day streak! 🎉"}'
  sleep 7
}

run_keyboard() {
  echo '--- Keyboard: typing mode (Ctrl-C to quit) ---' >&2
  echo '{"type":"visibility","visibility":"persistent"}'
  echo '{"type":"window_size","size":"assistant_typing"}'
  echo '{"type":"assistant_state","active":true,"input_mode":"type","compact":false,"conversation_id":"conv_1","user_prompt":"Tell me about the weather ... in San Francisco today please","messages":[{"id":"m1","content":"It'\''s currently **62°F** (17°C) in San Francisco with partly cloudy skies.","is_error":false,"is_tool_result":false,"tool_name":null,"tool_description":null,"reason":null}],"streaming":null,"permissions":[]}'
  # Hold open until killed
  while true; do sleep 60; done
}

(
  sleep 0.5

  case "$MODE" in
    dictation)
      run_dictation
      ;;
    assistant)
      run_assistant
      ;;
    flash)
      run_flash
      ;;
    toast)
      run_toast
      ;;
    fireworks)
      run_fireworks
      ;;
    flame)
      run_flame
      ;;
    keyboard)
      run_keyboard
      ;;
    both|*)
      run_dictation
      sleep 0.5
      run_assistant
      # Final dictation to confirm pill is back to normal
      echo '--- Dictation: final recording ---' >&2
      echo '{"type":"phase","phase":"recording"}'
      emit_levels 1.5 0.5 0.4
      echo '{"type":"phase","phase":"loading"}'
      sleep 1.5
      echo '{"type":"phase","phase":"idle"}'
      sleep 1
      ;;
  esac

  echo '{"type":"quit"}'
) | cargo run --quiet
