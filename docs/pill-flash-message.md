# Pill Flash Message

A flash message is a temporary notification that appears above the pill in dictation mode. It replaces the language/style switcher tooltip while visible, then smoothly disappears and returns control to the tooltip.

This feature was implemented for the macOS pill (`packages/rust_macos_pill`). This document specifies the behavior, layout, animation, and IPC contract so the same feature can be replicated in the GTK pill (`packages/rust_gtk_pill`) and any future platform implementations.

## IPC Message

```json
{"type": "flash_message", "message": "Copied to clipboard"}
```

| Field     | Type   | Description                        |
| --------- | ------ | ---------------------------------- |
| `message` | string | The text to display in the banner. |

Add `FlashMessage { message: String }` to the `InMessage` enum (serde tag: `flash_message`). There is no outbound message — this is fire-and-forget from the host.

When a new `flash_message` arrives while one is already showing, it replaces the current message and resets the timer.

## Behavior

- Flash messages only appear in **dictation mode** (not assistant mode).
- While a flash message is visible, the **style/language switcher tooltip is hidden**. Once the flash fades out, the tooltip resumes normal behavior.
- The message is non-interactive — no click regions are registered.
- There is no queue; a new flash message replaces any active one.

## State

Add the following fields to `PillState`:

| Field            | Type           | Default          | Description                                           |
| ---------------- | -------------- | ---------------- | ----------------------------------------------------- |
| `flash_message`  | `String`       | `""` (empty)     | The current message text.                             |
| `flash_visible`  | `bool`         | `false`          | Whether the display timer is active.                  |
| `flash_t`        | `f64`          | `0.0`            | Spring-animated progress `0.0 → 1.0` (appear/disappear). |
| `flash_velocity` | `f64`          | `0.0`            | Spring velocity for `flash_t`.                        |
| `flash_timer`    | `f64` (seconds) | `0.0`           | Countdown — when it reaches 0, `flash_visible` becomes false. |

### IPC handler

When `FlashMessage { message }` is received:

```
state.flash_message  = message
state.flash_visible  = true
state.flash_timer    = FLASH_DURATION   // 2.5 seconds
```

## Constants

| Constant          | Value  | Description                                               |
| ----------------- | ------ | --------------------------------------------------------- |
| `FLASH_DURATION`  | `2.5`  | Seconds the message stays visible before fading out.      |
| `FLASH_HEIGHT`    | `32.0` | Height of the flash banner (matches tooltip height).      |
| `FLASH_RADIUS`    | `12.0` | Corner radius (matches tooltip radius).                   |
| `FLASH_GAP`       | `6.0`  | Vertical gap between the pill's top edge and the banner's bottom edge. |
| `FLASH_PADDING_H` | `16.0` | Horizontal padding on each side of the text.              |
| `FLASH_MIN_SCALE` | `0.5`  | Initial scale factor when appearing (50%).                |

## Animation

### Tick logic (runs every frame)

```
if flash_visible:
    flash_timer -= dt
    if flash_timer <= 0:
        flash_visible = false
        flash_timer = 0

flash_target = 1.0 if flash_visible else 0.0
spring_anim(flash_t, flash_velocity, flash_target, SPRING_STIFFNESS, dt)
```

The spring animation is identical to the existing tooltip, panel, and expand animations:

```
stiffness = 200.0
damping   = 2 * sqrt(stiffness)    // critically damped
force     = stiffness * (target - value) - damping * velocity
velocity += force * dt
value    += velocity * dt
```

Settle threshold: snap to target when `|value - target| < 0.002` and `|velocity| < 0.5`.

This produces a smooth ease-in on appear and a smooth ease-out on disappear, with no overshoot.

### Visual properties derived from `flash_t`

| Property     | Formula                                     | At `flash_t=0` | At `flash_t=1` |
| ------------ | ------------------------------------------- | --------------- | --------------- |
| Scale        | `FLASH_MIN_SCALE + (1 - FLASH_MIN_SCALE) * flash_t` | 0.50 (50%)  | 1.00 (100%)     |
| Opacity (bg) | `0.92 * flash_t`                            | 0.0 (invisible) | 0.92            |
| Opacity (text)| `0.9 * flash_t`                            | 0.0 (invisible) | 0.9             |

The scale transform is applied around the **center** of the banner (not the corner), so it grows outward symmetrically.

## Layout & Positioning

The flash banner is anchored to the **pill's current top edge**, not to a fixed position. This means it smoothly tracks the pill as it expands and collapses.

```
(_, pill_y, _, _) = pill_position(state, ww, wh)

flash_w  = max(text_width + FLASH_PADDING_H * 2, 80.0)
flash_x  = (window_width - flash_w) / 2.0        // horizontally centered
flash_y  = pill_y - FLASH_GAP - FLASH_HEIGHT      // above the pill
```

Where `pill_position()` returns the pill's animated position based on `expand_t`. In dictation mode, the pill Y is:

```
collapsed_bottom = 4.0
expanded_bottom  = (PILL_AREA_HEIGHT - EXPANDED_PILL_HEIGHT) / 2.0
bottom_offset    = lerp(collapsed_bottom, expanded_bottom, expand_t)
pill_y           = window_height - bottom_offset - pill_height
```

So when the pill is collapsed (small, near the bottom), the flash sits lower. When expanded (recording/hovered), it rises with the pill.

### Width behavior

The banner width is **dynamic** — it sizes to fit the message text:

```
flash_w = max(text_extents.width + FLASH_PADDING_H * 2, 80.0)
```

Minimum width is 80px to prevent absurdly narrow banners on short messages.

## Drawing

### Render order in `draw_all()`

The flash message and tooltip are **mutually exclusive** — only one draws per frame:

```
if not assistant_mode:
    if flash_t > 0.01:
        draw_flash_message(...)
    else:
        draw_tooltip(...)
```

This means:
- When a flash appears, the tooltip immediately stops drawing.
- When a flash fades out (`flash_t` settles below `0.01`), the tooltip resumes.
- If the user is hovering (tooltip would normally show), the flash takes priority.

### Drawing steps

1. **Measure text** — `sans-serif`, bold, 12px. Get extents to compute width.
2. **Compute position** — Using pill anchor + gap.
3. **Apply scale transform** — `save()`, translate to center, scale by `scale`, translate back.
4. **Draw background** — Rounded rect, fill with `rgba(0, 0, 0, 0.92 * flash_t)`.
5. **Draw text** — Centered in the banner, `rgba(1, 1, 1, 0.9 * flash_t)`, sans-serif bold 12px.
6. **Restore** — Pop the scale transform.

### Visual appearance

```
┌──────────────────────────────┐
│   Copied to clipboard        │  ← 32px tall, 12px radius corners
└──────────────────────────────┘
           6px gap
     ┌──────────────────┐
     │   ◉ pill ◉       │         ← Pill (expanded or collapsed)
     └──────────────────┘
```

- Background: solid black, 92% opacity (matches tooltip and pill styling).
- Text: white, 90% opacity, sans-serif bold 12px (matches tooltip text style).
- The banner has no border (unlike the pill which has a subtle white border). This is intentional to keep it lightweight and toast-like.

## Testing

The `test.sh` script accepts a `flash` mode:

```bash
./test.sh flash
```

This runs through:

1. **Idle flash** — Pill is idle/persistent, flash message appears and disappears.
2. **Flash during recording** — Flash appears while waveform is active, demonstrating pill-anchored positioning at the expanded height.
3. **Longer message** — Tests dynamic width sizing.
4. **Tooltip recovery** — After all flashes, sets style info and starts recording to verify the tooltip reappears normally.

### Manual IPC testing

Pipe JSON directly to the pill binary:

```bash
echo '{"type":"visibility","visibility":"persistent"}' | cargo run
# In another terminal or via a script:
echo '{"type":"flash_message","message":"Hello world"}'
```

## Platform implementation notes

### GTK pill (`rust_gtk_pill`)

The GTK pill shares the same file structure (`ipc.rs`, `state.rs`, `constants.rs`, `draw.rs`, `input.rs`). To implement:

1. **`ipc.rs`** — Add `FlashMessage { message: String }` to `InMessage`.
2. **`state.rs`** — Add the 5 flash state fields listed above.
3. **`constants.rs`** — Add the 6 flash constants listed above.
4. **Main event handler** — Handle `InMessage::FlashMessage` by setting message, visible, and timer.
5. **Tick function** — Add timer countdown + `spring_anim` call for `flash_t`.
6. **`draw.rs`** — Add `draw_flash_message()` with the same layout math. In the main draw dispatch, check `flash_t > 0.01` and draw flash instead of tooltip. The GTK pill uses Cairo for drawing, which has the same `save`/`translate`/`scale`/`restore` primitives.
7. **`test.sh`** — Add the `flash` test mode.

### Windows pill (future)

Follow the same spec. The critical pieces are:
- The spring animation parameters (stiffness 200, critical damping).
- The scale-from-center transform on appear/disappear.
- Anchoring to the pill's animated Y position, not a fixed coordinate.
- Mutual exclusion with the tooltip in the draw pass.
