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

### Phase 1.5 — 불편했던 것 되짚기 (Phase 2 진입 전)

**ESM 전환 방식을 정하기 전에 먼저 한다.** 튜토리얼대로 따라오면서 불편했던 자리를
모아, NestJS 에 이미 있는 기능으로 풀리는지 확인한다. 튜토리얼은 개념 하나씩 보여주느라
**실무에서 쓰는 편의 기능을 대부분 생략**하므로, 직접 겪은 불편이 곧 그 기능을 찾는 단서다.

지금까지 쌓인 후보 (7단계 시점):

| 불편했던 것 | 확인해볼 방향 |
|---|---|
| `@Param('id', ParseIntPipe)` 가 3곳 반복 | ⚠️ **전역 `transform: true` 시도 → 기각** (Step 12). 변환은 되지만 실패를 안 막아 `/cats/abc` 가 400→404 로 퇴행. 현행 유지 |
| ~~404 `throw` 3줄이 3곳 반복~~ | ✅ **해결** — 도메인 예외 + 전역 필터 (Step 11) |
| ~~DTO 두 개가 필드만 다르고 거의 동일~~ | ✅ **해결** — `PartialType` (Step 10) |
| `class-validator` 에러 메시지가 영어 고정 | decorator 의 message 옵션 / i18n |
| ~~응답 형식을 필터에서 손으로 조립~~ | ✅ **해결** — 전역 인터셉터 + 전역 필터 2개로 봉투 통일 (Step 14) |
| 서버 재시작마다 데이터 소멸 | Phase 2 Database — 지금은 정상 |
| ~~`pnpm lint` 가 깨져 있음~~ | ⚠️ **오진이었다** — 스크립트는 `oxlint src/ test/` 로 올바르다. rtk 셸 훅이 명령을 가로채 eslint 로 돌리는 것이 원인(2026-09-22 실측). 레포에서 고칠 것 없음 → `pnpm exec oxlint src/ test/` 사용 |
| `getRequest()` 제네릭을 매번 손으로 | 커스텀 decorator (`@Req()` 래핑 등) |
| Jest 가 ESM 충돌로 안 돎 | Phase 3 에서 저절로 풀릴 수도 |
| ~~성공 `{data}` vs 에러 `{timestamp,…}` 로 응답 형식이 갈림 (9단계)~~ | ✅ **해결** — 성공 `{data}` / 에러 `{error:{code,message}}` 로 이원화 해소 (Step 14) |
| 두 필터가 같은 봉투 조립 코드를 갖게 됨 (14단계) | **Step 16** (Step 15 grilling 에서 분리 — 에러 스키마가 공유 대상을 먼저 드러낸다) — 공용 함수로 추출. 지금 안 하는 이유는 무엇을 공유할지 모른 채 추상화하지 않기 위함 |
| 봉투가 Swagger 스키마와 어긋남 (14단계 이후 도입 시) | `@nestjs/swagger` 는 컨트롤러 반환 타입만 본다 — 전역 인터셉터가 감싸는 걸 모른다. `ApiOkResponse` + `getSchemaPath` 또는 커스텀 데코레이터 |
| ~~에러 요청의 소요 시간이 안 찍힘 — `tap` 은 성공만 (9단계)~~ | ✅ **해결** — `finalize` 로 교체 (Step 13) |
| 역할을 클라이언트 헤더로 받음 (8단계 stub) | 11단계 Configuration — 환경변수 + `timingSafeEqual` |
| `{"age":null}` 이 200 통과 — `IsOptional` 은 `null` 도 skip (10단계) | `PartialType(..., { skipNullProperties: false })` / service 필터를 `null` 까지 |

> 8·9 단계를 하면서 **불편한 자리를 이 표에 계속 추가**한다. 목적은 "기능 구경"이 아니라
> **겪은 불편 → 해결책** 순서를 지키는 것 — 반대로 하면 왜 필요한지 모르는 채로 쓰게 된다.

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
| 4 | Modules — CatsModule | 완료 | |
| 5 | Middleware — LoggerMiddleware | 완료 | |
| 6 | Exception filters | 완료 | `672295e` |
| 7 | Pipes — ParseIntPipe / ValidationPipe | 완료 | `52cdc68` |
| 8 | Guards — AuthGuard (A: 기본) | 완료 | `41e72ad` |
| 8 | Guards — @Roles + RolesGuard (B: 메타데이터) | 완료 | `03c2486` |
| 9 | Interceptors — Logging / Transform | 완료 | `0dba82d` |
| 10 | Phase 1.5 — DTO 중복 제거 (`PartialType`) | 완료 | `1599288` |
| 11 | Phase 1.5 — 404 중복 제거 (도메인 예외 + 필터) | 완료 | `1cdfe76` |
| 12 | Phase 1.5 — ParseIntPipe 반복 제거 (전역 transform) | **기각** — 실측으로 부적합 확인 | |
| 13 | Phase 1.5 — 에러 요청 소요시간 측정 (`tap`→`finalize`) | 완료 | `bed82f2` |
| 14 | Phase 1.5 — 응답 형식 이원화 해소 (봉투 통일) | 완료 | `82fa9b8` `9d12c29` `e79fbc4` `b1d6aee` |

### Step 14 에서 익힌 것 (Phase 1.5 — 응답 형식 이원화)

응답이 **네 갈래**였다. 성공끼리도 갈렸고, 성공과 에러는 겹치는 필드가 하나도 없었다.

```
GET /cats       {"data":[…]}                                TransformInterceptor (findAll 에만)
GET /cats/1     {"id":1,…}                                   raw
에러 (cats)     {"timestamp","statusCode","path","message"}  필터 2개가 각각 조립
에러 (그 밖)    {"message","error","statusCode"}             Nest 기본 필터
```

네 번째가 있다는 걸 작업 중에 발견했다. `HttpExceptionFilter` 가 `@UseFilters` 로
**`CatsController` 한정**이었기 때문에, 컨트롤러 밖에서 난 예외는 우리 필터에 닿지도 않았다.
`@UseFilters` 를 컨트롤러에 붙이면 **스코프가 좁다는 사실이 이름에 안 드러난다** —
`HttpExceptionFilter` 라는 범용적인 이름이 스코프를 거짓말하고 있었다.

**결과 — 두 형태로 통일**

```
성공  {"data": ...}
에러  {"error": {"code": "NOT_FOUND", "message": ["Cat not found"]}}
```

#### 판정 필드를 바디에 두지 않기로 한 이유

후보 중에 `{"success": true|false, …}` 가 있었다. 기각한 이유는 **판정자가 둘이 되기 때문**이다.

클라이언트가 성패를 가리는 조건문은 봉투와 **무관하게 이미 있다** — HTTP 상태코드에서
(`res.ok`, axios 의 `catch`). 여기에 `success` 를 더하면 조건문이 *하나 늘어나는* 게 아니라
**같은 사실이 두 군데 적히는** 것이다. 두 값이 적힌 곳이 둘이면 언젠가 어긋난다 —
`success:true` 인데 상태 500 인 응답이 나올 수 있는 구조를 만들지 않는 편이 낫다.

같은 이유로 `timestamp`·`path`·`statusCode` 도 뺐다. 각각 `Date` 헤더 · 요청 URL ·
상태줄에 이미 있다. 에러 로그에는 값어치가 있지만 그건 **서버가 남길 것**이지
응답 바디에 실어 보낼 것이 아니다.

> 대신 **상태코드가 정확해야 한다는 제약**이 생긴다. 바디에 판정 정보가 없으니
> 상태줄이 유일한 판정자다. 검증에서 `200/200/404/400/200/404` 를 따로 확인한 이유가 이것.

#### `HttpStatus` 는 숫자 enum 이라 역방향 조회가 된다

`code` 를 얻으려고 매핑 테이블을 만들 뻔했는데 필요 없었다. TS 숫자 enum 은 양방향이다:

```ts
HttpStatus.NOT_FOUND  // 404      이름 → 값
HttpStatus[404]       // 'NOT_FOUND'   값 → 이름  ← 이쪽이 공짜로 따라온다
```

**실측** (2026-09-23):

| 입력 | 결과 |
|---|---|
| `HttpStatus[404]` | `'NOT_FOUND'` |
| `HttpStatus[400]` | `'BAD_REQUEST'` |
| `HttpStatus[418]` | `'I_AM_A_TEAPOT'` |
| `HttpStatus[599]` | **`undefined`** |

마지막 줄이 함정이다. `HttpException` 은 **임의 상태코드를 담을 수 있으므로** enum 에 없는
값이 올 수 있고, `undefined` 를 그대로 넣으면 `JSON.stringify` 가 **그 키를 통째로 삭제**한다:

```
{"error":{"message":[…]}}    ← code 가 사라진 응답
```

클라이언트가 `error.code` 를 항상 있다고 가정하면 여기서 깨진다. 값이 `null` 로라도 남으면
알아챌 텐데 **키 자체가 없어져서** 조용하다. `|| 'UNKNOWN_ERROR'` 폴백을 넣은 이유다.

#### `ValidationPipe` 는 실패를 전부 모아서 던진다

`message` 타입을 `string` 하나로 줄일 수 있을까 싶었는데, 실측이 답을 줬다:

```
POST /cats {}  →  ["name must be a string",
                   "age must be a number conforming to the specified constraints",
                   "breed must be a string"]
GET /cats/abc  →  "Validation failed (numeric string is expected)"
```

**첫 실패에서 멈추지 않는다.** DTO 필드가 3개면 3개가 다 온다. 반면 `ParseIntPipe` 와 404 는
문자열 하나다 — **같은 400 안에서도 타입이 갈린다.**

`join(', ')` 으로 문자열화하면 세 줄이 한 덩어리가 돼 **폼 필드별 에러 표시가 불가능**해진다.
그래서 반대로 갔다 — **항상 배열**. 단일 메시지도 `["Cat not found"]` 로 감싼다.
클라이언트가 `Array.isArray` 분기 없이 `.map()` 하나로 끝낼 수 있다.

> 이것도 판정 필드와 같은 축이다. 서버에서 한 번 감싸면 끝날 일을, 안 감싸면
> **에러를 표시하는 모든 자리에 분기가 복제된다.**

#### 타입이 불가능하다고 분기가 사라지진 않는다

`ResourceNotFoundFilter` 에 `Array.isArray(exception.message) ? … : […]` 를 넣었다가 지웠다.
`ResourceNotFoundError` 는 `Error` 상속이라 **`message` 가 `string` 고정** — 배열이 될 수 없다.
항상 false 로 가는 죽은 분기였고, TS 는 이걸 에러로 잡지 않는다.

Step 11 의 *"TS 는 `Cat === undefined` 비교를 에러로 안 잡는다"* 와 같은 종류다.
**타입상 불가능한 것과 컴파일러가 막아주는 것은 다르다.**

이 분기가 따라온 경로도 기록해둔다 — 바로 앞 `HttpExceptionFilter` 에서는 `Array.isArray` 가
**정답**이었다(`getResponse()` 가 실제로 `string | object` 두 모양). 옆 파일을 참고해 쓰면
그 파일의 전제까지 같이 딸려온다.

#### 인터셉터는 에러를 이중 포장하지 않는다

전역 인터셉터는 **에러 요청도 통과한다** — Step 13 에서 `/cats/abc` 400 에 `Before` 가 찍힌
것이 그 증거다(인터셉터가 파이프보다 바깥). 그러면 `{"data":{"error":…}}` 로 두 번 감싸지지
않을까? **안 된다** — `map()` 은 **성공 채널만** 타기 때문이다. 에러는 error 채널로 흘러
`map` 을 건너뛰고 필터로 간다.

추론으로는 알 수 있지만 실측으로 확인했다:

```
GET /cats/999  →  {"error":{"code":"NOT_FOUND","message":["Cat not found"]}}
                   ← {"data":{…}} 로 감싸이지 않음
```

`tap` 이 성공만 보던 것(Step 13)과 **같은 이유, 반대 방향의 결과**다. 그때는 손실이었고
(에러 소요시간을 놓쳤다) 이번엔 이득이다(에러가 안 감싸진다).

#### 빌드도 린트도 안 잡는 실수가 있다

작업 중 `response.json()` 을 **두 번 호출**한 상태가 있었다. 옛 코드를 지우지 않고 새 코드를
아래 추가한 것이다. 문법적으로 정상이라 **빌드·oxlint·prettier 전부 통과했다.**

실제로는 첫 번째 `json()` 이 나가고 두 번째는 `ERR_HTTP_HEADERS_SENT` 를 던진다 —
클라이언트는 옛 형태를 받고 서버 로그에만 에러가 쌓인다.

**이 레포에서 curl 실측이 유일한 판정자인 이유가 이것이다.** Jest 가 안 도는 건 불편이지만,
설령 돌았어도 응답 *형태*는 타입 검사의 사정권 밖이다.

---

### Step 13 에서 익힌 것 (Phase 1.5 — 에러 요청 소요시간)

`LoggingInterceptor` 의 `tap` 을 `finalize` 로 바꿨다. 한 줄 변경이지만 관측 범위가 달라진다.

```ts
// 전 — 성공 채널에만 걸린다
tap(() => console.log(`After... ${Date.now() - now}ms ...`))

// 후 — 성패 무관하게 한 번
finalize(() => console.log(`After... ${Date.now() - now}ms ...`))
```

**`tap(fn)` 은 성공만 본다**

rxjs 의 `tap` 에 콜백을 **하나만** 넘기면 그것은 `next` 핸들러다. 예외는 error 채널로
흐르는데 거기 핸들러가 없으니 아무 일도 안 일어난다. `now` 를 만들어놓고 **절반만 쓰던
셈**이었다.

**실측 — 전/후**

| 요청 | 전 | 후 |
|---|---|---|
| `POST /cats` 201 | Before + After 4ms | Before + After |
| `GET /cats/1` 200 | Before + After 0ms | Before + After |
| `GET /cats/999` 404 | **Before 만** | Before + After 1ms |
| `GET /cats/abc` 400 | **Before 만** | Before + After 1ms |

바뀐 것은 **0ms → 1ms 가 아니라 "없음 → 1ms"** 다. 측정값의 오차가 아니라 **관측 가능
여부**가 달라졌다. (`finalize` 는 구독 종료 시 실행돼 `tap` 보다 미세하게 늦지만 그 차이는
의미 없다.)

**`/cats/abc` 에 `Before` 가 찍힌 것이 생명주기를 증명한다**

400 은 `ParseIntPipe` 가 낸다. 그런데 `Before` 가 이미 찍혀 있었다 — **인터셉터가 파이프보다
앞**이기 때문이다(README 흐름도 3 → 4). 즉 파이프에서 막힌 요청도 인터셉터를 통과했고,
그래서 `finalize` 가 잡을 수 있다.

**같은 "로깅" 인데 미들웨어는 안 놓쳤다**

`LoggerMiddleware` 는 네 경우 모두 찍혔다(`[…] GET /cats/abc - 400`). `res.on('finish')` 를
쓰기 때문에 **응답이 나가기만 하면** 걸린다. 붙는 자리가 다르면 놓치는 것도 다르다:

| | 붙는 곳 | 실패 요청 |
|---|---|---|
| `LoggerMiddleware` | Express 층, `res.on('finish')` | 놓치지 않음 |
| `LoggingInterceptor` + `tap` | Nest 층, 성공 채널 | **놓침** |
| `LoggingInterceptor` + `finalize` | Nest 층, 종료 시 | 놓치지 않음 |

**`finalize` = `try/finally`**

```
try     { 핸들러 }
catch   { → 필터 }
finally { 시간 찍기 }   ← finalize
```

시간 측정은 **성패와 무관한 관심사**다. `tap` 은 성공 채널에 붙어서 그 무관함을 표현하지
못했고, `finalize` 는 표현한다. 성공/실패에 **다른 내용**을 찍고 싶을 때만
`tap({ next, error })` 가 맞다 — 지금은 에러 정보를 필터가 이미 응답에 담고 미들웨어가
상태코드를 찍으므로 세 번째 화자가 필요 없다.

**값어치는 지금이 아니라 나중에 나온다**

메모리 배열이라 전부 1ms 미만이니 지금은 체감이 없다. Phase 2 에서 DB 가 붙으면 달라진다 —
`GET /cats/999` 가 **DB 조회 200ms 뒤에** 404 를 내는 경우, 미들웨어는 "404 였다" 만 알려주고
**"오래 걸렸다" 는 아무도 말하지 않는다.** 느린 실패는 느린 성공보다 찾기 어렵다.

### Step 12 에서 익힌 것 (Phase 1.5 — ParseIntPipe 반복, **기각**)

**결론부터: 공식 문서가 권장하는 방법을 시도했고, 실측으로 기각했다.** 코드는 롤백했다.
반복은 그대로 남아 있다.

목표는 `@Param('id', ParseIntPipe)` 3회 반복 제거였다. 기준은 *"실무에서 보편적이고
공식 문서가 권장하는 방향"* — 문서가 1순위.

**v12 문서가 보여주는 유일한 방법**

조사 결과 반복을 실제로 없애는 방법은 하나뿐이었다
(`techniques/validation` → "Transform payload objects"):

```ts
// main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

// controller — ParseIntPipe 없이 타입만으로
@Get(':id')
findOne(@Param('id') id: number) { ... }
```

> "With the auto-transformation option enabled, the `ValidationPipe` will also perform
> conversion of primitive types. … the `ValidationPipe` will **try to** automatically
> convert a string identifier to a number."

나머지는 전부 문서 근거가 없었다:

| 방법 | v12 문서 지위 |
|---|---|
| `ValidationPipe({ transform: true })` | ✅ 명시적 코드 예시 |
| `@Param('id', ParseIntPipe)` 반복 | ✅ 기본 바인딩 ("auto-transformation 이 꺼진 경우의 대안") |
| 커스텀 데코레이터에 파이프 번들 | ❌ 예시 없음 — 호출부 적용만 보여줘 반복이 남는다 |
| 컨트롤러 레벨 `@UsePipes(ParseIntPipe)` | ❌ 서술·예시 없음 |
| `enableImplicitConversion` | ❌ 문자열 자체가 부재 |

**실측 — 대조군이 원인을 확정했다**

`findOne` 한 곳에서만 `ParseIntPipe` 를 빼고, `remove` 에는 남겨 대조군으로 썼다.

| 요청 | `ParseIntPipe` | 결과 |
|---|---|---|
| `GET /cats/1` | 제거 | **200** ✅ 변환은 된다 (`'1'` → `1`) |
| `GET /cats/abc` | 제거 | **404** `"Cat not found"` ❌ |
| `GET /cats/1.5` | 제거 | **404** ❌ |
| `DELETE /cats/abc` | **남김** | **400** `"Validation failed (numeric string is expected)"` |

같은 `abc` 인데 핸들러에 따라 **400 과 404 로 갈렸다.** 차이는 `ParseIntPipe` 유무뿐이므로
원인이 특정됐다 — 한 번에 세 곳을 다 지웠다면 "404 가 왜 나지" 로 헤맸을 자리다.

**`"try to"` 의 정체 — 실패하면 거부가 아니라 통과다**

문서 표현이 정확했다. 변환에 실패해도 예외를 던지지 않고 **그냥 넘긴다**:

```
'abc'  → NaN   → cat.id === NaN   항상 false → 404
'1.5'  → 1.5   → cat.id === 1.5   항상 false → 404
```

`ParseIntPipe` 는 "숫자로 못 바꾸면 **400**", `transform` 은 "못 바꾸면 **그대로 통과**" 다.
문서에 실패 동작 서술이 없는 게 누락이 아니라 **막지 않기 때문**이었다.

**왜 이게 단순한 기능 차이가 아니라 퇴행인가**

| | 의미 | 클라이언트가 아는 것 |
|---|---|---|
| 400 | "요청이 잘못됐다" | 내가 보낸 값이 틀렸구나 |
| 404 | "그런 리소스가 없다" | 데이터가 없나 보다 — **원인을 못 찾는다** |

에러가 아니라 **"없는 리소스" 로 위장**한다. `/cats/1.5` 가 특히 나쁘다 — 숫자를 보냈는데
404 가 나오니 디버깅이 어렵다. **조용한 실패가 시끄러운 실패보다 나쁘다**는 이 레포의
반복 주제(`=== undefined`, `IsOptional` 의 `null`, `useGlobalPipes` 위치)와 같은 축이다.

**타입 주석이 런타임 동작을 결정한다 — 드문 경우**

`transform` 은 `@Param('id') id: number` 의 **`number` 를 읽고** 변환한다. 타입은 컴파일 때
사라지는데 어떻게 읽나? `tsconfig.json` 의 **`emitDecoratorMetadata: true`** 가 데코레이터
붙은 파라미터의 타입을 메타데이터로 남기기 때문이다.

9단계에서 정리한 *"`implements`·`<T>` 는 컴파일 때 사라진다"* 의 **예외**다. 그래서
`number` 를 지우거나 `any` 로 바꾸면 변환이 **조용히 멈춘다** — 채택했다면 이게 새 함정이
됐을 자리다.

**문서 조사의 함정 — `curl` 로는 v12 문서를 읽을 수 없다**

`curl https://docs.nestjs.com/v12/...` 로 받으면 **세 페이지가 전부 같은 19KB Angular SPA
셸**(본문 0 바이트, md5 동일)이다. grep 으로 "이 문서에 X 가 없다" 를 판정하면 **전량 거짓
음성**이 된다. 렌더링된 본문으로 봐야 한다.

`CLAUDE.md` 의 Tool Output Uncertainty — *"빈 결과를 근거로 존재하지 않는다고 결론내지
않는다"* 의 사례가 하나 더 늘었다. 이번 조사의 ❌ 판정들은 본문 + 리터럴 검색 교차 확인으로
얻은 것이다.

**게이트를 먼저 둔 것이 비용을 줄였다**

플랜이 Task 1 을 **코드를 남기지 않는 게이트**로 분리했다: `transform` 켜고 한 곳만 바꿔
`/cats/abc` 를 때려보는 것. 실패했을 때 되돌린 것은 **`findOne` 한 줄 + `main.ts` 한 줄**
이었다. 세 곳과 import 까지 고친 뒤 발견했으면 롤백 범위가 훨씬 컸다.

> **문서에 답이 없는 항목이 채택 조건일 때는, 구현이 아니라 실험이 먼저다.**

**되돌릴 조건 / 다음에 다시 다룬다면**

문서 권장 경로는 닫혔다. 남은 선택지는 셋이고, 전부 **문서에 없는 길**이다:

| 선택 | 내용 |
|---|---|
| 현행 유지 | `@Param('id', ParseIntPipe)` 반복 3회를 그대로 둔다 (지금 여기) |
| 혼합 | 전역 `transform` + `:id` 에만 `ParseIntPipe`. 문서에 섞는 예시 없음 |
| 커스텀 파이프 | `transform` 후 `NaN`·비정수를 400 으로 막는 파이프 자작 |

다시 다룰 때의 새 질문은 *"문서에 없는 길을 갈 것인가"* 다. 컨트롤러가 늘어 반복 비용이
실제로 커졌을 때 재검토한다 — 지금은 3회뿐이라 현행이 싸다.

**남은 사실 하나**: `ParseIntPipe` 는 소수점도 막는다(`/cats/1.5` → 400). 이번에 처음 실측했다.

### Step 11 에서 익힌 것 (Phase 1.5 — 404 중복)

controller 의 404 검사 3줄 × 3곳 소멸. 다섯 핸들러가 전부 **service 위임 한 줄**이 됐다.

```ts
// 전
const result = this.catsService.findOne(id);
if (result === undefined) {
    throw new NotFoundException(`Cat with id ${id} not found`);
}
return result;

// 후
return this.catsService.findOne(id);
```

**층의 책임 분리 — 예외는 "무슨 일", 필터는 "HTTP 로 어떻게"**

service 가 `NotFoundException` 을 던지면 **모든 소비자가 HTTP 라고 가정**하는 것이다.
이 레포는 이미 소비자가 둘(`CatsController`·`AppController`)이라 그 가정이 깨진다.
CLI·큐·gRPC 가 붙으면 더 심해진다.

| 층 | 아는 것 | 모르는 것 |
|---|---|---|
| `ResourceNotFoundError` | "Cat 을 못 찾았다" | 404, HTTP, Express |
| `ResourceNotFoundFilter` | "그건 404 다" | 왜 못 찾았는지 |

**404 가 등장하는 시점이 언제인지** 보면 분리가 눈에 보인다 —
예외 클래스에는 숫자가 **아예 없다.** `response.status(HttpStatus.NOT_FOUND)` 가 처음이다.

**예외 → 응답까지의 순서**

```
1. service     Cat 못 찾음 → throw new ResourceNotFoundError('Cat')
                 ↑ 함수가 그 자리에서 탈출. 아래 줄 실행 안 됨
2. controller  const 대입도 return 도 도달 못 함 — 그냥 지나감
3. Nest        등록된 필터 순회, exception instanceof <@Catch 의 타입> 으로 선택
                 좁은 스코프부터: 핸들러 → 컨트롤러 → 전역
4. filter      catch(exception, host) 호출 → status(404).json({...})
```

**`instanceof` 가 보는 것은 상태코드가 아니라 계보다.**

```
ResourceNotFoundError → Error                    ← 새 전역 필터가 잡는다
NotFoundException     → HttpException → Error    ← 컨트롤러 필터가 잡는다
BadRequestException   → HttpException → Error
```

`NotFoundException` **도 404 지만 새 필터에 안 걸린다** — 타입이 다르니까.
반대로 `@Catch(Error)` 였다면 위 셋이 전부 걸렸다. `this.name = 'ResourceNotFoundError'`
문자열은 이 대조에 **관여하지 않는다**(로그용). 프로토타입 체인만 본다.

**컴파일러가 잡아주는 것과 안 잡아주는 것 — 플랜의 예측이 틀렸다**

플랜은 service 반환 타입에서 `| undefined` 를 지우면 controller 의
`result === undefined` 가 **컴파일 에러**가 될 거라 했다. 안 났다 (`pnpm build` rc=0).

| 패턴 | `Cat` 으로 좁힌 뒤 |
|---|---|
| `result === undefined` | **통과** — 항상 false 인 죽은 코드가 될 뿐 |
| 인자 개수 초과 (`('Cat','findOne')` → 1개짜리 생성자) | **에러** — 실제로 잡았다 |

즉 TS 는 **구조(인자 개수·타입)는 검사하지만 값 비교의 무의미함은 안 잡는다.**
*"타입을 좁히면 컴파일러가 지울 자리를 짚어준다"* 의 사각지대다.
결과적으로 죽은 코드가 조용히 남을 수 있어 grep 으로 직접 확인해야 했다:

```bash
grep -c "result === undefined" src/cats/cats.controller.ts   # → 0
grep -c "NotFoundException"    src/cats/cats.controller.ts   # → 0
grep -c "NotFoundException\|HttpException" src/cats/cats.service.ts  # → 0
```

**옵션을 만들었더니 일관성이 깨졌다 — `message?` 제거**

처음엔 `(resource, operation, message?)` 로 만들었다. 커스텀 메시지가 필요할 때를
위한 선택 인자였는데, 실제로 쓰니 **`findOne` 만** 넘기게 됐다.

```
GET    /cats/999  →  "Cat with id 999 not found"
PATCH  /cats/999  →  "Cat not found"      ← 같은 404 인데 형식이 다르다
```

옵션이 있으면 **일부만 쓰게 되고, 그게 곧 불일치다.** 제거하니 메시지가 정해지는
자리가 예외 클래스 한 곳으로 모였다. id 추적은 응답의 `path` 가 한다.

**`operation` 도 제거 — 아무도 읽지 않았다**

"메서드별로 메시지가 갈릴 여지" 로 넣었으나 필터는 `exception.message` 만 읽고,
응답 4필드에도 안 나가고, 메서드명은 **스택트레이스에 이미 있다.**
남은 생성자는 인자 하나:

```ts
export class ResourceNotFoundError extends Error {
    constructor(readonly resource: string) {
        super(`${resource} not found`);
        this.name = 'ResourceNotFoundError';
    }
}
```

> 둘을 뺀 잣대가 같지 않다는 점은 구분해 둘 값어치가 있다 —
> `message?` 는 **실제로 불일치가 발생해서**, `operation` 은 **아직 안 쓰여서** 뺐다.

**예외를 cats 가 아니라 common 에 둔 이유**

"id 로 찾았는데 없다" 는 cats 고유 지식이 아니다. 리소스 이름은 **필드로 받으면 되는 것**
이었다. 덕분에 `common/` 필터가 `cats/` 를 import 하는 **역방향 의존이 아예 안 생긴다.**

포기한 것: `resource` 가 문자열이라 **오타를 컴파일러가 못 잡는다.**
리소스 1개 + 필터에 분기 없음이라 지금은 수용.

**전역 필터의 두 함정**

- `main.ts` 에서 `new` 로 만들어 넘기므로 **DI 를 못 받는다.** 주입이 필요해지면
  `APP_FILTER` 프로바이더로 등록 방식을 바꿔야 한다(그때 `@Injectable()` 필요)
- `await app.listen()` **앞**에 둬야 한다 — 뒤면 조용히 무시된다
  (7단계 `useGlobalPipes` 와 같은 함정)

**스코프는 셋 — "전역" 은 `main.ts` 뿐이다**

| 등록 위치 | 스코프 | 이 레포 |
|---|---|---|
| `main.ts` `useGlobalFilters()` | 앱 전체 | `ResourceNotFoundFilter` |
| 클래스 위 `@UseFilters()` | 그 컨트롤러 | `HttpExceptionFilter` (`CatsController`) |
| 메서드 위 `@UseFilters()` | 그 핸들러 | 없음 |

`@UseFilters` 를 컨트롤러에 붙인 것은 전역이 아니다. 증거: `AppController` 에서 던진
`HttpException` 은 그 필터를 **안 탄다** → Nest 기본 필터라 4필드 형식이 아니다.

**남긴 중복 — 의도적**

응답 4필드 조립이 두 필터에 중복돼 있다. 지금 형식을 손대면 이번 리팩터가
"동작 불변" 임을 증명할 수 없다. 형식 통일은 Phase 1.5 의 별도 항목
(`{data}` vs `{timestamp,…}`)에서 두 필터를 **함께** 고친다.

**실측 (2026-09-22, 12건 전부 통과)**

```
404  GET/PATCH/DELETE /cats/999  {"timestamp":…,"statusCode":404,
                                  "path":"/cats/999","message":"Cat not found"}
200  GET/PATCH /cats/1 · GET /cats {"data":[…]}
200  DELETE /cats/1 (admin) → 404 GET /cats/1    ← 진짜 상태 변화 후의 404
400  /cats/abc · 빈 DTO POST      403  DELETE roles:user      401  키 없음
```

400·401·403 이 **404 로 안 뭉개진 것**이 이번 실측의 핵심이다 —
`@Catch(ResourceNotFoundError)` 가 좁게 잡힌다는 증거.

**되돌릴 조건**

| 조건 | 그때 할 것 |
|---|---|
| 도메인 예외가 **2개째** 생김 (12단계 DB 의 409 등) | 공통 부모 `DomainError` 추가 — `@Catch(DomainError)` 하나로 묶기 위해 |
| 필터 안에 `resource` 문자열 **분기**가 생김 | 타입으로 분리 (`CatNotFoundError` 등) |
| 리소스가 **3개 이상** | 위와 같음 |
| 메서드별로 메시지·상태가 갈려야 함 | `operation` 을 되살리거나 `code` 축으로 확장 |

그 전까지는 현 설계(범용 예외 1개 + 필터 1개)가 맞다. 클래스를 미리 쪼개면
**일하는 층 없이 계층만** 생긴다.

### Step 10 에서 익힌 것 (Phase 1.5 — DTO 중복)

`UpdateCatDto` 13줄 → 4줄. `class-validator` import 3개 소멸.

```ts
export class UpdateCatDto extends PartialType(CreateCatDto) {}
```

**`PartialType` 은 `extends` 가 아니다 — mixin 이다**

문법상 `extends` 를 쓰지만 물려받는 대상이 클래스가 아니라 **함수 호출 결과**다.
`PartialType` 은 클래스를 먹고 **새 클래스를 뱉는 함수**다.

```ts
class UpdateCatDto extends CreateCatDto {}               // 그냥 상속
class UpdateCatDto extends PartialType(CreateCatDto) {}  // 함수 결과를 상속
```

그냥 `extends CreateCatDto` 였다면 `name: string` 이 **필수 그대로**라
`{"age":5}` 만 보낸 PATCH 가 400 이 된다 — 7단계에서 실제로 밟은 그 실패다.
`PartialType` 이 추가로 하는 일이 정확히 두 가지:

```
1. 타입 수준:   name: string  →  name?: string
2. 런타임 수준: 프로퍼티마다 IsOptional() 을 붙인다   ← extends 로는 불가능
```

2번이 핵심. 데코레이터는 **런타임에 실제 실행되는 함수**(9단계 정리)라, 상속만으로는
"이 필드는 없어도 된다" 는 메타데이터가 새로 생기지 않는다.

**문서가 답하지 않아 소스를 봤다**

공식 문서는 *"all the properties of the input type set to optional"* 이라고만 해서
**타입만 optional 인지, 런타임 검증까지인지 구분되지 않는다.** `partial-type.helper.ts` 확인:

```ts
options.skipNullProperties === false
  ? applyValidateIfDefinedDecorator(PartialClassType, key)
  : applyIsOptionalDecorator(PartialClassType, key)
```

`skipNullProperties` 기본값이 `true` 라 **프로퍼티마다 `IsOptional()` 이 런타임에 붙는다.**
→ 실측 A번으로 증명(아래 표). **문서에 없는 계약은 소스 + 실측으로 확인한다.**

**패키지가 3갈래 — 앱 종류에 종속된다**

```
swagger 사용   → @nestjs/swagger 의 PartialType    (validator + ApiProperty 복사)
graphql 사용   → @nestjs/graphql 의 PartialType    (validator + Field 복사)
둘 다 없음     → @nestjs/mapped-types 의 PartialType (validator 만)   ← 현재
```

셋은 **시그니처가 같고 복사 범위만 다르다.** 그래서 틀려도 빌드가 통과하고 API 도
정상 동작한다 — swagger 앱에서 `mapped-types` 판을 쓰면 `@ApiProperty()` 가 안 따라와
**Swagger 문서에서 그 DTO 만 빈 껍데기로 나간다.** 공식 문서가 *"various, undocumented
side-effects"* 라고만 적은 게 이 부류. **죽지 않고 조용히 빠지는 실패.**

> **swagger 를 붙이는 날 이 import 를 같이 옮겨야 한다.** 안 옮기면 계약서가 빈 채로 나간다.

**옵션은 누가 읽느냐로 갈린다 — 섞으면 조용히 무시된다**

| | `whitelist` | `skipNullProperties` |
|---|---|---|
| 소유자 | `ValidationPipe` (`@nestjs/common`) | `PartialType` (`@nestjs/mapped-types`) |
| 적는 곳 | `main.ts` 의 `new ValidationPipe({...})` | `PartialType(CreateCatDto, {...})` |
| 시점 | **요청마다** | **클래스 생성 시 1회** (앱 부팅) |
| 범위 | 전역 (모든 DTO) | 그 DTO 하나 |

`ValidationPipe` 에 `skipNullProperties` 를 넣어도 **에러 없이 그냥 무시된다** —
`ValidationPipe` 는 그 옵션을 모른다. 7단계의 `useGlobalPipes` 위치 함정과 같은 부류.

**`whitelist: true` 가 막고 있는 것** (7단계 복습)

DTO 에 decorator 가 붙은 프로퍼티만 남기고 **나머지를 제거**한다. 없으면
`CatsService.update` 의 `...changes` 스프레드를 타고 아무 필드나 저장 객체로 들어간다 —
`{"id":999}` 로 id 를 덮어쓸 수 있다(mass assignment). 다만 **버리되 알려주지 않는다**
(200 응답) → `forbidNonWhitelisted` 가 열린 결정으로 남아 있는 이유.

**실측** (`x-api-key: k`, localhost:3000)

| # | 요청 | 결과 | 증명한 것 |
|---|------|------|-----------|
| A | `PATCH {"age":5}` | **200** | `@IsOptional()` 을 한 줄도 안 썼는데 부분 수정 통과 — 런타임 부착 증거 |
| B | `PATCH {"name":123}` | **400** `name must be a string` | optional 화 ≠ 검증 해제. `@IsString()` 은 살아있다 |
| C | `PATCH {"hack":1,"age":9}` | **200**, `hack` 제거 | `whitelist` 가 상속 DTO 에도 작동 |
| D | `PATCH {}` | **200** | 전부 없어도 유효 |
| E | `PATCH {"age":null}` | **200**, `age:null` 저장 | ⚠️ 아래 |
| F | `PATCH /cats/999` | **404** | 기존 동작 무회귀 |
| G | `POST {"age":5}` | **400** `name`·`breed` 필수 | **`CreateCatDto` 는 안 건드려진다** — 새 클래스를 반환하는 mixin 의 증거 |

**E — `null` 이 통과한다**

`IsOptional()` 은 class-validator 에서 `undefined` 와 **`null` 을 둘 다** "검증 건너뛰기" 로
본다. 그래서 `age: number` 인데 런타임 값이 `null` 이 된다.

**`PartialType` 때문에 생긴 게 아니다** — 손으로 `@IsOptional()` 을 붙였던 이전 DTO 도
동일했다. **회귀가 아니라 원래 있던 구멍이 눈에 띈 것.** Phase 1.5 표에 추가.
12단계 DB 의 `NOT NULL` 제약과 함께 다시 만날 자리.

**재수출(port) 한 겹은 미도입 — 조건부 보류**

`PartialType` import 를 `src/common/dto/mapped-types.ts` 로 재수출하면 swagger 전환 시
**한 줄만** 고치면 된다(변경 지점 O(n) → O(1)). 다만:

- 엄밀히는 port & adapter 가 **아니다.** 코어가 인터페이스를 소유하지 않고 벤더 API 를
  그대로 재수출할 뿐이라 **의존 방향이 뒤집히지 않는다.** 정확히는 anti-corruption layer.
- 현재 사용처가 **1곳**이라 아끼는 게 없다. 안 올 수도 있는 변경에 미리 층을 쌓는 것은
  speculative abstraction.

> **재검토 조건**: `PartialType` 사용처가 3~4곳을 넘거나, swagger 도입이 확정될 때.
> 진짜 port & adapter 가 필요한 자리는 **12단계 ORM 선택**이다.

### Step 8 에서 익힌 것

**생명주기에서의 위치**

```
요청 → middleware(5) → [라우팅] → GUARD(8) → interceptor(9) → pipe(7) → 핸들러
```

> **9단계에서 보완** — 위 그림은 *가는 길*만 그렸다. interceptor 는 핸들러 **이후에도** 한 번 더
> 온다. 공식 순서는 `### Step 9 에서 익힌 것` 의 lifecycle 표 참조.

guard 는 **pipe 보다 앞**이다. "처리할 자격이 있나"를 먼저 묻고, 자격이 있어야 입력 검증이
의미가 있다. 권한 없는 요청의 DTO 를 검증하는 건 낭비.

**middleware 와의 진짜 차이 — 핸들러를 아는가**

| | 아는 것 |
|---|---|
| middleware | 어떤 핸들러가 실행될지 **모른다** (라우팅 확정 전) |
| guard | `ExecutionContext` 로 **핸들러를 안다** (`getHandler()`/`getClass()`) |

- `ExecutionContext` 는 6단계의 `ArgumentsHost` 를 **상속**한다. `switchToHttp()` 는 그대로 쓰고
  핸들러 정보를 아는 메서드가 추가된다.
- **"middleware=인증, guard=인가"는 권고지 규칙이 아니다.** 공식 인증 챕터(`@nestjs/passport`)도
  `AuthGuard` 로 **인증**을 한다. 정확한 구분은 *핸들러를 알아야 하는 판단이면 guard*.

**`return false` vs `throw`**

| | 결과 |
|---|---|
| `return false` | 403 `Forbidden resource` (Nest 가 `ForbiddenException` 을 던짐) |
| `throw new UnauthorizedException(msg)` | **401** + 내 메시지 |

"헤더가 없다"는 *너가 누군지 모르겠다* 라 401 이 맞다. 403 은 *인증은 됐는데 권한이 없다*.
→ 실측: `{"statusCode":401,"message":"x-api-key header required"}` + **`timestamp`·`path` 있음**
= guard 가 던진 예외를 6단계 필터가 잡았다. pipe(7)에 이어 **두 번째 연결 확인**.

**타입이 거짓말을 하고 있던 자리**

```ts
canActivate(context: ExecutionContext): boolean {
    return request.headers['x-api-key'];   // ❌ 실제로는 string | undefined
}
```

`getRequest()` 가 제네릭 없이 `any` 라 검사가 꺼져 있었다(6단계 필터와 같은 함정).
Nest 가 반환값을 truthy/falsy 로 보기 때문에 **동작은 우연히 맞았다.**
`getRequest<Request>()` + `express` import 로 해결.

> `Request` 를 `express` 에서 import 하지 않으면 **브라우저 표준 `Request`**(DOM 타입)가 잡힌다.
> 그쪽 `.headers` 는 `Headers` 클래스라 `headers['x']` 인덱스 접근이 성립하지 않는다.
> 이름이 같아서 조용히 어긋나는 종류.

**라우팅이 guard 보다 먼저다 — `/abcdefg` 가 404 인 이유**

부팅 시 라우트 표가 이미 만들어진다(`[RouterExplorer] Mapped {/cats, GET} route` 로그).
요청이 오면 **표를 조회**하는 것이지 컨트롤러 코드를 실행해보는 게 아니다.

| 요청 | 표 조회 | 결과 |
|---|---|---|
| `/cats` | `CatsController.findAll` 발견 | 그 컨트롤러의 guard·filter 적용 |
| `/abcdefg` | **없음** | 404. 실행할 핸들러가 없으니 붙은 guard 도 없다 |

`@UseGuards`·`@UseFilters` 는 **컨트롤러에 붙은 메타데이터**라, 그 컨트롤러가 선택돼야 읽힌다.
→ 실측 증거: `/abcdefg` 응답에 **`timestamp` 가 없다**(내장 필터). 전역 guard(`APP_GUARD`)로
바꿔도 이건 그대로 — 라우팅이 먼저라는 사실은 변하지 않는다.

**guard 여러 개는 배열 순서대로** — `@UseGuards(AuthGuard, RolesGuard)`.
인증이 `req.user` 를 붙인 뒤 인가가 그걸 읽어야 하므로 순서가 필수다.

**⚠️ 이 AuthGuard 는 진짜 인증이 아니다**

헤더 존재 여부만 본다. 헤더는 누구나 보낼 수 있으므로 **보안 기능이 아니라 guard 동작 확인용
stub**이다. 실무 인증은 JWT 검증이나 세션이고 `@nestjs/passport` 소관(Phase 2 이후).
시크릿을 코드에 박지 않으려고 값 비교를 일부러 넣지 않았다 — public 레포이기도 하다.

**다음 세션: B — 메타데이터 + `Reflector`**

핸들러마다 다른 규칙을 주는 것. **guard 만 할 수 있는 일**이고 `getHandler()` 를 실제로 쓴다.

```ts
export const Roles = Reflector.createDecorator<string[]>();   // 1. decorator 정의
@Roles(['admin'])                                             // 2. 핸들러에 메모
this.reflector.get(Roles, context.getHandler());              // 3. guard 가 읽음
```

`@SetMetadata('roles', [...])` 도 되지만 문자열 키라 오타가 안 잡힌다 — v12 는
`Reflector.createDecorator` 를 권한다. 가짜 사용자는 `AuthGuard` 가 `req.user` 를 붙이는
방식으로(실무 구조와 동일). **역할을 헤더로 받는 건 실서비스에선 금지** — 누구나
`x-user-role: admin` 을 보낼 수 있다.

#### B — 실제로 붙이며 익힌 것 (2026-09-18)

**`Reflector` 는 두 얼굴이다**

| | 성격 | 쓰는 곳 |
|---|---|---|
| `Reflector.createDecorator()` | **static** | 데코레이터를 *만든다*. DI 불필요 |
| `reflector.get()` | **인스턴스 메서드** | 붙은 값을 *읽는다*. 생성자 주입 필요 |

그래서 `roles.decorator.ts` 는 `Reflector.createDecorator(...)` 를 바로 쓰고,
`RolesGuard` 는 `constructor(private reflector: Reflector)` 로 받는다. **`@Roles` 를 붙였다고
`this` 로 꺼낼 수는 없다** — 꼬리표는 *핸들러 함수*(`CatsController.remove`)에 붙지
guard 인스턴스에 붙지 않는다. "어느 핸들러 것을 볼까"가 요청마다 달라서
(`context.getHandler()`) 메서드 호출일 수밖에 없다.

**데코레이터와 guard 는 짝이지 종속이 아니다**

`@Roles` 는 `RolesGuard` 가 없어도 붙고 컴파일된다 — 다만 **아무도 안 읽으니 아무 일도
안 일어난다.** 실제로 하드코딩 버전(`const requiredRoles = ['admin','user']`)에서
`@Roles` 가 장식으로만 남는 상태를 겪었다. 선언(`@Roles`)과 집행(`RolesGuard`)은 별개다.

**`req.user` 타입 — declaration merging**

`@types/express-serve-static-core/index.d.ts:6-15` 가 `interface Request {}` 를 **빈 채로**
열어두고 주석으로 "확장하라" 고 명시한다. 407 줄의 진짜 `Request` 가 그걸 상속하므로,
전역 `Express.Request` 에 넣은 필드가 `express` 의 `Request` 까지 흘러온다.

```ts
// src/types/express.d.ts
import { AuthUser } from '../common/types/auth-user';
declare global {
    namespace Express {
        interface Request { user?: AuthUser; }
    }
}
export {};
```

- **`declare global` 은 TS 기능**이다(Nest·Express 아님). declaration merging + 전역 탈출.
- **`extends` 와 다르다** — `extends` 는 새 이름을 만들고, merging 은 *기존 이름 자체*를
  확장한다. `interface MyReq extends Request` 로는 `express` 가 내보내는 `Request` 가
  안 바뀌므로 목적을 못 이룬다.
- **`export {}` 가 빠지면 조용히 안 먹는다.** 실제로 처음에 빠뜨렸는데 `AuthUser` 를
  import 하지도 않은 상태로 **빌드가 통과**했다 — 파일이 안 읽히고 있다는 뜻이었다.
  `pnpm build` rc=0 이 성공의 증거가 아니었던 사례.
- `rootDir: "./src"` 라 `.d.ts` 는 **반드시 `src/` 안**에 둬야 한다.

**검증은 역방향으로 한다**

선언이 먹는지 확인하려면 *일부러 틀린 값*을 넣어본다. `roles: 'admin'`(문자열)으로
바꾸니 `TS2322: Type 'string' is not assignable to type 'string[]'` 이 정확히 그 줄에서
났다 — 그제야 연결이 증명됐다.

**타입 좁히기(narrowing) 가 캐스팅을 대신한다**

헤더는 `string | string[] | undefined` 다(같은 헤더가 여러 번 올 수 있어서).

```ts
const raw = request.headers['x-roles'];
roles: raw
    ? Array.isArray(raw)
        ? raw.map((s) => s.trim())          // string[]  로 좁혀짐
        : raw.split(',').map((s) => s.trim())  // string 으로 좁혀짐
    : []
```

`Array.isArray` 는 **값을 배열로 만들지 않는다** — 묻기만 한다. 배열로 만드는 건
`.split(',')` 이고, `isArray` 는 "split 이 필요한가" 를 판단할 뿐이다. 동시에 TS 가 이걸
type guard 로 인정해 각 가지에서 타입을 확정하므로 **`as string` 이 불필요**해진다.
`as` 로 검사를 끄면 배열이 왔을 때 `.split is not a function` 런타임 에러가 난다
(A 단계 "타입이 거짓말하던 자리" 와 같은 함정을 손으로 재현하는 셈).

`.map(s => s.trim())` 은 **양쪽 가지 모두** 필요하다 — `x-roles: admin, user` 든
헤더 중복이든 공백이 섞여 올 수 있다. 실측에서 `["admin"," user"]` 로 나왔고,
trim 이 없으면 `' user'` 가 매칭 실패해 403 이 된다.

**guard 순서는 배열 순서다 — 조율 없음**

```ts
@UseGuards(AuthGuard, RolesGuard)   // ① → ②. ①이 막으면 ②는 실행조차 안 된다
```

`AuthGuard` 가 `req.user` 를 붙이고 `RolesGuard` 가 읽으므로 **뒤집으면 `undefined`** 다.
`user?` 를 optional 로 선언한 덕에 이 실수가 런타임 크래시 대신 타입 에러로 드러난다.
(레벨이 다르면 전역 → 컨트롤러 → 핸들러 순. 배열 순서는 같은 레벨 안에서만.)

**`if (!roles) return true` 가 필수**

`@Roles` 없는 핸들러는 `roles === undefined` 다. 이 줄이 없으면 `GET /cats` 까지 막힌다.
배경 보안 리뷰가 여기에 `return false`(기본 거부)를 제안했지만 **이 설계엔 틀렸다** —
인증은 이미 `AuthGuard` 가 했고 `RolesGuard` 는 *추가* 역할 요구만 본다.
파일 하나만 보고 앞단 guard 를 모른 오판이었다. **자동 리뷰도 설계와 대조해야 한다.**

**실측 (2026-09-18)**

| 요청 | 결과 |
|---|---|
| 헤더 없음 → `GET` | 401 (AuthGuard) |
| `x-api-key` → `GET` (`@Roles` 없음) | 200 |
| `x-api-key` + `x-roles: user` → `DELETE` | **403** |
| `x-api-key` + `x-roles: admin` → `DELETE` | **200** |
| `x-roles: admin` 만 (키 없음) | 401 |
| `x-roles: user,admin` → `DELETE` | 404 = 인가 통과 후 "없는 id" (`some` OR 동작) |
| `x-roles: user, admin` (공백) | 404 = `trim()` 작동 |

403 본문에 `timestamp`·`path` 가 있다 → 6단계 필터가 guard 예외도 잡는다.
**세 번째 연결 확인**(pipe·AuthGuard 에 이어).

> 중간에 인증/인가가 한 덩어리로 섞인 버전을 거쳤다 — `AuthGuard` 가 `x-roles !== 'admin'`
> 까지 보게 했더니 조건식이 `||` 로 엮이며 **`x-api-key` 없이 `x-roles: admin` 만으로 200**
> 이 뚫렸다. `AuthGuard` 는 역할을 *판정하지 않고 담기만* 한다는 경계가 이래서 필요하다.

### Step 9 에서 익힌 것

**앞의 8개와 다른 점 — 유일하게 양방향이다**

guard·pipe·filter 는 한 방향이었다(통과시키거나 막거나). interceptor 는 핸들러 **전과 후**
양쪽에 낀다. 공식 lifecycle(`/faq/request-lifecycle`) 전문:

```
1. 요청
2. Middleware(5)        2.1 전역 → 2.2 모듈
3. Guards(8)            3.1 전역 → 3.2 컨트롤러 → 3.3 라우트
4. Interceptors (pre)   4.1 전역 → 4.2 컨트롤러 → 4.3 라우트
5. Pipes(7)             5.1 전역 → … → 5.4 파라미터
6. Controller 핸들러
7. Service
8. Interceptors (post)  8.1 라우트 → 8.2 컨트롤러 → 8.3 전역   ← 역순!
9. Exception filters(6) 9.1 라우트 → 9.2 컨트롤러 → 9.3 전역   ← 역순!
10. 응답
```

갈 때(4)와 올 때(8)의 순서가 **뒤집힌다** — 양파 껍질처럼 감싼다.

**`next.handle()` 이 분기점**

```ts
intercept(context, next) {
    // ① 핸들러 "전"
    return next.handle().pipe(
        // ② 핸들러 "후"
    );
}
```

`next.handle()` 을 호출해야 핸들러가 실행되고, 반환값이 **Observable** 로 감싸여 온다.
**안 부르면 핸들러가 아예 실행되지 않는다**(캐싱 interceptor 가 이 성질을 쓴다).

| 연산자 | 하는 일 |
|---|---|
| `tap(...)` | 값을 건드리지 않고 구경만 — 로깅 |
| `map(v => ...)` | 값을 변환 — 응답 형식 |

v12 에서는 `rxjs/operators` 가 아니라 **`rxjs` 에서 직접 import** 된다.

**실측 — 경계 케이스 (2026-09-18)**

| 요청 | 상태 | `Before` | `After` |
|---|---|---|---|
| 정상 `GET /cats/1` | 200 | ✅ | ✅ |
| 핸들러 예외 `/cats/999` | 404 | ✅ | **❌** |
| guard 차단(키 없음) | 401 | ❌ | ❌ |
| 라우트 없음 `/abcdefg` | 404 | ❌ | ❌ |
| 인가 차단 `DELETE` roles:user | 403 | ❌ | ❌ |

**`tap` 은 성공 값(next 채널)에만 반응한다.** 예외는 error 채널로 흘러 `tap`·`map` 을 건너뛰고
바로 exception filter 로 간다.

```
findOne → throw NotFoundException
              ↓ (error 채널)
        tap()/map() 건너뜀
              ↓
        HttpExceptionFilter(6) → 404
```

→ **이 로깅은 에러 요청의 소요 시간을 못 잰다.** 성능 모니터링이 목적이면 결함이다.
잡으려면 `tap({next, error})` 또는 `finalize`(성공·실패·취소 무조건 실행). 미적용 — Phase 1.5 후보.

아래 셋은 `Before` 조차 안 찍혔다. 이유가 각각 다르다:
- **401·403** — guard(3) 가 interceptor(4) 보다 **앞**이라 도달조차 못 한다
- **404(라우트 없음)** — 실행될 핸들러가 없으니 붙은 interceptor 도 없다(8단계 `/abcdefg` 와 동일)

반면 **middleware 로그는 5건 전부 찍혔다** — middleware(2) 가 guard(3) 보다 앞이라
차단 여부와 무관하게 실행된다. 5단계와 9단계의 위치 차이가 로그로 증명됐다.

**실행 순서 ≠ 로그 순서**

```
Before... findOne
After... 1ms findOne
[2026-09-18T…] GET /cats/1 - 200   ← middleware 가 마지막
```

middleware 가 먼저 실행되는데 로그는 나중이다. `res.on('finish')` 콜백이라 **응답 전송 완료 후**
찍히기 때문. 로그 순서만 보고 실행 순서를 판단하면 틀린다.

**`TransformInterceptor` — 성공 응답만 감싼다**

```ts
export interface Response<T> { data: T; }

export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(...): Observable<Response<T>> {
        return next.handle().pipe(map((data) => ({ data })));
    }
}
```

| 요청 | 응답 |
|---|---|
| `GET /cats` (`@UseInterceptors` 적용) | `{"data":[{…}]}` |
| `GET /cats/1` (미적용) | `{"id":1,…}` |
| `GET /cats/999` (에러) | `{"timestamp","statusCode","path","message"}` — **안 감싸짐** |

**interceptor 와 filter 의 경계**: 성공 응답 형식은 interceptor 가, 에러 응답 형식은 filter 가 정한다.
그래서 지금 이 앱은 응답 형식이 둘로 갈려 있다(`{data}` vs `{timestamp,…}`).
통일하려면 filter 쪽도 맞춰야 한다 — **Phase 1.5 후보**.

`map(data => { data })` 는 블록으로 해석돼 `undefined` 를 반환한다. 객체 리터럴은
**`map(data => ({ data }))`** 로 괄호를 감싼다.

**제네릭 `<T>` 는 "빈칸"이다**

```ts
NestInterceptor<T,            Response<T>>
                ↑             ↑
            핸들러가 준 것     내보낼 것
```

`findAll` 에 붙으면 `T = Cat[]` → `Response<Cat[]>` = `{ data: Cat[] }`. **`T` 하나를 바꾸면
세 군데가 같이 움직인다.** 컨트롤러에서 `<Cat[]>` 을 명시하지 않는 이유는 핸들러 반환 타입으로
**TS 가 추론**하기 때문. (`createDecorator<string[]>()` 는 추론 근거가 없어 명시했다 — 대비되는 사례.)

제네릭도 **컴파일 때 사라진다** — `dist/*.js` 에서 `getRequest<Request>()` 가
`getRequest()` 로 나오는 것을 실측 확인. 타입은 전부 컴파일러에게 하는 말이고
런타임 동작에 영향이 없다. **예외는 데코레이터** — 실제 함수 호출이라 JS 에 남고,
`emitDecoratorMetadata` 덕에 생성자 파라미터 타입이 런타임까지 전달돼 Nest 의 DI 가 작동한다.

### Step 7 에서 익힌 것

- **pipe 는 핸들러 직전**에 끼어든다. 던지면 **핸들러가 아예 실행되지 않는다.**
- pipe 가 하는 일은 둘 — **변환**(`'1'` → `1`)과 **검증**. `ParseIntPipe` 를 붙이니
  controller 의 `Number(id)` 3개가 사라졌다(변환을 pipe 가 가져감).
- `@Param('id', ParseIntPipe)` — **두 번째 인자**로 넘긴다. 파라미터 타입도 `string` → `number` 로.
- **pipe 가 던진 예외를 6단계 필터가 잡는다** — `/cats/abc` 의 400 응답에 `timestamp`·`path` 가
  실렸다. `BadRequestException` 도 `HttpException` 의 자식이라 `@Catch(HttpException)` 에 걸린다.
  → **요청 생명주기가 이어져 있다는 실측 증거.**
- `/cats/abc` 가 404 였던 게 왜 틀렸나 — **"없다"가 아니라 "잘못 물었다"**. `abc` 는 애초에
  id 가 될 수 없는 값이라 400 이 맞다. 이제 `/cats/abc`(400)와 `/cats/999`(404)가 갈린다.

**검증 3조각이 다 있어야 막힌다**

```
1. class          ← decorator 를 붙일 수 있는 형태      (이미 있었음)
2. @IsString()    ← "검사해야 할 것" 이라는 메모        (7단계에서 추가)
3. ValidationPipe ← 그 메모를 런타임에 읽고 실행         (7단계에서 추가)
```

3단계에서 `@IsString()` 이 안 먹었던 이유가 3번 부재였다. 패키지(`class-validator`)는
`nest new` 가 처음부터 넣어줬다 — **있었고 읽는 사람만 없었다.**

- `main.ts` 에서 **`useGlobalPipes` 는 `listen` 앞**이어야 한다. `await app.listen()` 뒤에
  등록하면 서버가 이미 뜬 뒤라 **조용히 무시된다**(400 이 안 나오고 201 통과 — 실제로 밟음).

**`?:` 는 런타임에 없다 — 가장 선명한 컴파일/런타임 사례**

`UpdateCatDto` 의 `name?: string` 에 `@IsOptional()` 을 안 붙였더니
`{"age":5}` 만 보낸 PATCH 가 **400** 이 됐다(`name must be a string`).

`?` 는 TypeScript 문법이라 컴파일 후 소멸 → `class-validator` 는 그 정보를 볼 방법이 없다.
**런타임 쪽에도 "없어도 된다"를 따로 알려줘야 한다** = `@IsOptional()`.
그리고 `@IsOptional()` 은 "검사 면제"가 아니라 **"없을 때만 면제"** 다 —
`{"age":"다섯"}` 은 여전히 400(실측).

**`whitelist: true` — 보안 구멍을 막고 다른 걸 깨뜨렸다**

DTO 에 없는 필드는 기본 `ValidationPipe` 가 **통과시킨다**(실측: `evil` 이 201).
`create` 는 필드를 하나씩 골라 담아서 우연히 안전했고, `update` 는 스프레드라 **실제로 저장됐다**
(`{"id":1,...,"evil":"payload"}`). → mass assignment. 같은 DTO 인데 **안전 여부가
서비스 구현에 달린** 상태였다.

`whitelist: true` 로 막았더니 이번엔 **`name`·`breed` 가 사라졌다**:

```
{"age":7} → dto = { name: undefined, age: 7, breed: undefined }
         → { ...기존, ...dto } 에서 undefined 가 기존 값을 덮음
         → JSON 출력에서 undefined 는 키째 빠짐 → "사라진 것처럼" 보임
```

**응답만 보면 못 찾는다.** `console.log(dto)` 로 직접 본 게 답이었다.
`undefined` 와 `null` 의 차이도 여기서 — `null` 은 `{"b":null}` 로 남고 `undefined` 는 빠진다.

**PUT → PATCH 로 바꾼 이유**

| | 의미 | 빠진 필드 |
|---|---|---|
| PUT | 전체 교체 | **지워진다** (안 보냈으니 없는 것) |
| PATCH | 부분 수정 | **유지된다** (언급 안 했을 뿐) |

즉 `{"id":1,"age":9}` 가 나왔던 건 **사실 PUT 의 정의에 맞는 동작**이었다 —
우리가 원한 게 부분 수정이었을 뿐. "일부만 바꾸는 API 를 PUT 으로 만들고 DTO 를 optional 로
두는 것"이 흔한 오용이고 이 코드가 그 상태였다.

PATCH 가 보편적인 근거: `nest g resource` 기본 코드 · 공식 문서 Cats 예제 · GitHub/Stripe API.
PUT 은 전체 교체가 진짜 의도일 때(설정 통째 저장 등). 부수적으로 **PUT 은 멱등 보장, PATCH 는 아님**
(현 구현은 값을 직접 지정하니 실제로는 멱등 — 규약상 보장이 없을 뿐).

**`filter` 는 원본을 안 바꾼다**

```ts
Object.entries(dto).filter(([, v]) => v !== undefined);   // ❌ 결과를 안 쓰면 아무 효과 없음
const changes = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
```

`filter`·`map`·`slice` 는 **새 걸 만들어 반환**하고 원본은 그대로.
`splice`·`push` 는 원본을 바꾼다. 어느 쪽인지 헷갈리면 **반환값을 안 쓰는 죽은 줄**이 생긴다.
`([, v])` 의 앞 빈칸은 첫 번째(키)를 안 쓴다는 표시.

### Step 6 에서 익힌 것

- **필터는 이미 돌고 있었다.** 없는 라우트가 404 JSON 을 주던 것이 내장 전역 필터다.
  새로 켜는 게 아니라 **이미 있는 것에 말을 거는 단계**였다.
- 내장 필터의 규칙은 하나 — `HttpException` 과 그 자식이면 그 객체의 status,
  **그 외 아무거나면 500**. `NotFoundException` 이 404 가 되는 건 필터를 만들어서가 아니라
  **필터가 알아보는 형태로 던졌기 때문**.
- **필터는 던져진 것만 본다. 반환값은 안 본다.** `return undefined` 가 200 이었던 이유 —
  실패라는 신호를 아무에게도 안 보낸 것.
- `@HttpCode(n)` 은 **성공 응답에만** 적용된다. 예외를 던지면 경로가 갈려서 예외의 status 가 이긴다
  (`@HttpCode(204)` 가 붙은 `remove` 에서 404 가 정상적으로 나온 것으로 확인).
  기본값: `@Post` 는 201, 나머지는 200.
- **`@HttpCode(204)` + `return x` 는 모순** — 204 는 본문 금지라 `return` 이 효과가 없다.
  코드에는 있고 동작에는 없는 줄이 생긴다.
- `find` 는 못 찾으면 `undefined`, **`findIndex` 는 `-1`**. `0` 이 유효한 인덱스라서
  falsy 검사(`!catIndex`)를 쓰면 첫 번째 요소에서 틀린다. `splice(-1, 1)` 은 **마지막 요소를 지운다** —
  조용히 틀리는 종류.
- **커스텀 필터가 하는 일은 "응답을 직접 쓰는 것"** — `catch` 본문이 비면 요청이 멈춘다
  (5단계에서 `next()` 를 안 불렀을 때와 같은 증상).
- `ArgumentsHost` 는 **프로토콜이 아직 안 정해진 컨텍스트**. `switchToHttp()`/`switchToWs()`/
  `switchToRpc()` 가 그 선택이다. HTTP 하나만 쓰면 추상화가 비용처럼 보이는 게 맞다.
- `response.status().json()` 은 **Express API** 지 NestJS 가 아니다. 그래서 이 필터는
  Express 에 종속된다(Fastify 로 바꾸면 깨짐). 중립으로 쓰려면 `HttpAdapterHost`.
- `ctx.getResponse()` 는 제네릭 없이 부르면 **`any`** — 오타도 통과한다.
  `getResponse<Response>()` 로 `express` 타입을 넣어야 검사된다.

**제네릭 — 선언 자리와 사용 자리가 반대다**

```ts
class Box<T> { }          // 선언 — 이름을 "만든다"
new Box<string>('hi')     // 사용 — 실제 타입을 "넣는다"
```

`function f(x)` 와 `f(10)` 의 관계와 같다. `<>` 안이라고 같은 게 아니다.

- **`class Filter<HttpException>` 은 import 한 클래스를 가리키지 않는다.** 선언 자리라서
  `T` 를 `HttpException` 이라고 **이름만 바꾼 것**이다(섀도잉). 그래서 `getStatus()` 가 없었다.
  `class Box<string> {}` 은 아예 문법 에러 — 선언 자리엔 이름이 와야 한다.
- 빈 칸이면 **아무 메서드도 못 쓴다.** 틀렸다고 잡은 게 아니라 **맞다고 말할 근거가 없는 것**.
- 섀도잉은 **이름이 겹치는 것 하나만** 가린다. 같은 줄의 `host: ArgumentsHost` 는 멀쩡했다.
- **필터에 제네릭은 무의미하다** — 제네릭 인자는 *호출하는 줄*에 쓰는데,
  `filter.catch(...)` 를 부르는 건 Nest 내부지 내 코드가 아니다. 채울 자리가 없다.
  `@UseFilters(HttpExceptionFilter)` 는 클래스 이름만 넘긴다.
  → **DI 와 같은 구조**: 내가 `new` 를 안 하면 생성자 인자를 못 넣고,
    내가 `catch` 를 안 부르면 제네릭을 못 넣는다. **누가 부르느냐가 무엇을 정할 수 있느냐를 결정한다.**

**던지는 위치 — controller 를 골랐다**

| 방식 | 던지는 곳 | 특징 |
|---|---|---|
| A (채택) | controller | service 가 HTTP 를 모름. 대신 controller 마다 중복 |
| B | service | 중복 1곳. 대신 service 가 HTTP 에 묶임. 공식 문서·실무 다수 |
| C | service(도메인 예외) → 필터가 번역 | 둘 다 해결. 계층 하나 증가 |

C 가 확장성은 낫지만 **지금 도입하면 비용만 낸다.** C 가 값을 하는 조건은
*같은 service 를 HTTP 아닌 곳(CLI·큐·gRPC)에서도 부를 때*인데, 지금 진입점은 HTTP 하나다.
나중에 C 로 가는 비용이 지금 C 로 시작하는 비용과 **거의 같아서**, 미루는 게 이득이다.

**`boolean` 반환을 걷어낸 이유 (code smell)**

`remove` 가 `boolean` 이었을 때 세 가지가 겹쳐 있었다 — 있었나 없었나(정보) / 성공인가(제어) /
`splice` 가 돌려준 객체를 감춤(손실). `Cat | undefined` 로 바꾸니 셋 다 풀리고
`findOne`·`update` 와 **시그니처가 통일**됐다(controller 검사도 `=== undefined` 하나로).
`false` 는 "왜 실패했는지"를 담을 자리가 없어서, 호출자가 **임의로 해석**하게 된다
(권한 문제였어도 404 로 나감).

**DELETE 응답으로 목록을 주지 않은 이유**

목록 갱신은 3가지 길이 있고(응답으로 받기 / 재조회 / 로컬 상태에서 제거),
**로컬 제거도 1왕복**이라 "응답으로 목록"만의 장점이 아니다. 필터·페이지가 붙으면
서버는 *클라이언트가 지금 어떤 뷰를 보는지 모른다*. 엔드포인트는 여러 화면이 공유하므로
한 화면의 편의를 API 성질로 굳히면 다른 호출자가 그 비용을 낸다. → 200 + 삭제된 객체.

### Step 5 에서 익힌 것

- middleware 는 **요청 생명주기의 가장 바깥** — 라우팅 확정 전이라 어떤 핸들러인지 모른다.
- 등록은 `providers` 가 아니라 **`AppModule.configure(consumer)`** — `implements NestModule` 필요.
  지금까지 비어있던 module 클래스 본문에 처음으로 코드가 들어간 사례.
- `forRoutes('*' | 'cats' | CatsController | {path, method})` / `exclude(...)` 로 범위 지정.
- **`next()` 를 부르지 않으면 요청이 멈춘다** — 응답도 로그도 없이 타임아웃.
- `res.statusCode` 는 요청 시점엔 기본값이다. **`res.on('finish')`** 에서 읽어야 실제 응답 코드를 얻는다
  (로그의 `304` 가 그 증거).
- `nest g middleware logger common/middleware` 는 `common/middleware/logger/` 로 **폴더를 한 겹 더** 만든다.
  `--flat` 을 쓰거나 생성 후 옮긴다.

### Step 2~4 에서 익힌 것

- **CLI 가 표준** — `nest g <종류> <이름>`. 이름이 곧 경로(`animals/dogs` 가능, `--flat` 로 폴더 생략).
  손으로 만들면 **module 등록 누락**이 잦고, 그 증상이 404 라 원인이 안 보인다.
- **DTO 는 class, 내부 타입은 interface** — 경계는 "외부에서 들어오는가".
  외부 입력은 런타임 검증이 필요 → decorator 부착 필요 → class 여야 한다.
  interface 에 decorator 는 **문법 에러**(TS1131), 사라지는 게 아니라 애초에 못 붙인다.
  > **Step 15 에서 재정의** — 경계는 "외부 입력인가" 가 아니라 **"런타임 메타데이터가 필요한가"** 였다.
  > Swagger 스키마(`getSchemaPath`·`@ApiProperty`)도 런타임 값이 필요해 응답 모델 `Cat` 이
  > `entities/cat.entity.ts` class 로 넘어간다. `nest g resource` 기본 출력과 같은 형태.
- **decorator 는 검사하지 않는다** — `@IsString()` 이 붙어도 그냥 대입된다(실측).
  `validateSync()` / `ValidationPipe` 가 **읽고 실행**해야 걸린다. 모든 decorator 가 동일 — 메모일 뿐.
- **모듈은 캡슐** — `imports` 는 "연결", `exports` 는 "공개 품목". 양쪽 다 있어야 주입된다.
  `imports: [CatsModule]` 은 **모듈 이름 하나**만 적지만, 그 클래스를 따라가 `exports` 메모를 읽는다.
  → 공개 범위 결정권이 **주는 쪽**에 있다.
- **파일 import ≠ `imports:`** — 전자는 TS 문법(타입 알기), 후자는 DI 범위. 파일 import 만으론 주입 안 된다.
- provider 는 기본 **singleton** — 모듈이 달라도 같은 인스턴스 공유 (`/cats` 로 넣은 걸 `/cat-count` 가 봄)

### 미결 사항 (나중 단계에서 처리)

**CRUD 동작 후 실측한 잘못된 응답 (2026-09-16)**

| 상황 | 현재 | 올바른 응답 | 해결 단계 |
|---|---|---|---|
| ~~없는 id 조회/수정~~ | ~~200 + 빈 본문~~ | 404 | ✅ 해결 (6) |
| ~~없는 id 삭제~~ | ~~200 + `false`~~ | 404 | ✅ 해결 (6) — 성공 시 200 + 삭제된 객체 |
| ~~`/cats/abc`~~ | ~~200 + 빈 본문~~ | 400 | ✅ 해결 (7) — `ParseIntPipe` |
| ~~타입 위반 생성~~ | ~~201 + 그대로 저장~~ | 400 | ✅ 해결 (7) — `ValidationPipe` |

> `undefined` 반환 → NestJS 가 200 + 빈 본문으로 처리한다.
> "성공했으나 데이터 없음" 과 "리소스 없음" 이 구분되지 않는다.

**Jest 테스트가 전부 실패한다 (2026-09-17, 미루기로 결정)**

스펙 5개 전부 1줄 `import { Test } from '@nestjs/testing'` 에서 죽는다.

```
Must use import to load ES Module: .../@nestjs/testing/index.js
The file contains ESM syntax (import/export) that could not be executed as CommonJS.
```

`@nestjs/testing` 12.0.2 가 **ESM 전용**인데 이 프로젝트가 CommonJS 라
Jest 가 `require` 로 로드하려다 실패. **코드 문제가 아니라 환경 문제**다.

- `pnpm build` 는 rc=0 으로 통과한다 — `nest build` 는 `src` 전체를 한 번에 컴파일하므로 무관.
- 먼저 `tsconfig.json` 에 **`rootDir: "./src"`** 를 추가해 TS5011 을 걷었고(TS 6.0 에서 에러로 승격된 것으로 보임 — 릴리스 노트 미확인), 그 뒤에 이 ESM 벽이 드러났다.
- 에러가 제시한 길 3가지: `transformIgnorePatterns` 조정 / babel-jest transform / **Node v24.9+ 의 `require(esm)` 네이티브 지원**(로컬 Node 24.14.1 이라 조건은 이미 충족 — Jest 30 에서 추가 설정이 필요한지 **미확인**).

**미루는 이유**: 현재 스펙 파일은 CLI 가 만든 빈 껍데기라 고쳐도 검증하는 게 없고,
파고들면 NestJS 가 아니라 툴링 학습이 된다. 실제로 테스트를 쓸 단계나
**ESM 전환(Phase 3)에서 저절로 사라질 가능성**도 있다.

- ~~**DTO 런타임 검증 없음**~~ → ✅ 해결 (7) — `class-validator` + `ValidationPipe({ whitelist: true })`.
  `dist/cats/dto/create-cat.dto.js` 를 7단계 전후로 비교하면 `__decorate`·`__metadata` 가 생긴 것을 볼 수 있다.

**남은 미결 (Phase 1 기준 없음)** — 위 4건은 6·7단계에서 모두 해결됐다.
학습용으로 새로 인지한 것: `forbidNonWhitelisted` 를 안 켰으므로 DTO 에 없는 필드는
**조용히 제거**된다(400 이 아님). 클라이언트가 오타를 알아채지 못하는 트레이드오프 — 의도적 선택.

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
