# 터미널 플러그인 동작 계약

계약 ID는 `soksak-spec-plugin-terminal`, 버전은 `0.0.18`입니다.

이 계약은 터미널 플러그인이 공통으로 제공하는 수명 주기, 명령, 상태, 노출 노드를
정의합니다. 플러그인 매니페스트 형식, 터미널 엔진, 렌더러, 공급자 선택은 정의하지
않습니다.

## 수명 주기

플러그인은 계약이 정의한 단계 하나를 게시합니다. 마운트와 언마운트는 표시 자원만
소유합니다. 명시적 닫기는 PTY를 종료하고 복원 상태를 제거합니다. 앱 종료는 연결을
해제하고 사이드카가 소유한 프로세스는 유지합니다.

하나의 판은 하나의 복원 시도와 하나의 PTY 프로세스 세대만 사용합니다. 다른 시도나
세대의 결과는 거부합니다. 보관 화면은 새 셸 작업이 성공할 때까지 입력을 거부합니다.
원시 출력 꼬리만 남은 복원은 완전 복원이 아니라 저하 상태로 보고합니다.

## Pane

하나의 view는 pane을 하나 이상 가집니다. pane key는 view ID, 점, 다시 쓰지 않는 양의
정수로 구성된 `<viewId>.<k>`입니다. 공통 명령은 `view`와 해당되는 경우 `pane`을 받습니다.
`pane`이 우선하며 `view`는 그 view의 focus pane을 뜻합니다.

`status`와 `recovery-status`는 `view`, `pane`, pane별 `offset`, `historySize`, `followMode`를 포함한
요약 `panes`를 반환합니다.
`split`은 지정한 pane 옆에 새 pane을 열고 focus합니다. `pane.close`는 pane 하나를 닫으며
마지막 pane은 host가 view와 함께 닫습니다. `scroll`은 행 수, 절대 offset 또는 edge로
viewport를 history 안에서 이동하고 실제 offset, history size, `followMode`를 반환합니다. Offset 0은
`follow`, 양수 offset은 `pinned`입니다. `selection`은 선택한
화면 text를 반환합니다.

`copy`는 host clipboard permission을 통해 선택 text를 기록합니다. `paste`는 자동화가 준 명시적
text 또는 grant된 host clipboard를 읽고 engine이 bracketed-paste mode를 보고하면 그 mode를
따릅니다. `drop`은 임의 path가 아니라 host가 발급한 file grant를 받습니다. Path mode는 안전하게
quote한 path를 PTY에 쓰고 inline mode는 engine이 요청 image protocol capability를 선언한 경우만
수락합니다.

File grant는 대상 Plugin과 window에 host가 묶은 불투명한 빈 값이 아닌 문자열입니다. Host의 file-grant
capability만 redeem할 수 있습니다. Redeem 결과는 grant가 허용한 raw `path`를 반환합니다. Terminal Kit이 그 path를 quote하여
선언된 pane login shell의 입력 문법을 만들며 Core는 shell 종류나 command 문법을 소유하지 않습니다.
Plugin은 command가 전달한 raw path를 받지 않습니다. 알 수 없거나 만료됐거나 다른 소유자의
grant는 거부합니다. Inline mode는 presenter가 선언한 protocol의 redeem된 inline payload만 소비하고
path mode로 fallback하지 않습니다.

`read`는 지정한 pane의 현재 viewport를 반환하며 `lines`는 마지막 N개 viewport 행으로
응답을 제한합니다. history를 읽으려면 `scroll` 뒤에 `read`를 호출하며 renderer cache 보유 상태는 응답을 바꾸지 않습니다.
`input.compose`는 입력기 조합을 주입하며 `send`와 같은 injection입니다.

인스턴스 노드는 `<id>/<k>` 형식입니다. 예를 들어 `terminal-screen/2`는 pane 2의 화면입니다.
pane 하나만 있는 view는 접미사 없는 기본 ID를 유지합니다.

## 공개 표면

모든 구현은 계약의 공통 명령과 노드 ID를 노출합니다. 상태는 단계, 복원 결과, 충실도,
구현 식별자, 실패를 포함합니다. 크기 변경 상태는 플러그인 호스트의 현재 CSS 픽셀
크기와 완료된 각 경계를 항상 포함합니다: PTY 요청 크기, PTY 관측, 복원 사이드카 관측,
렌더된 프레임입니다. 아직 값이 없는 경계는 `null`이며 필드 누락은 허용하지 않습니다.
PTY와 복원 관측은 원본 이벤트 순서와 절대 출력 순서를 포함합니다. 렌더 상태는 실제로
적용을 끝낸 절대 출력 순서를 포함하고, 복원 관측은 gap 수를 추가로 포함합니다. 이 좌표로
처음 진행하지 않은 경계를 판정하며 앞 경계가 완료되기 전에 뒤 좌표를 보고하면 무효입니다.
`operation`은 현재 수명 주기 작업을 나타냅니다. 원시 사이드카 응답과 중복된 최상위
열·행은 상태에 포함하지 않으며 다섯 경계 필드만 크기 변경 근거로 사용합니다.

Presentation status는 `bracketedPaste`, selection `{active,text}`, clipboard permission
`{read,write}`, drop `{fileGrantState,last}`도 보고합니다. `last`는 drop 전에는 null이고 이후에는
accepted/refused 수와 정확한 `path|inline` mode를 기록합니다. DOM proxy node는 같은 상태를 공개하고
selection, clipboard, drop accepted/refused event를 발송합니다.
Cursor status는 adapter parsing이 아니라 engine state입니다. `cursorShape`은
`block|underline|bar`, `cursorBlinking`은 DECSCUSR/engine 결과, `cursorVisible`은 engine의 ?25 상태이며
`cursorAnimation {intervalMs,phase}`는 renderer policy와 현재 `steady|on|off` phase를 보고합니다.
Theme status는 네 필드로 명시합니다. `themeMode`는 host의 `light|dark` 사실이고, `baseTheme`은
host palette이며, `terminalOverrides`는 nullable OSC 10/11/12 색과 정확히 256개의 nullable OSC 4
항목을 담고, `effectiveTheme`은 이를 해소한 결과입니다. 모든 색은 소문자 `#rrggbb`입니다. null이
아닌 terminal override가 base보다 우선합니다. OSC 104/110/111/112 reset은 해당 항목을 null로
만들어 현재 base가 즉시 effective가 되게 합니다. 이후 host mode가 바뀌면 base만 교체하고 아직
활성인 terminal override만 유지합니다. 배경 명도로 mode를 추론하지 않습니다. effective 값이
바뀌면 pane과 같은 네 status 필드를 담은 `soksak:terminal-colors`를 발송합니다. Adapter는 OSC를
파싱하거나 두 번째 theme state machine을 만들지 않습니다.

`TERMINAL_PLUGIN_COMMAND_SCHEMAS`는 공통 명령의 닫힌 입력·출력 객체를 정의합니다.
플러그인은 자체 명령을 추가할 수 있지만 공통 명령을 제거하거나 위험 수준을 변경하거나
선언되지 않은 필드를 받거나 필수 출력을 약화할 수 없습니다. `wait`는 상태 변경을
구독하며 요청 단계 또는 명시된 제한 시간에 끝납니다. 주기적으로 상태를 조회하지
않습니다.
크기 대기는 정확한 열 수, 경계보다 작은 열 수, 경계보다 큰 열 수를 요구할 수 있습니다.
세 조건 모두 현재 렌더 상태 또는 크기 변경 사건으로 끝나며 주기적으로 조회하지 않습니다.

## 네이티브 표면 전달

네이티브 표면 렌더러는 문서 밖에서 그리므로 문서에는 proxy 노드를 유지합니다.
`terminal-screen/<k>`는 그려진 표면의 문서 proxy이고 `terminal-input/<k>`는 키 자동화를
계속 받아 플러그인 자신의 쓰기 경로로 PTY에 전달합니다. 포인터 제스처는 일반 표면
능력을 통해 표면 소유자에게 전달됩니다. 렌더 관측은 그리는 쪽이 적용한 절대 출력
순서와 앱 쪽 배치 상태를 병합하며 문서 픽셀은 근거가 아닙니다.

앱의 표면 문은 표면 하나에 대해 `TERMINAL_SURFACE_DELIVER_VERBS`를 받습니다:
`snapshot`, `state`, `read`, `scroll`, `pointer`, `wheel`, `selection`, `focus`, `input`, `theme`, `stop`, `archive`.
`snapshot`은 파킹용 현재 픽셀을, `state`는 병합된 계수를 반환하고 `input`은 `send`와 같은
injection이며 `stop`은 닫기·분리 의도를 담습니다. 모르는 verb는 이름과 함께 거부하며
가까운 것으로 해석하지 않습니다.
`wheel`은 surface 기준 point, delta unit, modifier를 보존하고 engine이 선택한 scrollback,
mouse-report, alternate-scroll, ignored route를 반환합니다. Plugin은 terminal mouse byte를 encode하지
않습니다.
`pointer`는 phase, 물리 button, click count, surface 기준 point, modifier를 보존하고 engine이 선택한
mouse-report 또는 ignored route를 반환합니다. Shift는 local selection을 유지합니다.
표면 배달은 바이트도 프레임도 아닙니다. presentation `delivery`는 `surface`를 보고하며
그려진 근거는 문서 밖에 있습니다.

## 표시

웹과 네이티브 표면은 키보드, IME, 포인터, 선택, 클립보드, 크기 변경, 테마, 접근성,
캡처, 실패 동작을 동일하게 구현합니다. 엔진별 설정과 명령은 각 구현이 소유합니다.

## Terminal v1 기본선

이 목록은 완성도 하한입니다. 적합한 구현이 무엇을 제공해야 하는지를 정할 뿐,
setting 을 몇 개까지 노출할지는 정하지 않습니다.
Terminal v1 구현은 다음의 일반적인 터미널 기능을 쓸 수 있는 기본값으로 제공하고
실제 사용자가 선택할 설정만 노출합니다.

| component | 필수 공개 동작 | 소유권 |
| --- | --- | --- |
| input과 IME | key/text 입력, 조합, exact PTY write receipt, engine mode를 따르는 bracketed paste | Plugin/Kit; mode는 engine 소유 |
| selection과 clipboard | selection 상태/event, copy, paste, clipboard permission과 거부 | Plugin/Kit; OS clipboard는 host 소유 |
| file과 image drop | drop target, 수락/거부 event, 인용된 file path 입력; image file drop과 inline image 표시는 별개 | Plugin/Kit; host가 file grant 소유 |
| TUI pane control | caller 소유 split, 반환 pane id, targeted run/send/list/close와 lifecycle event | provider 독립 host router가 설치된 terminal Plugin contract로 전달 |
| scroll | history, offset, viewport, follow/pinned 상태와 event-driven 변경 | history는 engine, intent는 Plugin/Kit 소유 |
| cursor | engine shape/blink/visibility, user default와 animation policy, focus 표시 | engine state + renderer policy; adapter CSI parser 금지 |
| theme | dark/light base 변경, OSC 4/10/11/12 override/reset, effective theme 상태 | host base + engine override + 공통 renderer |
| performance | bounded history/cache, row damage, ring reuse, input/write/paint latency와 zero-gap 근거 | 각 owner가 자기 경계, 설치 제품이 composition 검증 |
| inline image | 선택된 engine이 실제 구현한 Kitty graphics, iTerm2 OSC 1337 또는 Sixel capability | 선택 capability; 가짜 fallback 금지 |

`inline image` 위의 기본 component는 필수입니다. Inline image protocol은 capability로 구분합니다.
구현하지 않은 parser를 private하게 일부 만들지 않고 unavailable을 보고합니다. Inline 표시를 하지
않아도 file/image drop의 path 입력은 동작합니다.

### TUI에서 host로 pane 제어

Soksak은 pane 생성과 제어가 필요한 process를 위해 opt-in compatibility profile을 공개합니다. Profile은
caller를 인증하고 stable pane identity를 발급한 뒤 설치 terminal Plugin의 공개 `split`, `send`, `read`,
`pane.list`, `pane.focus`, `pane.close` 명령으로 요청을 번역합니다. Profile이 선언하고 테스트한 요청만
처리하며 모르는 command는 거부합니다.

현재 profile은 consumer에 필요한 정확한 compatibility wire만 공개합니다. opt-in 상태, stable `TMUX`와
`TMUX_PANE`, `TERM=screen-256color`, absolute authenticated Soksak CLI가 실행하는 shim이 그 전부입니다.
닫힌 command 집합은 `split-window`, `respawn-pane`, `send-keys`, `capture-pane`, `kill-pane`입니다. 이 값들은
Soksak profile 필드이며 Core나 Plugin 동작을 정의하지 않습니다.

Replacement는 transaction입니다. Soksak은 placeholder process의 stop을 확인하고 같은 origin과
direction에서 pane을 다시 만들며 compatibility identity를 보존합니다. Stop 확인 실패는 pane record를
보존하고 replacement를 거부합니다. 각 child pane은 자기 identity를 받고 group id와 추측 불가능한
token이 요청을 승인합니다. Relative 또는 cwd에서 해석한 shim executable은 거부합니다.

Core는 routing과 process environment만 제공하며 Plugin을 import하거나 split tree를 수정하지 않습니다.
병렬 create는 직렬화하고 missing/stale caller 또는 pane identity는 현재 focus pane fallback이 아니라
이름 있는 거부입니다. 실제 consumer가 있을 때만 profile을 만들며 쓰지 않는 adapter를 미리 만들지
않습니다.
