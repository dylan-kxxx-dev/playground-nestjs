# playground-nestjs

NestJS 학습·실험용 개인 플레이그라운드. 프로덕션 코드 아님.

---

## Stack

- NestJS 12.0.1 / TypeScript 6.0.3 / Node 24.14.1
- 모듈 시스템: **CommonJS** (이후 ESM 전환 예정 — `docs/adr/0001-*`)
- 테스트 Jest 30 / 린트 oxlint 1.83 / HTTP Express 5
- 패키지 매니저: **pnpm**

## Dev

```bash
pnpm start:dev   # watch 모드, localhost:3000
pnpm build
pnpm test        # unit (jest)
pnpm test:e2e
pnpm lint        # oxlint
```

## Structure

```
src/
├── cats/                  # Cats CRUD — 학습 주 소재
│   ├── dto/               # 외부 입력 → class (검증 decorator 부착 대상)
│   ├── interfaces/        # 내부 타입 → interface
│   ├── cats.module.ts     # exports: [CatsService]
│   ├── cats.controller.ts
│   └── cats.service.ts    # 메모리 배열 저장소 (DB 없음)
├── common/middleware/     # 기능에 속하지 않는 공통 코드
└── app.module.ts          # configure() 로 middleware 등록
```

## 프로젝트 컨벤션

글로벌 rules와 **다른 것만**:

- **코드는 사용자가 직접 작성한다.** Claude 는 개념 설명·문서 링크·리뷰·힌트만 제공하고,
  명시적 요청이 없으면 구현 코드를 대신 쓰지 않는다. (학습이 목적)
- NestJS API 확인은 기억이 아니라 **`docs.nestjs.com/v12/`** 조회로 한다.
  검색 결과·블로그는 대부분 v11 기준이라 어긋날 수 있다.
- 파일 생성은 `nest g <종류> <이름>` CLI 사용 — module 등록 누락을 막는다.
  단 `nest g resource` 는 학습 중엔 쓰지 않는다(다 만들어주면 배울 게 없다).

## 에이전트 힌트

- **진행 상황·미결 사항은 `docs/LEARNING.md` 가 SSOT.** 세션 시작 시 먼저 읽는다.
- 개인 실험 레포라 실패 비용이 0에 가깝다 — 시행착오에 관대하게.
- 미결로 남겨둔 것들(404 미반환, `/cats/abc` 통과, 타입 검증 없음)은
  **의도적으로 남긴 것**이다. Exception filters(6)·Pipes(7) 단계에서 해결한다.
  먼저 고치면 그 단계의 학습 동기가 사라진다.

---

> 코딩 스타일, 에이전트 목록, 보안 체크리스트, Git 컨벤션은
> 글로벌 `~/.claude/` 설정에 있으므로 여기서 반복하지 않는다.
