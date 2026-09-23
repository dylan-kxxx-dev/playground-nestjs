# 응답 형식 이원화 해소 (Step 14) Implementation Plan

> **이 레포의 실행 규칙 (skill 기본형과 다름):**
> **코드는 사용자가 직접 작성한다.** 이 플랜은 *무엇을·어디에·왜* 와 목표 형태·검증 방법만 담고,
> 완성된 구현 코드를 싣지 않는다 (`CLAUDE.md` — 학습이 목적). 각 Task 의 "목표 형태" 는
> 시그니처·타입 수준이며, 본문 로직은 사용자가 쓴다. Claude 는 힌트·리뷰만 한다.
> 서브에이전트에 위임하지 않는다.

**Goal:** 성공·에러 응답을 한 봉투로 통일한다 — 현재 네 갈래인 응답 형태를 둘로 줄인다.

**Architecture:** 성공은 전역 `TransformInterceptor` 가 `{data}` 로 감싸고, 에러는 전역 필터
둘이 `{error:{code,message}}` 로 조립한다. 성패 판정은 **HTTP 상태코드 단독** — 바디에
`success` 같은 판정 필드를 두지 않는다. `error.code` 는 `HttpStatus` 의 역방향 조회로 얻어
매핑 테이블을 만들지 않는다.

**Tech Stack:** NestJS 12.0.1 / TypeScript 6.0.3 / rxjs / Express 5 / class-validator

**Spec:** 이 문서의 `## 확정 사항` 절 (2026-09-22 grilling 세션에서 확정)

---

## 확정 사항 (grilling 결과)

```
성공: {"data": ...}
에러: {"error": {"code": "NOT_FOUND", "message": ["Cat not found"]}}
```

| 결정 | 내용 | 기각한 것 |
|---|---|---|
| 판정 방식 | HTTP 상태코드 단독 | `success` 불리언 — 상태코드와 SSOT 가 둘이 된다 |
| 에러 필드 | `code` + `message` 만 | `timestamp`·`path`·`statusCode` — 각각 `Date` 헤더·요청 URL·상태줄과 중복 |
| `code` 출처 | `HttpStatus[status]` 역방향 조회 | 예외 클래스가 `code` 를 직접 들기 — 400 세분화 요구가 아직 없다 |
| `message` 타입 | **항상 `string[]`** | `string` 단독 — 실측으로 배제 (아래) |
| 등록 스코프 | 인터셉터·필터 **전부 전역** | 컨트롤러 스코프 유지 — 커버리지가 어긋난다 |

**`message: string` 을 배제한 실측 근거** (2026-09-22):

```
POST /cats {}  →  "message":["name must be a string",
                             "age must be a number conforming to the specified constraints",
                             "breed must be a string"]
GET /cats/999  →  "message":"Cat not found"
GET /cats/abc  →  "message":"Validation failed (numeric string is expected)"
```

`ValidationPipe` 는 첫 실패에서 멈추지 않고 **실패한 제약을 전부 모아** 던진다. 같은 400 안에서도
배열과 문자열이 갈린다. `join(', ')` 으로 문자열화하면 폼 필드별 에러 표시가 불가능해진다.

## Global Constraints

- NestJS **12.0.1** — API 확인은 기억이 아니라 `https://docs.nestjs.com/v12/` 조회로 한다
- 모듈 시스템 **CommonJS** (ADR 0001)
- **Jest 는 돌지 않는다** (`@nestjs/testing` 12.0.2 ESM 충돌) → 검증은 **curl 실측**
- `AuthGuard` 가 **`x-api-key` 헤더를 요구**한다 — 모든 curl 에 `-H 'x-api-key: dev'` 필수
- `DELETE /cats/:id` 는 `@Roles(['admin'])` — `x-role: admin` 헤더도 필요
- 린트는 `pnpm exec oxlint src/ test/` (`pnpm lint` 는 rtk 훅이 가로채 실패 — 레포 문제 아님)
- 커밋 메시지는 한국어, `type: subject` 형식

## Review Focus

스펙이 함의하지만 어느 Task 의 검증도 직접 다루지 않는 입력들. 각 줄은 담당 Task 에
검증 항목으로 넣었다.

1. **`HttpStatus` 에 없는 상태코드** → `HttpStatus[599] === undefined` 로 `code` 키가 JSON 에서
   통째로 사라진다. `HttpException` 은 임의 상태코드를 담을 수 있다 → **Task 2** 에서 폴백 처리
2. **에러 응답이 이중 포장되는가** → 전역 인터셉터가 에러도 통과시키므로 `{"data":{"error":…}}`
   가 나올 수 있다. `map()` 이 성공 채널만 탄다는 건 추론이지 실측이 아니다 → **Task 4** 검증
3. **`GET /` 가 문자열을 반환한다** → `{"data":"Hello World!"}` 로 감싸지는지. 객체가 아닌
   원시값에 봉투가 붙는 경로 → **Task 4** 검증
4. **`AppController` 에서 난 예외** → `HttpExceptionFilter` 가 전역이 된 뒤에야 잡힌다.
   전역화 전에는 Nest 기본 필터로 새어나갔다 → **Task 3** 검증
5. **`DELETE` 응답이 삭제된 객체를 반환** → 봉투가 붙어 `{"data":{…}}` 가 된다. 204 가 아니라
   200 + 바디라는 기존 결정(Step 6)이 봉투와 충돌하지 않는지 → **Task 4** 검증

---

## File Structure

| 파일 | 책임 | 변경 성격 |
|---|---|---|
| `src/common/interceptors/transform.interceptor.ts` | 성공 응답을 `{data}` 로 감싼다 | `Response<T>` 타입만 조정 (본문 로직은 이미 맞다) |
| `src/common/filters/http-exception.filter.ts` | `HttpException` → 봉투 | 응답 조립부 교체 |
| `src/common/filters/resource-not-found.filter.ts` | 도메인 예외 → 404 봉투 | 응답 조립부 교체 |
| `src/main.ts` | 전역 등록 | 인터셉터·필터 등록 2줄 추가 |
| `src/cats/cats.controller.ts` | 라우팅 | 데코레이터 2개 + 미사용 import 제거 |

**새 파일은 만들지 않는다.** 봉투 타입을 공용 파일로 뽑는 선택지가 있으나, 지금은 타입이
`Response<T>` 하나뿐이라 YAGNI — 필터가 타입을 공유하고 싶어질 때 뽑는다.

---

## Task 1: 성공 봉투 — `TransformInterceptor` 전역화

**Files:**
- Modify: `src/common/interceptors/transform.interceptor.ts`
- Modify: `src/main.ts`
- Modify: `src/cats/cats.controller.ts`

**Interfaces:**
- Produces: `TransformInterceptor<T>` — 전역 등록되어 **모든** 성공 응답을 `{data: T}` 로 감싼다.
  Task 4 의 검증이 이 형태를 전제한다.

**배경:** 현재 `TransformInterceptor` 의 본문(`map((data) => ({data}))`)은 **이미 목표 형태와
같다.** 문제는 스코프뿐 — `cats.controller.ts:29` 에서 `@UseInterceptors(TransformInterceptor)`
가 `findAll` **메서드 레벨**에 붙어 있어 `findAll` 만 감싸진다. 그래서 이 Task 는 로직 변경이
아니라 **등록 위치 이동**이 핵심이다.

- [ ] **Step 1: 현재 상태를 실측으로 고정한다** (변경 전 대조군)

```bash
H='x-api-key: dev'
curl -s -H "$H" http://localhost:3000/cats       # {"data":[…]}   ← 감싸짐
curl -s -H "$H" http://localhost:3000/cats/1     # {"id":1,…}     ← raw
curl -s http://localhost:3000/                    # Hello World!   ← raw
```

셋이 서로 다른 형태인 것을 눈으로 확인한다. 이게 이번 Task 가 없애는 차이다.

- [ ] **Step 2: `cats.controller.ts` 에서 `@UseInterceptors` 제거**

`findAll` 위의 `@UseInterceptors(TransformInterceptor)` 한 줄을 지운다.
`TransformInterceptor` import 와 `UseInterceptors` import 도 **미사용이 되므로 함께 제거**한다
(oxlint 가 잡는다).

- [ ] **Step 3: `main.ts` 에 전역 등록**

`useGlobalInterceptors` 는 **이미 `LoggingInterceptor` 로 호출되고 있다.** 인자를 추가하는
형태로 붙인다 — 두 번째 `useGlobalInterceptors` 호출을 새로 만들지 않는다.

> **순서가 의미를 갖는다.** 인터셉터는 등록 순서대로 요청을 감싸므로, `LoggingInterceptor`
> 와 `TransformInterceptor` 중 어느 쪽이 바깥인지가 정해진다. 어느 순서든 이번 목표엔
> 영향이 없지만, **왜 영향이 없는지** 설명할 수 있어야 한다 (`finalize` 는 감싼 결과가 아니라
> 구독 종료를 보므로).

- [ ] **Step 4: 빌드**

```bash
pnpm build && pnpm exec oxlint src/ test/
```
Expected: 둘 다 rc=0. 미사용 import 를 안 지웠으면 여기서 걸린다.

- [ ] **Step 5: 실측 — Step 1 의 세 요청이 전부 같은 형태가 됐는지**

```bash
H='x-api-key: dev'
curl -s -H "$H" http://localhost:3000/cats       # {"data":[…]}
curl -s -H "$H" http://localhost:3000/cats/1     # {"data":{"id":1,…}}   ← 바뀜
curl -s http://localhost:3000/                    # {"data":"Hello World!"} ← 바뀜
curl -s http://localhost:3000/cat-count           # {"data":{"count":N}}   ← 바뀜
```

`GET /` 는 **문자열**을 반환하는 라우트다 — 원시값에도 봉투가 붙는지가 Review Focus 3.

- [ ] **Step 6: 커밋**

```bash
git add src/common/interceptors/transform.interceptor.ts src/main.ts src/cats/cats.controller.ts
git commit -m "refactor: TransformInterceptor 를 전역으로 올려 모든 성공 응답을 감싼다"
```

---

## Task 2: 에러 봉투 — `HttpExceptionFilter`

**Files:**
- Modify: `src/common/filters/http-exception.filter.ts`

**Interfaces:**
- Consumes: 없음 (Task 1 과 독립)
- Produces: 에러 응답 형태 `{"error":{"code":string,"message":string[]}}`.
  Task 3 이 **같은 형태**를 만들어야 하므로, 여기서 정한 키 이름·순서가 Task 3 의 계약이다.

**목표 형태:**

```jsonc
// 400 검증 실패
{"error":{"code":"BAD_REQUEST","message":["name must be a string","age must be …"]}}
// 401
{"error":{"code":"UNAUTHORIZED","message":["x-api-key header required"]}}
```

**다뤄야 할 세 가지** (전부 현재 코드에 이미 있거나, 실측으로 드러난 것):

1. **`getResponse()` 가 `string` 또는 객체** — 현재 코드가 이미 이 분기를 다룬다. 유지한다.
2. **`message` 가 `string` 또는 `string[]`** — 단일도 배열로 감싼다. `Array.isArray` 로 판정.
3. **`HttpStatus[status]` 가 `undefined` 일 수 있다** ← **Review Focus 1**

> **실측 확인 (2026-09-22)** — `HttpStatus` 는 TS 숫자 enum 이라 역방향 조회가 된다:
> ```
> HttpStatus[404] → "NOT_FOUND"      HttpStatus[400] → "BAD_REQUEST"
> HttpStatus[401] → "UNAUTHORIZED"   HttpStatus[418] → "I_AM_A_TEAPOT"
> HttpStatus[599] → undefined        ← enum 에 없는 코드
> ```
> `HttpException` 은 임의 상태코드를 담을 수 있으므로 `undefined` 경로가 실재한다.
> `undefined` 를 그대로 넣으면 `JSON.stringify` 가 **키째 삭제**해서 `{"error":{"message":[…]}}`
> 가 나간다 — 클라이언트가 `error.code` 를 항상 있다고 가정하면 거기서 깨진다.
> **폴백 문자열을 정해 넣는다** (예: `'UNKNOWN'`).

- [ ] **Step 1: 변경 전 실측** (대조군)

```bash
H='x-api-key: dev'
curl -s -X POST http://localhost:3000/cats -H 'Content-Type: application/json' -H "$H" -d '{}'
curl -s -H "$H" http://localhost:3000/cats/abc
curl -s http://localhost:3000/cats
```
현재 전부 `{"timestamp","statusCode","path","message"}` 형태인 것을 확인한다.

- [ ] **Step 2: 응답 조립부를 봉투로 교체**

`response.status(status).json({…})` 의 인자를 목표 형태로 바꾼다.
`timestamp`·`path` 는 제거하므로 **`request` 변수와 `Request` import 가 미사용**이 된다 —
함께 제거한다 (oxlint 가 잡는다).

`status` 는 `json()` 인자에서는 빠지지만 `response.status(status)` 에는 그대로 필요하다.

- [ ] **Step 3: 빌드·린트**

```bash
pnpm build && pnpm exec oxlint src/ test/
```

- [ ] **Step 4: 실측 — 세 가지 에러 경로**

```bash
H='x-api-key: dev'
# 배열 메시지 (검증 실패 3건)
curl -s -X POST http://localhost:3000/cats -H 'Content-Type: application/json' -H "$H" -d '{}'
# → {"error":{"code":"BAD_REQUEST","message":["name must be …","age must be …","breed must be …"]}}

# 단일 메시지가 배열로 감싸졌는가
curl -s -H "$H" http://localhost:3000/cats/abc
# → {"error":{"code":"BAD_REQUEST","message":["Validation failed (numeric string is expected)"]}}

# 401 (헤더 없음)
curl -s http://localhost:3000/cats
# → {"error":{"code":"UNAUTHORIZED","message":["x-api-key header required"]}}
```

**핵심 확인 3가지:** ① `message` 가 **항상 배열**인가 ② `code` 가 채워졌는가
③ `timestamp`·`path`·`statusCode` 가 **사라졌는가**

- [ ] **Step 5: 커밋**

```bash
git add src/common/filters/http-exception.filter.ts
git commit -m "refactor: HttpExceptionFilter 응답을 error 봉투로 교체"
```

---

## Task 3: 에러 봉투 — `ResourceNotFoundFilter` + 필터 전역화

**Files:**
- Modify: `src/common/filters/resource-not-found.filter.ts`
- Modify: `src/main.ts`
- Modify: `src/cats/cats.controller.ts`

**Interfaces:**
- Consumes: Task 2 가 정한 에러 봉투 형태 `{"error":{"code","message":string[]}}` — **키 이름과
  구조를 그대로 맞춘다.** 두 필터가 다른 형태를 내면 이번 스텝의 목적이 깨진다.
- Produces: `HttpExceptionFilter` 가 전역이 되어 `AppController` 의 예외도 잡힌다.

**목표 형태:**

```jsonc
{"error":{"code":"NOT_FOUND","message":["Cat not found"]}}
```

`ResourceNotFoundError.message` 는 항상 `string` 하나다(`${resource} not found`). 그래도
**배열로 감싼다** — 두 필터의 출력 타입이 같아야 봉투가 하나다.

`code` 는 상태코드가 `HttpStatus.NOT_FOUND` 로 **고정**이므로 Task 2 의 `undefined` 폴백 문제가
없다. 다만 Task 2 와 **같은 방식**(`HttpStatus[…]` 역방향 조회)으로 얻을지, 이 필터는 고정이니
문자열을 직접 쓸지는 선택이다 — 어느 쪽이든 **왜 그렇게 했는지** 설명할 수 있으면 된다.

- [ ] **Step 1: 전역화 전에 "새어나가는 경로" 를 실측한다** ← **Review Focus 4**

`HttpExceptionFilter` 는 지금 `@UseFilters(HttpExceptionFilter)` 로 **`CatsController` 한정**이다.
`AppController` 에서 난 `HttpException` 은 Nest 기본 필터로 나간다. 그 차이를 눈으로 본다:

```bash
curl -s -i http://localhost:3000/없는경로 | tail -3
# → Nest 기본 404 형태 {"message":"Cannot GET /없는경로","error":"Not Found","statusCode":404}
#   ← 봉투 밖. 이게 전역화로 사라질 대상이다
```

- [ ] **Step 2: `resource-not-found.filter.ts` 응답 조립부 교체**

Task 2 와 같은 봉투로. 여기서도 `request`·`Request` import 가 미사용이 된다.

- [ ] **Step 3: `HttpExceptionFilter` 를 전역으로 올린다**

- `main.ts` 의 `useGlobalFilters` 에 인자 추가 (새 호출을 만들지 않는다)
- `cats.controller.ts` 의 `@UseFilters(HttpExceptionFilter)` 제거 + `UseFilters`·
  `HttpExceptionFilter` import 제거

> **등록 순서에 함정이 있다.** `useGlobalFilters(A, B)` 에서 **어느 쪽이 먼저 매칭되는가**를
> 확인해야 한다. `ResourceNotFoundError` 는 `HttpException` 이 **아니므로**(`Error` 직속)
> `@Catch` 대상이 겹치지 않아 이번엔 충돌이 없다 — 하지만 **겹치지 않는다는 걸 확인하고
> 넘어가는 것**과 모르고 지나가는 것은 다르다. Step 11 에서 배운 *"`instanceof` 는 상태코드가
> 아니라 계보를 본다"* 가 여기 걸린다.

- [ ] **Step 4: 빌드·린트**

```bash
pnpm build && pnpm exec oxlint src/ test/
```
Expected: rc=0. `cats.controller.ts` 의 import 4개(`UseFilters`, `UseInterceptors`,
`HttpExceptionFilter`, `TransformInterceptor`)가 전부 지워졌는지 여기서 드러난다.

- [ ] **Step 5: 실측 — 404 봉투 + 전역화 효과**

```bash
H='x-api-key: dev'
curl -s -H "$H" http://localhost:3000/cats/999
# → {"error":{"code":"NOT_FOUND","message":["Cat not found"]}}

curl -s http://localhost:3000/없는경로
# → 이제 봉투 안. Step 1 의 Nest 기본 형태와 비교한다
```

- [ ] **Step 6: 커밋**

```bash
git add src/common/filters/resource-not-found.filter.ts src/main.ts src/cats/cats.controller.ts
git commit -m "refactor: ResourceNotFoundFilter 봉투 통일 및 HttpExceptionFilter 전역화"
```

---

## Task 4: 전체 검증 — curl 9건

**Files:** 없음 (검증 전용). 실패가 나오면 해당 Task 로 돌아간다.

**Interfaces:**
- Consumes: Task 1~3 의 결과 전부

**왜 별도 Task 인가:** Jest 가 안 도는 상태라 **curl 실측이 유일한 검증 수단**이다.
Task 별 실측은 그 Task 가 건드린 경로만 본다 — 여기서는 **서로 간섭하지 않았는지**를 본다.

- [ ] **Step 1: 서버 재시작** (전역 등록 변경은 부트스트랩 시점이라 watch 재적용을 신뢰하지 않는다)

- [ ] **Step 2: 성공 4건**

```bash
H='x-api-key: dev'
curl -s -H "$H" http://localhost:3000/cats
curl -s -H "$H" http://localhost:3000/cats/1
curl -s -X POST http://localhost:3000/cats -H 'Content-Type: application/json' -H "$H" \
  -d '{"name":"나비","age":3,"breed":"코숏"}'
curl -s -X PATCH http://localhost:3000/cats/1 -H 'Content-Type: application/json' -H "$H" \
  -d '{"age":5}'
```
기대: 전부 `{"data":…}`. **`error` 키가 없어야 한다.**

- [ ] **Step 3: 에러 4건**

```bash
H='x-api-key: dev'
curl -s -H "$H" http://localhost:3000/cats/999            # 404 NOT_FOUND
curl -s -H "$H" http://localhost:3000/cats/abc            # 400 BAD_REQUEST 단일→배열
curl -s -X POST http://localhost:3000/cats -H 'Content-Type: application/json' -H "$H" -d '{}'
                                                           # 400 BAD_REQUEST 배열 3건
curl -s http://localhost:3000/cats                        # 401 UNAUTHORIZED
```
기대: 전부 `{"error":{"code":…,"message":[…]}}`. **`data` 키가 없어야 한다.**

- [ ] **Step 4: `GET /` + `DELETE`** ← **Review Focus 3·5**

```bash
curl -s http://localhost:3000/                            # {"data":"Hello World!"} 원시값 봉투
curl -s -X DELETE http://localhost:3000/cats/1 -H 'x-api-key: dev' -H 'x-role: admin'
                                                           # {"data":{…}} 삭제된 객체에 봉투
```
`DELETE` 는 200 + 삭제된 객체라는 Step 6 결정이 봉투와 충돌하지 않는지 본다.

- [ ] **Step 5: 이중 포장 확인** ← **Review Focus 2** (이번 스텝의 핵심 검증)

전역 인터셉터는 에러 요청도 통과한다 — Step 13 에서 `/cats/abc` 400 에 `Before` 가 찍힌 것이
그 증거다. `map()` 이 성공 채널만 탄다는 건 **추론**이므로 눈으로 확인한다:

```bash
curl -s -H 'x-api-key: dev' http://localhost:3000/cats/999
```
- 기대: `{"error":{…}}`
- **실패 신호:** `{"data":{"error":{…}}}` — 이러면 필터가 인터셉터 안쪽에서 돌았다는 뜻이고,
  설계를 다시 봐야 한다

- [ ] **Step 6: 상태코드 확인** (봉투에서 `statusCode` 를 뺐으므로 **상태줄이 유일한 판정자**다)

```bash
H='x-api-key: dev'
for p in /cats /cats/1 /cats/999 /cats/abc; do
  echo -n "$p -> "; curl -s -o /dev/null -w '%{http_code}\n' -H "$H" "http://localhost:3000$p"
done
```
기대: `200 / 200 / 404 / 400`. 바디에서 판정 필드를 뺀 결정이 성립하려면 **여기가 정확해야 한다.**

- [ ] **Step 7: 최종 빌드·린트**

```bash
pnpm build && pnpm exec oxlint src/ test/ && pnpm exec prettier --check src/
```

---

## Task 5: 문서 기록

**Files:**
- Modify: `docs/LEARNING.md`
- Modify: `README.md` (응답 형식을 적어둔 자리가 있으면)

> 문서는 **Claude 가 작성한다** (2026-09-22 사용자 확정). 코드와 달리 이건 대필 대상이 아니다.

- [ ] **Step 1: `LEARNING.md` 진행 기록 표에 Step 14 행 추가**

- [ ] **Step 2: Phase 1.5 표에서 해결된 항목 2개를 ✅ 로 바꾼다**

```
| 응답 형식을 필터에서 손으로 조립 | → ✅ 해결
| 성공 {data} vs 에러 {timestamp,…} 로 응답 형식이 갈림 (9단계) | → ✅ 해결
```

- [ ] **Step 3: "Step 14 에서 익힌 것" 절 작성** — 최소한 아래는 담는다

- `HttpStatus` 숫자 enum 의 **역방향 조회**와 그 구멍(`599 → undefined` → JSON 키 소실)
- `ValidationPipe` 는 **실패를 전부 모아** 던진다 → `message` 타입이 갈리는 근본 원인
- 바디에서 판정 필드를 뺀 이유 — **SSOT 가 둘이면 어긋난다**
- 인터셉터가 에러를 이중 포장하지 않는 이유 (`map` 은 성공 채널)
- 전역화로 사라진 **네 번째 응답 형태** (Nest 기본 필터)

- [ ] **Step 4: 커밋**

```bash
git add docs/LEARNING.md README.md
git commit -m "docs: Step 14 기록 — 응답 봉투 통일"
```

---

## Task 의존 관계

```
Task 1 (성공 봉투) ─┐
Task 2 (에러 봉투 A) ─┼→ Task 4 (전체 검증) → Task 5 (문서)
Task 3 (에러 봉투 B) ─┘
        ↑ Task 2 의 키 이름을 따른다
```

Task 1 과 Task 2 는 **독립** — 순서를 바꿔도 된다. Task 3 은 Task 2 의 봉투 형태를 따르므로
**Task 2 뒤**에 한다. Task 4 는 전부 끝난 뒤.
