# AI Workflow — 프로젝트 협업 문서 세트

Claude = 기획/리뷰 (장기 세션)
Codex = 실행자 (단기·상태 없음)
git diff = 단계 간 체크포인트

이 문서 세트는 AI 세션을 복구 가능·리뷰 가능·범위 한정 상태로 유지한다.
파일은 의도적으로 작고 명시적이다: 필요한 것만 읽고, 트리거가 맞을 때만 갱신하고,
의미 있는 단계 사이에 git 체크포인트를 남긴다.

## 계약(AGENTS)은 여기에 복사되지 않는다

Codex 위임 계약(`AGENTS.md`, `codex-delegation-examples.md`)은 프로젝트로 복사하지 않는다.
SSOT는 global `~/.claude/templates/ai-workflow/`이며, Claude가 위임할 때 그 내용을
위임 프롬프트에 직접 실어 Codex에 전달한다. (Codex는 프로젝트 파일을 자동으로 읽지 않는다.)

- **공통 규칙 개선** (모든 프로젝트에 영향) → global `AGENTS.md`를 수정 → 자동 전파.
- **이 프로젝트만의 계약 예외** → 프로젝트 루트에 `ai-workflow/AGENTS.local.md`를 만들고
  예외 항목만 기록. Claude가 위임 시 global 계약 + 이 오버레이를 합쳐 프롬프트에 싣는다.
- 어느 쪽인지 애매하면 Claude가 위임 전에 "공통 개선인가, 이 프로젝트 예외인가"를 확인한다.

## Setup

채움 문서만 복사한다(계약은 복사하지 않음):

```bash
mkdir -p ./ai-workflow
cp -r ~/.claude/templates/ai-workflow/docs ./ai-workflow/
```

CodeGraph를 초기화하면 AI 세션에서 파일 탐색 토큰을 절감할 수 있다.

```bash
codegraph init
codegraph index
```

## Session Start (Claude)

Claude는 장기 기획·리뷰 세션이다. 다음 순서로 읽는다:

1. 세션 상태 — global `state/projects/<pwd-slug>/current-session.md` (있으면 항상)
2. `ai-workflow/docs/TASKS.md` — 작업을 고르거나 갱신·리뷰할 때
3. `ai-workflow/docs/INVARIANTS.md` — 기획·리뷰·리팩터 또는 위험한 변경 전
4. `ai-workflow/docs/DECISIONS.md` + `adr/` — 이미 정해진 선택을 확인하거나 새 결정이 필요할 때

Claude는 현재 상태를 재구성하고, 다음 작업을 식별하고, 요청된 작업이 기존 불변식·결정과
충돌하지 않는지 확인하는 것으로 시작한다.

> Codex는 이 문서들을 자동으로 읽지 않는다. 위임 시 Claude가 필요한 계약·컨텍스트를
> 위임 프롬프트(Task Format)에 실어 전달한다. SSOT는 global `AGENTS.md`.

## 문서 역할

| 문서 | 역할 | 갱신 주체 |
|------|------|----------|
| `docs/INVARIANTS.md` | 어떤 AI 에이전트·리팩터도 절대 깨면 안 되는 규칙. 위반이 필요하면 사람에게 먼저 확인. | 사람만 |
| `docs/TASKS.md` | 실행 단위와 상태(active/completed/blocked). | Claude + Codex |
| `docs/DECISIONS.md` | ADR 인덱스 + 아직 ADR로 승격 안 된 임시 세션 결정 보관소. | Claude(사람 승인) |
| `docs/adr/` | 장기·되돌리기 어려운 결정. 1결정=1파일(`NNNN-kebab.md`). | Claude(사람 승인) |
| (global) 세션 state | 세션 복구 요약(진행중/열린결정/확정전제/다음할일). | Claude(사람 승인) |
| (global) `AGENTS.md` | Codex 위임 계약(Task Format, Prohibited Files 등). 프로젝트로 복사 안 함. | 사람만 |
| `ai-workflow/AGENTS.local.md` | 이 프로젝트만의 계약 예외(선택). | 사람만 |

## 갱신 트리거

| 문서 | 갱신 시점 |
|------|-----------|
| `INVARIANTS.md` | 절대 규칙이 추가·삭제·명확화될 때. 사람만 편집. |
| `TASKS.md` | 작업이 분해·시작·완료·차단·재우선순위·무효화될 때. |
| `DECISIONS.md` | ADR이 추가되거나(인덱스 행 추가) 임시 세션 결정을 기록할 때. |
| `adr/` | 장기·되돌리기 어려운 결정이 확정될 때. `NNNN-kebab.md` 한 파일. |
| (global) 세션 state | 세션 상태를 복구·인계·재시작용으로 압축해야 할 때. |

## Loop

```
1. Claude — 분석·분해 → docs/TASKS.md
2. Codex  — 단일 작업 실행 (Claude가 위임 프롬프트에 계약+태스크를 실어 전달)
3. git    — 체크포인트 (git commit)
4. Claude — git diff 리뷰, INVARIANTS.md 검증
5. Human  — 승인 / 거절
6. Claude — 상태 압축 → global 세션 state (세션 종료 전)
```

## 운영 원칙

1. **읽고 나서 행동** — 편집 전에 목표·상태·제약·불변식을 재구성한다.
2. **작업은 한정적으로** — Codex는 한 번에 하나의 명확한 단위를 실행하고, 분해·리뷰는 Claude가 소유한다.
3. **사람 권한 보존** — 불변식·결정·승인·최종 제품 방향은 사람이 소유한다.
4. **git으로 체크포인트** — diff와 커밋을 AI 단계 사이 리뷰 경계로 쓴다.
5. **지속 메모리만 갱신** — 미래 세션이 필요로 하는 정보만 기록한다.

## 세션 종료 프로토콜 (수동)

Claude 세션을 닫기 전 다음 순서로 기록한다:

1. `docs/TASKS.md` — 완료·차단·무효화·다음 작업 표시
2. `docs/INVARIANTS.md` — 불변식이 바뀌었는지 확인(사람만 편집)
3. `docs/DECISIONS.md` — 확정·보류 결정과 근거 기록
4. (global) 세션 state — 다음 세션을 위해 현재 상태 압축(항상 마지막)

그다음: 사람 리뷰·승인 → `git diff` 검증 → 갱신 문서 커밋.
