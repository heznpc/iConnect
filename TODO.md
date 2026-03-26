# AirMCP TODO

> v2.5.1 기준 (2026-03-26 업데이트). 25 모듈, 262 도구, 8 리소스.

---

## P0 — 즉시 (v2.5.0)

### 보안 (Critical)

- [ ] `gws_run` 도구 — 사실상 임의 명령 실행 가능. HITL 있지만 입력 화이트리스트 또는 명령 범위 제한 필요
- [ ] osascript 인젝션 재감사 — OWASP MCP Top 10 1위 (MCP05). 2026년 1-2월 MCP CVE 43%가 exec/shell 인젝션. JXA 파라미터 이스케이프 전수 점검
- [ ] `run_javascript` 도구 보안 강화 — Safari에서 임의 JS 실행. `allowRunJavascript` 가드 외 추가 스코프 제한 검토

### 테스트 커버리지 (Critical — 현재 21.6%, 목표 30%)

- [ ] **server/ 디렉토리 0% → 60%** — `mcp-setup.ts`(411줄), `init.ts`, `http-transport.ts` 스모크 테스트
- [ ] **핵심 인프라 테스트** — `automation.ts`, `modules.ts`, `hitl.ts`, `tool-registry.ts`(3.2%), `swift.ts`(10.4%)
- [ ] **이벤트 버스 테스트** — `event-bus.ts` 0%. subscribe/emit/에러 핸들링
- [ ] **스킬 엔진 테스트 확장** — `executor.ts` 54% → 85%. 에러 핸들링, 변수 치환, 실패 시 정리
- [ ] **HITL 가드 테스트** — 소켓 통신, 승인/거부 플로우, 타임아웃 로직
- [ ] CI 커버리지 게이트 강화 — statements 30%, branches 20%, functions 25%, lines 30% 미달 시 빌드 실패

### 코드 품질

- [ ] `weather/api.ts`, `maps/api.ts` — `Promise<any>` 반환 → 구체적 응답 타입 정의
- [ ] `src/shared/mcp.ts` any 타입 정리 — SDK v2 이전에 가능한 범위에서 proper typing

### CI / 인프라

- [ ] `gitleaks/gitleaks-action` Node.js 24 대응 — 현재 Node.js 20 기반, 2026-06-02부터 강제 Node.js 24 전환. 업스트림 업데이트 대기 후 범프
- [ ] `swift-tools-version` 6.2+ 재범프 — CI runner(macos-latest)에 Swift 6.2 탑재 시 재적용. 현재 6.1로 유지 중
- [ ] `--bind-all` HTTP 모드 무인증 보안 — `AIRMCP_HTTP_TOKEN` 미설정 시 `--insecure` 필수화 검토

---

## P1 — 단기 (v2.6.0)

### 커뮤니티 & 인지도 (현재 GitHub Stars 0, 외부 언급 0)

- [ ] **Smithery.ai 등록** — server.json 이미 있음. 2,200+ 서버 등록된 최대 MCP 디렉토리
- [ ] **mcp.so 등록** — 18,785 서버 등록. 노출 극대화
- [ ] **cursor.directory 등록**
- [ ] **awesome-mcp-servers PR** — punkpeye/awesome-mcp-servers에 PR (기존 apple-mcp 아카이브됨, 대체로 등록)
- [ ] **PulseMCP 등록** — 현재 apple-mcp만 등록되어 있음
- [ ] **README 홍보 개선** — GIF 데모, 스크린샷, "Getting Started" 30초 가이드 강화
- [ ] **블로그/SNS 홍보** — 한국어/영어 소개 글. Reddit r/ClaudeAI, r/MacApps, Hacker News Show HN

### MCP 스펙 2025-11-25 대응

- [ ] Safety Annotations 정식 매핑 — 기존 `readOnlyHint`/`destructiveHint` → MCP 스펙 `annotations` 필드 정합성 확인
- [ ] Tool Icons (SEP-973) — 25개 모듈별 아이콘 메타데이터 추가 (SF Symbols 또는 emoji)
- [ ] Tasks (SEP-1686) — 장시간 작업 (`semantic_index`, `record_screen`, `export_design`)에 `working`→`completed` 상태 머신
- [ ] URL-mode Elicitation (SEP-1036) — OAuth/결제 등 민감 플로우를 브라우저 기반 OOB 완료 처리
- [ ] Structured Tool Output — `outputSchema` + `structuredContent`. 핵심 도구부터 JSON 구조화 (현재 전부 text 반환)

### 성능

- [ ] `search_notes` 30초 타임아웃 — 노트 수 많으면 실패. 페이지네이션 또는 청크 단위 검색
- [ ] JXA → Swift 마이그레이션 — notes, mail, finder, messages 아직 `runJxa()` 직접 호출. `runAutomation()` 전환으로 Swift 브릿지 성능 개선
- [ ] 모듈 초기화 프로파일링 — 25개 모듈 로딩 시간 측정, 지연 로딩 검토

---

## P2 — 중기 (v3.0.0)

### SDK v2 마이그레이션

- [ ] `@modelcontextprotocol/sdk` v2 대응 — 패키지 분리: `@modelcontextprotocol/server` + `@modelcontextprotocol/client`
- [ ] Zod v3 → v4 마이그레이션 — SDK v2가 Zod v4 요구. 262개 도구 스키마 호환성 검증

### 배포 & 패키징

- [ ] **macOS .app Code Signing + Notarization** — 메뉴바 앱 배포용. Apple Developer 인증서 필요
- [ ] **Homebrew Cask 등록** — `brew install --cask airmcp`
- [ ] `npm publishConfig: { access: "public" }` 추가
- [ ] Docker 컨테이너 — 재현 가능한 테스트 환경, CI 격리

### 인프라 고도화

- [ ] OAuth 2.1 + PKCE — HTTP 리모트 배포용 인증 (MCP 스펙 CIMD 지원)
- [ ] Machine-to-Machine OAuth — `client_credentials` grant. headless 에이전트용
- [ ] Audit trail / 텔레메트리 — OWASP MCP08. 도구 호출 로깅, 비정상 패턴 감지
- [ ] Rate limiting — HTTP 모드에서 도구별 호출 빈도 제한

### iOS 앱

- [ ] AirMCPKit Swift 패키지 + Hummingbird MCP 서버 + SwiftUI 앱 (docs/ios-architecture.md 참조)
- [ ] HealthKit 통합 — Swift bridge에 이미 준비됨

---

## P3 — 장기 / 백로그

### Apple 공식 MCP 대응

- [ ] Apple 공식 MCP (App Intents) — iOS 26.1/macOS 26.1 베타. WWDC 2026에서 공개 API 예상
- [ ] AirMCP ↔ App Intents 브릿지 전략 수립 — 공존 vs 마이그레이션 판단 기준 문서화
- [ ] App Intents 미지원 영역 파악 — AirMCP만의 차별점 유지 (크로스 앱 자동화, 시맨틱 검색 등)

### 기능 확장

- [ ] UI 자동화 고도화 — 자동 스크롤, UI diff, Swift AXUIElement
- [ ] Bluetooth 연결/해제 — Swift 브릿지 필요
- [ ] `get_wifi_status` / `get_battery_status` 도구 추가 (GitHub Issue #1, #6)
- [ ] 에이전트 품질 — 서버 instructions 강화, 파일 기반 대용량 응답, Resources 문서화 개선

### 스펙 추적

- [ ] Cross App Access (XAA, SEP-990) — 기업 IdP 통합
- [ ] MCP Server Cards — `.well-known` 메타데이터 스펙 진화 추적 (v1.6.0 기본 구현 완료)
- [ ] Sampling with Tools (SEP-1577) — 서버가 도구 정의와 함께 sampling 요청
- [ ] DPoP (SEP-1932) / Workload Identity Federation (SEP-1933)

---

## 경쟁 현황 (2026-03-25)

| 경쟁자 | 상태 | Stars | 차별점 |
|--------|------|-------|--------|
| supermemoryai/apple-mcp | ARCHIVED (2026-01) | ~3,000 | AirMCP의 전신. 15개 도구. 유지보수 중단 |
| loopwork/iMCP | Active | ~1,200 | Swift 네이티브 앱. **Notes 미지원** |
| sweetrb/apple-notes-mcp | Active | 신규 | 18+ 도구 Notes 특화 |
| neverprepared/macos-ecosystem-mcp | Active | 소규모 | 템플릿 기반. Reminders/Calendar/Notes만 |
| Apple 공식 MCP | 베타 (iOS 26.1) | — | App Intents 기반. WWDC 2026 이후 본격화 |

**AirMCP 경쟁 우위:** 262 도구 × 25 모듈 = 가장 포괄적. JXA + Swift 듀얼 패스. HITL 승인. 네이티브 메뉴바 앱.
**AirMCP 약점:** 인지도 0. 외부 사용자 검증 없음. 테스트 커버리지 미달.

---

## QA 커버리지 (v2.5.1)

현재: seq(172) + crud(70) = **207/247 고유 tool (84%)**

**테스트 불가 40개 — 정당한 사유로 자동 테스트 제외:**

위험 작업 (20개):
- `send_message`, `send_mail`, `reply_mail`, `send_file`, `gws_gmail_send` — 외부 전송
- `system_sleep`, `system_power`, `toggle_wifi`, `toggle_focus_mode`, `prevent_sleep` — 시스템 상태
- `ui_click`, `ui_type`, `ui_press_key`, `ui_perform_action` — UI 자동화 부작용
- `delete_photos`, `semantic_clear`, `spotlight_clear` — 비가역 삭제
- `run_javascript` — 보안 위험
- `record_screen`, `drop_recording` — 시스템 리소스

GWS 미인증 (10개 — OAuth 필요):
- `gws_gmail_read`, `gws_drive_read`, `gws_drive_search`, `gws_sheets_read`, `gws_sheets_write`
- `gws_calendar_create`, `gws_docs_read`, `gws_tasks_create`, `gws_people_search`, `gws_raw`

Swift/macOS 26+ 전용 (10개):
- `generate_image`, `generate_plan`, `generate_structured`, `scan_document`
- `import_photo`, `create_recurring_event`
- `semantic_index`, `semantic_search`, `spotlight_sync`, `tag_content`

---

## 프로젝트 성적표 (2026-03-25)

| 영역 | 등급 | 비고 |
|------|------|------|
| 의존성 최신성 | A- | eslint/ts-eslint 마이너 업데이트 가능. zod v4는 SDK 대기 |
| 보안 | A- | 프로덕션 취약점 0. osascript 재감사 필요 |
| 번들 크기 | A+ | 884 KB. 매우 경량 |
| TypeScript 엄격성 | A- | strict: true + noUncheckedIndexedAccess |
| 테스트 커버리지 | C | 21.6% stmts (목표 30%). 핵심 인프라 0% |
| ESLint | A+ | 에러/경고 0건 |
| MCP 스펙 준수 | B+ | 2025-06-18 대응 완료. 2025-11-25 일부 미대응 |
| 커뮤니티 인지도 | D | Stars 0, 외부 언급 0, 디렉토리 미등록 |
| 경쟁력 | A | 262 도구 최대 규모. 기능 범위 압도적 |

---

## 완료

- [x] **v2.5.1** — Swift 6 concurrency 강화 (OSAllocatedUnfairLock, ISO8601FormatStyle), 42 XCTest, CI Swift 파이프라인, 크래시 가드 8건, 버전 자동 동기화 (`sync-version.mjs`), MCP 스타터 2종 업그레이드
- [x] **v2.4.2** — 도구 수 동기화 (262), 메뉴바 앱 아이콘 번들 수정, init 마법사 확장
- [x] **v2.3.0** — 체이닝 시퀀셜 테스트, 타입 중복 제거, 쓰로틀, contacts 싱글톤
- [x] **v2.2.0** — JXA→Swift 마이그레이션 인프라, EventKit 전환, 보안 강화 (execFileSync 전환)
- [x] **v2.1.0** — index.ts 분리, SDK 내부 API 접근 제거, esbuild 전환
- [x] **v2.0.0** — 244 MCP 도구, 25 모듈, 시맨틱 검색, HITL, init 마법사, i18n 9언어
- [x] **v1.8.0** — Expression evaluator, Weather, Music 평점, System 잠자기, MCP Apps UI
- [x] **v1.7.0** — Personal Skills Engine, iWork 3모듈 (26도구)
- [x] **v1.6.0** — Elicitation, Server Card, Progress 알림, Async Tasks
- [x] **v1.5.x** — 코드 품질 A- (보안 강화 12건)
- [x] 리브랜딩 iConnect → AirMCP (v1.0.0)
- [x] HITL 4단계, 모듈 on/off, 멀티 클라이언트 자동 감지
- [x] MCP Registry 등록, awesome-mcp-servers PR 2건
- [x] Shortcuts 11도구, Share 승인, Apple Intelligence 8도구, UI 자동화 6도구
- [x] GUI (온보딩, 자동시작, 로그뷰어, 업데이트 알림)
