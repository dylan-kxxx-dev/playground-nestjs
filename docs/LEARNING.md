# NestJS 학습 로드맵

> 대상 버전: **NestJS v12** (`@nestjs/core` 12.0.3, Node ≥ 20.19 / 로컬 v24.14.1)
> 공식 문서: https://docs.nestjs.com/v12/
> 방식: Claude가 가이드 → 사용자가 직접 작성 → Claude 리뷰
> 소재: 공식 문서의 Cats CRUD

## 진행 규칙

- 코드는 **사용자가 직접 작성**한다. Claude는 개념·문서 링크·리뷰·힌트만 제공한다.
- Claude가 코드를 대신 쓰는 건 사용자가 명시적으로 요청할 때만.
- API 확인은 기억이 아니라 **v12 공식 문서 조회**로 한다.

## 단계

### Phase 1 — Overview (NestJS 골격)

| # | 주제 | 문서 | 핵심 질문 |
|---|------|------|-----------|
| 1 | First steps | [/v12/first-steps](https://docs.nestjs.com/v12/first-steps) | 프로젝트는 어떻게 뜨고 main.ts가 뭘 하나 |
| 2 | Controllers | [/v12/controllers](https://docs.nestjs.com/v12/controllers) | 요청이 어떤 메서드로 라우팅되나 |
| 3 | Providers | [/v12/providers](https://docs.nestjs.com/v12/providers) | 비즈니스 로직을 어디 두고 DI는 뭔가 |
| 4 | Modules | [/v12/modules](https://docs.nestjs.com/v12/modules) | 기능 단위를 어떻게 묶고 공유하나 |
| 5 | Middleware | [/v12/middleware](https://docs.nestjs.com/v12/middleware) | 라우트 핸들러 *전에* 끼어드는 법 |
| 6 | Exception filters | [/v12/exception-filters](https://docs.nestjs.com/v12/exception-filters) | 에러를 일관된 응답으로 |
| 7 | Pipes | [/v12/pipes](https://docs.nestjs.com/v12/pipes) | 입력 변환·검증 |
| 8 | Guards | [/v12/guards](https://docs.nestjs.com/v12/guards) | 인가 — 이 요청을 처리할까 말까 |
| 9 | Interceptors | [/v12/interceptors](https://docs.nestjs.com/v12/interceptors) | 전후를 감싸기 (로깅·변환) |

> 5~9는 **요청 생명주기** 순서다. 순서 자체가 개념이므로 건너뛰지 않는다.

### Phase 2 — Techniques (실제 앱에 필요한 것)

| # | 주제 | 문서 | 비고 |
|---|------|------|------|
| 10 | Validation | [/v12/techniques/validation](https://docs.nestjs.com/v12/techniques/validation) | Pipes(7)의 실전 적용 |
| 11 | Configuration | [/v12/techniques/configuration](https://docs.nestjs.com/v12/techniques/configuration) | 환경변수 — DB 연결 전 필요 |
| 12 | Database | [/v12/techniques/database](https://docs.nestjs.com/v12/techniques/database) | ORM 선택 결정 필요 |

> Phase 2 진입 시점에 ORM(TypeORM / Prisma / Drizzle)을 정한다 — ADR 대상.

### Phase 3 — ESM 전환

Phase 1 완료 후 진행. CommonJS로 배운 것을 ESM으로 옮기며 모듈 시스템 차이를 익힌다.
방식(미러 프로젝트 신규 생성 vs 기존 마이그레이션)은 Phase 1 완료 시 결정 → ADR 0002.

전환 시 부딪힐 지점 (미리 알아둘 것, 지금 외울 필요 없음):

| 차이 | CommonJS | ESM |
|---|---|---|
| import 확장자 | 생략 가능 | `'./app.module.js'` 필수 (`.ts` 아님) |
| `__dirname` / `__filename` | 있음 | **없음** — `import.meta.url`로 계산 |
| top-level await | 불가 | 가능 |
| 테스트 | Jest | Vitest |
| 린트 | ESLint | oxlint |

> 결정 근거: [ADR 0001](adr/0001-commonjs-first-then-esm.md)

## v12에서 달라진 것 (학습 중 주의)

- `nest new`가 **CommonJS / ESM 선택**을 묻는다 (v11엔 없음).
- **ESM 선택 시 Vitest + oxlint**가 기본. CommonJS는 기존대로 Jest + ESLint.
- 검색 결과가 v11 기준인 경우가 많다 — 문서는 반드시 `/v12/` 경로로 본다.

## 진행 기록

각 단계 완료 시 여기에 한 줄씩. 커밋 해시만 적고 push 여부는 적지 않는다.

| # | 주제 | 상태 | 커밋 |
|---|------|------|------|
| 1 | First steps — 스캐폴딩 | 완료 | `d7ff404` |
| 1 | First steps — 코드 읽기 | 완료 | |
| 2 | Controllers — Cats CRUD | 완료 | `508c28b` |
| 3 | Providers — CatsService | 완료 | |
| 4 | Modules — CatsModule | 진행 중 | |

### 미결 사항 (나중 단계에서 처리)

**CRUD 동작 후 실측한 잘못된 응답 (2026-09-16)**

| 상황 | 현재 | 올바른 응답 | 해결 단계 |
|---|---|---|---|
| 없는 id 조회/수정 | 200 + 빈 본문 | 404 | Exception filters (6) |
| 없는 id 삭제 | 200 + `false` | 404 / 204 | Exception filters (6) |
| `/cats/abc` | 200 + 빈 본문 (`Number('abc')`=NaN) | 400 | Pipes (7) — `ParseIntPipe` |
| 타입 위반 생성 | 201 + 그대로 저장 | 400 | Pipes/Validation (7,10) — `ValidationPipe` |

> `undefined` 반환 → NestJS 가 200 + 빈 본문으로 처리한다.
> "성공했으나 데이터 없음" 과 "리소스 없음" 이 구분되지 않는다.

- **DTO 런타임 검증 없음** — `CreateCatDto` 는 타입만 제공. 실측 확인:
  `{"name":12345,"age":"숫자아님","breed":null}` 이 그대로 통과한다.
  → Pipes(7)/Validation(10) 단계에서 `class-validator` + `ValidationPipe` 로 해결.
  DTO 를 interface 가 아닌 **class** 로 만든 이유가 이것 (decorator 부착 가능).

### Step 1 에서 익힌 것

- `??` vs `||` — nullish(2개) vs falsy(6개: `false 0 "" null undefined NaN`)
- decorator = **함수**. `@Module({...})` 는 `Module({...})(AppModule)` 2회 호출
  (factory 가 설정을 받아 decorator 를 반환 → 그것이 클래스를 인자로 받음)
- decorator 는 클래스를 **바꾸지 않고** 메타데이터만 붙인다 → `class AppModule {}` 가 비어도 되는 이유
- TS 타입은 컴파일되면 소멸 → `emitDecoratorMetadata` 가 `design:paramtypes` 로 남김
  → `reflect-metadata` 가 저장/조회 → NestJS 가 읽어 DI 수행 (`dist/app.controller.js` 에서 확인 가능)
- `private readonly x` = 필드 자동생성 + 은닉 + 재할당 금지 (parameter property)
- `imports` = 모듈 단위 / `controllers`·`providers` = 부품 단위 → 단위테스트 vs E2E 차이
- NestJS 는 **class 필수** — decorator·DI 타입추론이 class 에만 동작

## 확정된 환경 (2026-09-16 실측)

| 항목 | 버전 |
|---|---|
| NestJS | 12.0.1 |
| TypeScript | **6.0.3** — 검색 시 TS 5 기준 답변과 다를 수 있음 |
| Node | 24.14.1 |
| 테스트 | Jest 30 |
| 린트 | **oxlint** 1.83 — CJS인데도 oxlint (문서는 ESM만이라 했으나 실물이 기준) |
| HTTP | Express 5 (내부) |
