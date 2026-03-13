# iConnect MCP 디렉토리 등록 가이드

> 각 플랫폼별 등록 방법 정리. 복붙용 정보 + 필요한 설정 파일 포함.

---

## 공통 복붙 정보

```
Name: iConnect
Description: MCP server for the entire Apple ecosystem — Notes, Reminders, Calendar, Contacts, Mail, Messages, Music, Finder, Safari, System, Photos, Shortcuts, and Apple Intelligence.
Repository: https://github.com/heznpc/iConnect
npm: https://www.npmjs.com/package/iconnect-mcp
Install: npx -y iconnect-mcp
Tools: 123 tools, 23 prompts, 11 resources across 14 modules
Transport: stdio (default) + HTTP/SSE (--http)
License: MIT
```

Claude Desktop Config (복붙용):
```json
{
  "mcpServers": {
    "iconnect": {
      "command": "npx",
      "args": ["-y", "iconnect-mcp"]
    }
  }
}
```

---

## 1. mcp.so

| 항목 | 내용 |
|------|------|
| URL | https://mcp.so/submit |
| 인증 | GitHub 또는 Google 로그인 필요 |
| 방식 | 웹 폼 제출 |
| 리뷰 | 제출 후 자동 처리 (명시적 리뷰 프로세스 없음) |

### 폼 필드

| 필드 | 필수 | 입력값 |
|------|------|--------|
| Type | O | `MCP Server` |
| Name | O | `iConnect` |
| URL | O | `https://github.com/heznpc/iConnect` |
| Server Config | X | 위 Claude Desktop Config JSON 붙여넣기 |

### 참고
- 등록 후 GitHub README가 그대로 렌더링됨 → README 상태가 곧 리스팅 퀄리티
- 등록 후 https://mcp.so/my-servers 에서 이름, 설명, 태그, 카테고리 수정 가능
- GitHub 스타, 라이선스, 최근 커밋 등 자동 동기화

---

## 2. Smithery

| 항목 | 내용 |
|------|------|
| URL | https://smithery.ai/new (웹) 또는 CLI |
| 인증 | OAuth (CLI: `smithery auth login`) |
| 방식 | `smithery.yaml` 추가 + CLI 퍼블리시 |
| 리뷰 | 없음 (셀프서비스, 즉시 반영) |

### Step 1: `smithery.yaml` 레포 루트에 추가

```yaml
startCommand:
  type: stdio
  configSchema:
    type: object
    properties:
      includeShared:
        type: boolean
        default: false
        description: Include shared notes/folders in results
  commandFunction:
    |-
    (config) => ({
      command: 'npx',
      args: ['-y', 'iconnect-mcp'],
      env: config.includeShared ? { ICONNECT_INCLUDE_SHARED: 'true' } : {}
    })
```

### Step 2: CLI로 퍼블리시

```bash
npm install -g @smithery/cli@latest
smithery auth login
smithery mcp publish --name iconnect --transport stdio
```

### 또는 웹으로

1. https://smithery.ai/new 접속
2. 로그인
3. GitHub repo URL 입력하면 `smithery.yaml` 자동 감지

### 참고
- HTTP 서버도 등록 가능: `smithery mcp publish "https://your-server.com/mcp" -n iconnect`
- 퍼블리시 후 tool/prompt/resource 메타데이터 자동 스캔
- 사용 분석(analytics) 제공

---

## 3. cursor.directory

| 항목 | 내용 |
|------|------|
| URL | https://cursor.directory/mcp/new |
| 인증 | GitHub 또는 Google 로그인 필요 |
| 방식 | 웹 폼 제출 (PR 아님) |
| 리뷰 | 제출 후 자동 반영 |

### 폼 필드

| 필드 | 필수 | 입력값 |
|------|------|--------|
| Name | O | `iConnect` |
| Description | O | `MCP server for the entire Apple ecosystem — Notes, Reminders, Calendar, Contacts, Mail, Messages, Music, Finder, Safari, System, Photos, Shortcuts, and Apple Intelligence.` (10-500자) |
| Link to install instructions | O | `https://github.com/heznpc/iConnect` |
| Logo | X | 있으면 업로드 |
| Cursor Deep Link | X | Cursor docs에서 생성 가능 (아래 참고) |
| Company | X | 선택 |

### Cursor Deep Link (선택사항, 권장)
https://docs.cursor.com/tools/developers#generate-install-link 에서 원클릭 설치 링크 생성 가능. 등록 시 입력하면 사용자가 한 번의 클릭으로 Cursor에 MCP 서버 추가 가능.

### 참고
- 월 25만+ 활성 개발자가 사용하는 디렉토리
- MCP 서버 전용 리스팅: https://cursor.directory/mcp

---

## 4. Glama

| 항목 | 내용 |
|------|------|
| URL | https://glama.ai/mcp/servers → "Add Server" 버튼 |
| 인증 | GitHub OAuth |
| 방식 | GitHub 연동 (자동 인덱싱) |
| 리뷰 | 자동 스캔 + 품질 점수 부여 |

### Step 1: `glama.json` 레포 루트에 추가 (org 레포 필수, 개인 레포 권장)

```json
{
  "$schema": "https://glama.ai/mcp/schemas/server.json",
  "maintainers": [
    "heznpc"
  ]
}
```

### Step 2: 등록

1. https://glama.ai/mcp/servers 접속
2. "Add Server" 클릭
3. GitHub 로그인
4. 이미 자동 인덱싱되었을 수 있음 → "Claim ownership"으로 소유권 인증

### 참고
- **LICENSE 파일 필수** — 없으면 Glama에서 설치 불가 (iConnect는 MIT라 OK)
- 하루 최소 1회 자동 동기화 + 수동 "Sync Server" 버튼
- 품질 점수: 문서 퀄리티, 라이선스, 도구 수, 보안 평가, 인증 상태 기반
- 등록 후: 이름/설명 수정, Docker 설정, 사용 리포트, 리뷰 알림 제공

---

## 5. MCP Market

| 항목 | 내용 |
|------|------|
| URL | https://mcpmarket.com/submit |
| 인증 | 별도 계정 불필요 (GitHub URL 제출) |
| 방식 | GitHub repo URL 제출 |
| 리뷰 | 자동 MCP 호환성 검증 + 중복 체크 |

### 제출

1. https://mcpmarket.com/submit 접속
2. GitHub URL 입력: `https://github.com/heznpc/iConnect`
3. 자동으로 MCP 호환성 감지, 중복 체크, 검증 큐 등록

### 참고
- CherryHQ (Cherry Studio 팀) 운영
- 원클릭 설치 기능 지원
- 별도 설정 파일 불필요 — README에서 자동 추출

---

## 6. MCP Registry (공식, Anthropic/MCP)

| 항목 | 내용 |
|------|------|
| URL | https://registry.modelcontextprotocol.io/ |
| GitHub | https://github.com/modelcontextprotocol/registry |
| 인증 | GitHub OAuth (`mcp-publisher login github`) |
| 방식 | `mcp-publisher` CLI + `server.json` |
| 리뷰 | 자동 (CLI가 검증) |

> 기존 `modelcontextprotocol/servers` 레포는 더 이상 PR을 받지 않음. 모든 등록은 이 Registry로 이동.

### Step 1: `mcp-publisher` CLI 설치

```bash
# Homebrew
brew install mcp-publisher

# 또는 직접 다운로드
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/
```

### Step 2: package.json에 mcpName 추가

```json
{
  "mcpName": "io.github.heznpc/iconnect"
}
```

### Step 3: `server.json` 생성

```bash
mcp-publisher init
```

생성된 `server.json` 편집:

```json
{
  "name": "io.github.heznpc/iconnect",
  "description": "MCP server for the entire Apple ecosystem — Notes, Reminders, Calendar, Contacts, Mail, Messages, Music, Finder, Safari, System, Photos, Shortcuts, and Apple Intelligence.",
  "version": "1.0.0",
  "repository": {
    "url": "https://github.com/heznpc/iConnect"
  },
  "packages": [
    {
      "registryType": "npm",
      "identifier": "iconnect-mcp",
      "version": "1.0.0",
      "transport": "stdio"
    }
  ]
}
```

### Step 4: 인증 + 퍼블리시

```bash
mcp-publisher login github
mcp-publisher publish
```

### 참고
- 네임스페이스: `io.github.heznpc/*` (GitHub username 기반 자동 매핑)
- npm에 이미 퍼블리시된 패키지 필요 (v1.0.0 완료됨 ✓)
- Registry는 메타데이터만 저장 (코드는 npm에서 서빙)

---

## 7. Codex

| 항목 | 내용 |
|------|------|
| URL | https://codex.sh |
| 방식 | 미확인 (사이트 접근 실패) |

### TODO
- 직접 https://codex.sh 방문하여 제출 프로세스 확인
- `config.toml` 또는 유사 설정 파일 필요 여부 확인
- Submit / Add Server 링크 찾기

---

## 8. aiagentslist

| 항목 | 내용 |
|------|------|
| URL | https://aiagentslist.com |
| 방식 | 미확인 (사이트 접근 실패) |

### TODO
- 직접 방문하여 Submit 폼 확인
- MCP 서버 카테고리 선택 가능 여부 확인

---

## 레포에 추가해야 할 파일 요약

| 파일 | 대상 플랫폼 | 상태 |
|------|-------------|------|
| `smithery.yaml` | Smithery | 미생성 — 위 내용으로 레포 루트에 추가 |
| `glama.json` | Glama | 미생성 — 위 내용으로 레포 루트에 추가 |
| `server.json` | MCP Registry | `mcp-publisher init`으로 생성 |
| `package.json` 수정 | MCP Registry | `"mcpName": "io.github.heznpc/iconnect"` 추가 |

---

## 추천 등록 순서

1. **mcp.so** — 가장 간단 (웹 폼, 2분)
2. **MCP Market** — GitHub URL만 제출 (1분)
3. **cursor.directory** — 웹 폼 (2분)
4. **Glama** — `glama.json` 추가 후 클레임 (5분)
5. **Smithery** — `smithery.yaml` 추가 + CLI (10분)
6. **MCP Registry** — CLI 설치 + `server.json` + 퍼블리시 (15분)
7. **Codex / aiagentslist** — 사이트 확인 후 진행
