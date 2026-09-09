# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 따라야 할 규칙을 정의합니다.

## 자동 커밋 규칙 (필수)

**작업이 끝나면 사용자에게 묻지 말고 자동으로 커밋한다.** 사용자가 이미 이 규칙으로 상시 승인했으므로 "커밋할까요?"라고 되묻지 않는다.

적용 기준:

- 파일을 생성·수정·삭제하는 작업(기능 추가, 버그 수정, 리팩터링, 디자인 변경, 문서 수정 등)을 완료하면 즉시 커밋한다.
- 하나의 요청에서 여러 논리적 단위를 작업했다면, 단위별로 나눠 커밋한다.
- 작업이 검증 단계를 포함하면 **검증이 끝난 뒤** 커밋한다. 동작이 깨진 상태로는 커밋하지 않는다.
- 커밋 메시지는 한국어로, 무엇을 왜 바꿨는지 한 줄 요약 + 필요 시 본문에 상세 내용을 쓴다.
- 커밋 후 커밋 해시와 메시지를 사용자에게 보고한다.

예외 (이때는 커밋하지 않고 먼저 확인받는다):

- `push`, `force push`, 브랜치 삭제, 히스토리 변경(rebase, reset --hard, amend) 등 되돌리기 어려운 원격/이력 조작
- 사용자가 "커밋하지 마"라고 명시한 경우
- 실험용 임시 코드처럼 사용자가 저장을 원하지 않는다고 밝힌 변경

## 프로젝트 개요

정적 가계부 웹앱. 내역·예산은 Supabase(Postgres)에 저장하고, 테마만 localStorage에 남긴다.
빌드 도구·프레임워크 없음. Supabase도 SDK 대신 REST(PostgREST)를 `fetch`로 직접 호출한다.

```
index.html          화면 구조 (헤더 / 히어로 / 예산 / 입력 폼 / 내역 / 예산 설정 모달)
css/style.css       디자인 토큰(:root, [data-theme="dark"]) + 전체 스타일
js/db.js            Supabase 접속 정보 + REST 호출 래퍼 (DB 객체)
js/app.js           상태 관리, 렌더링 로직 (DB 객체를 통해 읽기/쓰기)
screenshots/        과제 제출용 캡처 이미지
.claude/launch.json 로컬 미리보기 서버 설정 (python http.server, 포트 8532)
```

### DB 구조 (Supabase 프로젝트 `fqwukshentjaispulmws`)

| 테이블 | 컬럼 |
| --- | --- |
| `entries` | `id uuid pk`, `type ('income'\|'expense')`, `date date`, `category text`, `amount numeric`, `memo text`, `created_at` |
| `budgets` | `id text pk (항상 'default')`, `total numeric`, `categories jsonb`, `updated_at` |

- 예산은 월 구분 없이 **단일 행(`id = 'default'`)** 을 upsert 한다.
- 실습용이라 로그인이 없다. RLS는 켜져 있지만 `anon` 키에 전체 읽기/쓰기를 허용하는 정책이라 **키를 아는 누구나 데이터를 수정할 수 있다.** 실제 서비스로 쓸 거면 Supabase Auth + `user_id` 기준 정책으로 바꿔야 한다.
- `js/db.js`의 키는 publishable(anon) 키로 브라우저에 노출되는 것이 정상이다. `service_role` 키는 절대 넣지 않는다.

## 실행 / 확인

```bash
python -m http.server 8532
```

`file://`로 직접 열면 상대경로 CSS/JS가 로드되지 않을 수 있으므로 로컬 서버로 확인한다.

- `http://localhost:8532` — Supabase의 실제 데이터로 실행
- `http://localhost:8532/?demo=1` — 데모 데이터로 화면만 표시 (**DB를 건드리지 않음**, 스크린샷용)
- `http://localhost:8532/?demo=1&theme=dark` — 데모 + 다크 테마

헤더 우측의 상태 배지(`#dbStatus`)로 DB 연결 여부를 확인할 수 있다: `DB 연결됨` / `저장 중…` / `DB 연결 실패` / `데모 모드`.

## 코드 작성 시 주의사항

- **의존성 추가 금지**: 프레임워크나 빌드 도구를 도입하지 않는다. 바닐라 HTML/CSS/JS를 유지한다. (폰트만 CDN에서 로드하며, 오프라인에서는 시스템 폰트로 대체된다.)
- **색상은 반드시 CSS 변수 사용**: 하드코딩하지 말고 `var(--primary)` 같은 토큰을 쓴다. 새 색상이 필요하면 `:root`와 `[data-theme="dark"]` **양쪽에** 정의한다.
- **카테고리 추가 시**: `js/app.js`의 `CATEGORIES`와 `CATEGORY_META`(아이콘·색상)를 함께 수정한다. 둘 중 하나만 고치면 아이콘이 기본값(📦)으로 표시된다.
- **사용자 입력은 `escapeHtml()`을 거쳐 렌더링**한다. 메모 등 문자열을 `innerHTML`에 직접 넣지 않는다.
- **DB 호출은 try/catch + 상태 배지**: 네트워크·권한 오류로 앱이 멈추지 않게 하고, 실패는 `setStatus("error", ...)`로 사용자에게 알린다. 테마 저장(localStorage)도 try/catch를 유지한다.
- **`demoMode`일 때는 DB에 쓰지 않는다**: `?demo=1`은 화면 확인용이므로 추가·수정·삭제·예산 저장 모두 메모리에서만 처리한다.
- **내역 수정은 `editingId`로 폼을 재사용한다**: 내역 목록의 ✎ 버튼(`startEdit`)이 입력 폼에 기존 값을 채우고 "수정하기" 모드로 전환한다. `editingId`가 있으면 제출 시 `DB.addEntry` 대신 `DB.updateEntry`(PATCH)를 호출한다. 새 필드를 추가할 때 이 흐름(채우기 → 제출 → `exitEditMode`)이 깨지지 않는지 확인한다.
- **레이아웃 변경 시**: 넓은 화면(≥901px)은 `grid-template-areas`로 좌(잔액·예산) / 우(입력·내역) 2단이며, 두 단이 같은 높이에서 끝나도록 맞춰져 있다. 카드 높이가 바뀌면 이 균형이 깨지는지 확인한다.

## 검증

UI를 변경했으면 로컬 서버를 띄우고 브라우저에서 **라이트/다크 두 테마 모두** 확인한다. 특히 다음을 점검한다.

- 예산 사용률 상태 전환: 정상 → 경고(90% 이상, 주황) → 초과(100% 초과, 빨강)
- 좁은 화면(1단 레이아웃)에서의 배치

DB 관련 코드를 만졌으면 **내역 추가 → 새로고침 → 그대로 남아 있는지**, 수정(✎ 클릭 → 값 변경 → 저장 → 새로고침 후 반영 확인)·수정 취소(값이 원복되는지)·삭제·예산 저장까지 실제로 눌러서 확인한다. 콘솔 에러와 상태 배지도 함께 본다.
