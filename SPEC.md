# Terminal plugin behavior contract

Contract id: soksak-spec-plugin-terminal, version 0.0.19.

This contract defines behavior shared by terminal plugins. It is not the generic plugin manifest
format and it defines no terminal engine, renderer or provider selection.

## Lifecycle

A terminal plugin publishes one phase from the exported phase set. Mount and unmount own
presentation resources only. Explicit close ends the PTY and retires recovery state. Application
shutdown releases connections and preserves sidecar-owned processes.

A pane accepts one recovery attempt and one PTY process generation. Results from another attempt
or generation are rejected. An archived screen rejects input until an explicit new-shell operation
succeeds. A retained raw tail is reported as degraded and never as complete restoration.

## Panes

A view holds one or more panes. A pane key is `<viewId>.<k>` (`PANE_KEY_RE`): the view id, one
dot, and a positive integer `k` that the view never reuses. Every common command accepts `view`
and, unless it addresses the whole view, `pane`. `pane` wins; `view` resolves to the focused pane
of that view; a command with neither resolves to the focused pane of the caller's view.

`status` and `recovery-status` report `view`, `pane` and `panes`, one summary per pane
(`pane`, `engineId`, `phase`, `cols`, `rows`, `offset`, `historySize`, `followMode`, `title`, `cwd`).
`split` opens a new pane beside the addressed one and focuses it. `pane.close` closes one pane;
the last pane of a view is not closed by the plugin, the host closes the view. `pane.focus` moves
focus by key, by direction (`dir`) or by order (`cycle`). `pane.resize` moves the gutter at one
side of a pane by pixels or by cells. `pane.equalize`, `pane.maximize`, `pane.broadcast` and
`pane.title` act on the view or one pane and answer with the resulting state. `scroll` moves the
viewport of one pane into history by lines, to an absolute offset, or to an edge. The answer contains
the applied offset, history size, and `followMode`: offset zero is `follow`, a positive offset is
`pinned`. `selection` returns the selected screen text of one pane.
`copy` writes that selected text through the host clipboard permission. `paste` accepts explicit
text for automation or reads the granted host clipboard and passes it through bracketed-paste mode
when the engine reports that mode. `drop` accepts host-issued file grants, never arbitrary paths;
path mode writes safely quoted paths to the PTY and inline mode is accepted only when the engine
declares the requested image protocol.

A file grant is an opaque non-empty string bound by the host to the addressed Plugin and window.
Only the host file-grant capability can redeem it. Redemption returns the raw `path` authorized by
that grant. Terminal Kit quotes that path for the declared pane login shell; Core owns neither shell
families nor command syntax. The Plugin never accepts a command-supplied raw path.
An unknown, expired or differently owned grant is refused. Inline mode consumes only a redeemed
inline payload whose protocol the presenter declares and never falls back to path mode.
`read` returns the addressed pane's current viewport; `lines` limits the answer to the last N
viewport rows. Reading history requires `scroll` followed by `read`, and renderer cache retention
never changes the answer.
`input.compose` injects an input-method composition and is an injection like `send`.

Instance nodes are `<id>/<k>`: `terminal-screen/2` is the screen of pane `k = 2`, `pane/2` its
wrapper and `gutter/2/right` the gutter at its right edge. A view laid out as a single bare pane
keeps the bare ids.

## Public surfaces

Every implementation exposes the exported standard commands and node ids. Status includes the
phase, recovery outcome, fidelity, implementation identity and any failure. Native renderers expose
document proxy nodes that route input through the generic surface capability.
Resize status always contains the plugin host's current CSS-pixel size and explicitly reports each
completed boundary: requested PTY size, PTY observation, recovery observation and rendered frame.
An unavailable boundary is `null`; omission is invalid. PTY and recovery observations include the
source event sequence and absolute output sequence. Rendered state includes the absolute output
sequence actually applied by the renderer. Recovery also includes the observed gap count. These
coordinates identify the first boundary that failed to advance; reporting a later coordinate before
that boundary completed is invalid.
`operation` names the current lifecycle operation. Raw sidecar responses and duplicate top-level
columns or rows are not part of status; the five boundary fields are the only resize evidence.
Presentation status also reports `bracketedPaste`, selection `{active,text}`, clipboard permission
`{read,write}`, and drop `{fileGrantState,last}`. `last` is null before a drop and otherwise records
accepted/refused counts and the exact `path|inline` mode. DOM proxy nodes publish the same state and
dispatch selection, clipboard and drop accepted/refused events.
Cursor status is engine state, not adapter parsing: `cursorShape` is `block|underline|bar`,
`cursorBlinking` is the DECSCUSR/engine result, `cursorVisible` is the engine's ?25 state, and
`cursorAnimation {intervalMs,phase}` reports the renderer policy and current `steady|on|off` phase.
Theme status is four explicit fields: `themeMode` is the host's `light|dark` fact; `baseTheme` is
the host palette; `terminalOverrides` contains nullable OSC 10/11/12 colors and exactly 256
nullable OSC 4 entries; `effectiveTheme` is their resolved result. Every color is lowercase
`#rrggbb`. A non-null terminal override wins over the base. OSC 104/110/111/112 reset an entry to
null, so the current base becomes effective immediately; a later host mode change replaces the
base and preserves only still-active terminal overrides. Background luminance never infers the
mode. A changed effective value dispatches `soksak:terminal-colors` with the pane and the same four
status fields. Adapters do not parse OSC or run a second theme state machine.
`TERMINAL_PLUGIN_COMMAND_SCHEMAS` defines the closed input and output object for each common
command. A plugin may add commands in its own namespace, but it cannot remove a common command,
change its danger level, accept undeclared fields or weaken its required output.
`wait` subscribes to lifecycle changes and returns when the requested phase is reached or its
declared timeout expires. It does not sample status on an interval. `idleMs` adds one more
condition: no output arrived for that long.
Size waits may require exact columns, columns below a boundary, or columns above a boundary. All
three resolve from the current rendered state or its size-change event, never by interval sampling.

## Native surface delivery

A native-surface renderer paints outside the document, so the document keeps proxy nodes:
`terminal-screen/<k>` is a document proxy for the painted surface and `terminal-input/<k>` still
accepts key automation, which reaches the PTY through the plugin's own write path. Pointer
gestures route through the generic surface capability to the surface owner. The rendered
observation merges the painter's applied output sequence with the app-side placement state;
document pixels are never the evidence.

The app's surface door accepts `TERMINAL_SURFACE_DELIVER_VERBS` for one surface: `snapshot`,
`state`, `read`, `scroll`, `pointer`, `wheel`, `selection`, `focus`, `input`, `theme`, `stop` and `archive`.
`snapshot` answers the current pixels for parking, `state` answers the merged counters, `input`
is an injection like `send`, and `stop` carries the close-or-detach intent. An unknown verb is
refused by name, never mapped to a nearest one.
`wheel` preserves the surface-relative point, delta unit and modifiers and returns the
engine-selected scrollback, mouse-report, alternate-scroll or ignored route. The Plugin does not
encode terminal mouse bytes.
`pointer` preserves phase, physical button, click count, surface-relative point and modifiers and
returns the engine-selected mouse-report or ignored route. Shift keeps local selection.
Surface delivery is neither bytes nor a frame: presentation `delivery` reports `surface` and the
painted evidence stays outside the document.

## Presentation

The web and native-surface profiles implement the same keyboard, IME, pointer, selection,
clipboard, resize, theme, accessibility, capture and failure behavior. Engine-specific settings
and commands remain owned by the implementation.

## Terminal v1 baseline

This list is a completeness floor. It bounds what a conforming implementation must offer, not
how many settings it may expose.
A conforming Terminal v1 implements these ordinary terminal capabilities with
usable defaults and exposes only settings a real user can choose:

| component | required public behavior | ownership |
| --- | --- | --- |
| input and IME | key/text input, composition, exact PTY write receipt, bracketed paste from engine mode | Plugin/Kit; engine owns modes |
| selection and clipboard | selection state/event, copy, paste, clipboard permission and refusal | Plugin/Kit; host owns OS clipboard |
| file and image drop | drop target, accepted/refused event, quoted file-path input; image-file drop is distinct from inline image display | Plugin/Kit; host grants files |
| TUI pane control | caller-owned split, returned pane id, targeted run/send/list/close and lifecycle events | provider-independent host router to the installed terminal Plugin contract |
| scroll | history, offset, viewport, follow/pinned state and event-driven changes | engine supplies history; Plugin/Kit owns intent |
| cursor | engine shape/blink/visibility, user default and animation policy, focus presentation | engine state + renderer policy, never an adapter CSI parser |
| theme | dark/light base changes, OSC 4/10/11/12 overrides and resets, effective theme status | host base + engine overrides + shared renderer |
| performance | bounded history/cache, row damage, ring reuse, input/write/paint latency and zero-gap evidence | each owner tests its boundary; installed product tests composition |
| inline images | declared Kitty graphics, iTerm2 OSC 1337 or Sixel capability when the selected engine actually implements it | optional engine capability; no fake fallback |

Basic components above `inline images` are required. Inline image protocols are capability-gated:
an implementation that does not parse one reports it unavailable instead of adding a private
partial parser. File/image drop still works as path input without inline display.

### TUI-to-host pane control

Soksak exposes an opt-in compatibility profile for processes that need to create and control panes.
The profile authenticates the caller, assigns a stable pane identity, and translates requests to the
installed terminal Plugin's public `split`, `send`, `read`, `pane.list`, `pane.focus`, and
`pane.close` commands. It implements only the request forms declared and tested by that profile;
an unknown command is refused.

The current profile exports only the exact compatibility wire its consumer requires: opt-in state,
stable `TMUX` and `TMUX_PANE` values, `TERM=screen-256color`, and an authenticated absolute shim
executable backed by an absolute, authenticated Soksak CLI. Its closed command set is
`split-window`, `respawn-pane`, `send-keys`, `capture-pane`, and `kill-pane`. These are Soksak
profile fields; they do not define Core or Plugin behavior.

A replacement is transactional. Soksak confirms that the placeholder process stopped, recreates the
pane from the same origin and direction, and preserves its compatibility identity. Failure to
confirm process stop preserves the pane record and refuses replacement. Every child pane receives
its own identity; the group id and an unguessable token authorize requests. Relative or cwd-resolved
shim executables are refused.

Core provides routing and process environment but never imports the Plugin or edits its split tree.
Parallel creates are serialized, and a missing or stale caller/pane identity is a named refusal,
not a fallback to the currently focused pane. A profile exists only for an active consumer; no
unused adapter is prebuilt.
