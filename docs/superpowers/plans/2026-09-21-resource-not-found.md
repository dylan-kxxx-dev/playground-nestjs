# 404 중복 제거 (ResourceNotFoundError + Filter) Implementation Plan

> **이 레포는 코드를 사용자가 직접 작성한다.** 아래 각 태스크의 "구현" 스텝은 완성 코드가
> 아니라 **힌트와 제약**이다. Claude 는 가이드·리뷰·검증만 한다 (CLAUDE.md 프로젝트 컨벤션).
> 따라서 `subagent-driven-development` 는 이 플랜에 적용하지 않는다.

> **구현 후 정정 (2026-09-22, 커밋 `1cdfe76`)** — 아래 본문은 2026-09-21 플랜 원안이다.
> 구현 중 두 가지가 바뀌었으므로 **시그니처 서술은 이 주석이 우선**한다.
>
> - **생성자는 `ResourceNotFoundError(resource: string)` 하나뿐이다.**
>   `message?`(Q11/Q12)와 `operation`(Q4)은 **둘 다 제거**됐다.
>   `message?` 는 `findOne` 만 쓰게 돼 세 메서드 응답이 갈렸고, `operation` 은
>   필터·응답 어디서도 읽히지 않았다. 근거는 LEARNING.md `Step 11 에서 익힌 것`.
> - **Task 3 Step 2 의 "빌드 FAIL 기대" 는 틀렸다.** TS 는 `Cat === undefined` 비교를
>   에러로 잡지 않는다(항상 false 인 죽은 코드가 될 뿐). 실제 `pnpm build` 는 rc=0 이었고,
>   죽은 코드 제거 여부는 grep 으로 확인했다. *"실패가 안 나면 `| undefined` 를 덜 지운 것"*
>   이라는 서술도 따라서 무효다.
>
> 그 외(응답 4필드·전역 등록·범위·검증 방법)는 원안대로 실행됐다.

**Goal:** `cats.controller.ts` 의 404 처리 3줄 반복(`findOne`·`update`·`remove`)을 제거하고, service 가 HTTP 를 모르게 만든다.

**Architecture:** service 는 HTTP 를 모르는 도메인 예외 `ResourceNotFoundError` 를 던지고, 전역 `ResourceNotFoundFilter` 가 그것을 404 응답으로 변환한다. 예외는 cats 한정이 아니라 `common/` 의 범용 예외이며, 어느 리소스인지는 생성자 인자로 받는다. 기존 `HttpExceptionFilter`(controller 레벨, `@Catch(HttpException)`)는 건드리지 않는다 — 두 필터는 서로 다른 예외 타입을 잡으므로 충돌하지 않는다.

**Tech Stack:** NestJS 12.0.2 / TypeScript 6.0.3 / CommonJS / Express 5 / pnpm

**Spec:** 이 파일 하단 [부록 A — grilling 요약](#부록-a--grilling-요약-spec) (2026-09-21 세션에서 확정)

## Global Constraints

- **응답 형식 4필드 유지 + message 는 새 기준**: `{"timestamp","statusCode","path","message"}` 구조와 `statusCode`·`path` 값은 그대로. **`message` 만 바뀐다** — `"Cat with id 999 not found"` → **`"Cat not found"`**. (2026-09-21 결정: 범용 예외에서 `id` 는 없는 경우가 더 많다 — 이름 조회·조건 검색·현재 사용자 등. 따라서 `id` 를 생성자에서 제거.) 어느 id 였는지는 `path` 로 추적한다.
- **이 커밋은 순수 리팩터가 아니다**: 구조 변경 + 응답 메시지 변경이 함께 들어간다. 커밋 메시지에 명시한다.
- **service 는 HTTP 를 모른다**: 작업 완료 후 `src/cats/cats.service.ts` 에 `NotFoundException` 등 `@nestjs/common` 의 **HTTP 예외 import 가 0건**이어야 한다.
- **전역 필터는 DI 를 못 받는다**: `main.ts` 에서 `new` 로 생성해 넘기므로 생성자 주입이 불가능하다. 현재 필터는 의존성이 없어 무방하다.
- **`useGlobalFilters` 는 `await app.listen()` 앞에**: 뒤에 두면 조용히 무시된다 (7단계 `useGlobalPipes` 에서 실제로 밟은 함정).
- **범위 밖**: `create`·`findAll`(조회도 비즈니스 규칙도 없어 실패할 자리가 없음 — `create` 의 409 는 12단계 DB 에서), 성공/에러 응답 형식 통일(Phase 1.5 별도 항목), `ParseIntPipe` 3회 반복(#2, 이 커밋 뒤 별도), `.prettierrc`·`cats.controller.ts` 의 포매팅 변경(사용자의 무관한 변경, unstaged 유지).
- **검증은 Jest 가 아니라 실측 HTTP**: 이 레포의 Jest 는 `@nestjs/testing` 12.0.2 가 ESM 전용인데 프로젝트가 CommonJS 라 **스펙 전부 실패**한다(알려진 환경 문제, 코드 문제 아님). 따라서 각 태스크의 검증은 `pnpm build` + `oxlint` + `curl` 실측으로 한다.

## File Structure

| 파일 | 역할 | 신규/수정 |
|---|---|---|
| `src/common/exceptions/resource-not-found.error.ts` | 리소스를 못 찾았다는 **도메인 사실**만 표현. HTTP 를 모른다 | **신규** |
| `src/common/filters/resource-not-found.filter.ts` | 위 예외 → 404 HTTP 응답으로 **변환**만 | **신규** |
| `src/cats/cats.service.ts` | 못 찾으면 던진다. 반환 타입 `Cat \| undefined` → `Cat` | 수정 (L26-48) |
| `src/main.ts` | 필터 전역 등록 | 수정 (L9 뒤) |
| `src/cats/cats.controller.ts` | 404 검사 3곳 제거 | 수정 (L37-41, 45-49, 58-62) |
| `docs/LEARNING.md` | Step 11 기록 + Phase 1.5 표 갱신 | 수정 |

**경계가 왜 이렇게 갈리나**: 예외는 "무슨 일이 일어났는가"(도메인), 필터는 "그걸 HTTP 로 어떻게 말하는가"(전송 계층). 이 둘을 한 파일에 두면 service 가 HTTP 를 모르게 하려던 목적 자체가 무너진다.

---

### Task 1: ResourceNotFoundError (도메인 예외)

**Files:**
- Create: `src/common/exceptions/resource-not-found.error.ts`

**Interfaces:**
- Produces: `ResourceNotFoundError` 클래스. 생성자 `(resource: string, operation: string, message?: string)`. 읽기 전용 필드 `resource`·`operation` 를 노출한다. **`id` 는 받지 않는다.** Task 2 의 필터와 Task 3 의 service 가 이 시그니처에 의존한다.

- [ ] **Step 1: 파일을 만들고 예외 클래스를 작성한다**

제약:
- `Error` 를 상속한다. **`HttpException` 을 상속하지 않는다** — 상속하면 HTTP 를 아는 것이 되어 이번 작업의 목적이 무너진다.
- `@nestjs/common` 을 **import 하지 않는다**. 이 파일의 import 는 0줄이어야 한다.
- 생성자는 `resource`, `operation`, 선택적 `message` 를 받는다. **`id` 는 받지 않는다** — 범용 예외이므로 id 가 없는 조회(이름·조건·현재 사용자)가 더 흔하다. id 를 메시지에 넣고 싶은 호출부는 `message` 를 직접 넘긴다.
- `message` 를 안 넘기면 기본값이 `` `${resource} not found` `` 가 되어야 한다. `'Cat'` 을 넣으면 `Cat not found`.
- 두 필드를 나중에 필터가 읽으므로 `readonly` 로 외부에 노출한다. TypeScript 의 **parameter property** (생성자 인자에 `readonly` 를 붙이면 필드 선언이 생략된다)를 쓰면 짧아진다.
- `super(...)` 는 반드시 호출한다.

제네릭(`<>`)은 쓰지 않는다 — 세 인자의 타입이 전부 확정돼 있으므로 빈칸이 필요 없다. 인자 타입은 `()` 안에 `이름: 타입` 으로 적는다.

힌트 — `Error` 를 상속할 때 자주 빠뜨리는 것:
```ts
this.name = 'ResourceNotFoundError';
```
없어도 동작하지만, 로그에 `Error:` 로만 찍혀 추적이 어려워진다.

> **왜 `operation` 을 받나**: Q2/Q4 에서 *"메서드마다 메시지가 달라질 수 있다"* 로 정했다. 지금은 셋 다 같은 메시지를 쓰지만, `operation` 필드가 있으면 나중에 클래스를 쪼개지 않고 갈라질 수 있다.

- [ ] **Step 2: 컴파일되는지 확인한다**

```bash
pnpm build
```
기대: rc=0. 이 시점에는 아무도 이 클래스를 안 쓰므로 **동작 변화가 없어야 한다**.

- [ ] **Step 3: 커밋하지 않는다**

Task 3 까지 묶어서 커밋한다 — 예외만 있고 던지는 곳이 없는 중간 상태는 되돌릴 가치가 없다.

---

### Task 2: ResourceNotFoundFilter (HTTP 변환)

**Files:**
- Create: `src/common/filters/resource-not-found.filter.ts`
- Reference: `src/common/filters/http-exception.filter.ts` (형식을 그대로 맞출 대상)

**Interfaces:**
- Consumes: Task 1 의 `ResourceNotFoundError` — 필드 `resource`·`operation`·`message`.
- Produces: `ResourceNotFoundFilter` 클래스. Task 4 가 `main.ts` 에서 `new ResourceNotFoundFilter()` 로 생성한다 (인자 없는 생성자여야 한다).

- [ ] **Step 1: 필터를 작성한다**

제약:
- `@Catch(ResourceNotFoundError)` — **`HttpException` 이 아니다.**
- `ExceptionFilter` 를 `implements` 한다.
- 응답은 `http-exception.filter.ts` 와 **완전히 같은 4필드·같은 순서**여야 한다:
  ```
  timestamp  → new Date().toISOString()
  statusCode → 404
  path       → request.url
  message    → exception.message
  ```
- `statusCode` 는 `404` 리터럴 대신 `HttpStatus.NOT_FOUND` 를 쓰는 쪽이 읽기 좋다.
- `request` 는 `ctx.getRequest<Request>()` — `express` 의 `Request` 타입. 기존 필터와 같은 방식.

힌트 — 기존 필터(`http-exception.filter.ts`)의 `catch()` 구조를 보고 `host.switchToHttp()` 부분을 그대로 가져오면 된다. 다르게 할 부분은 딱 둘: **잡는 타입**과 **status 를 예외에서 꺼내지 않고 404 로 고정**하는 것.

> **왜 조립 코드가 두 필터에 중복되나**: Q11 에서 의도적으로 수용했다. 지금 응답 형식을 손대면 이번 리팩터가 "동작 불변" 임을 증명할 수 없다. 형식 통일은 Phase 1.5 의 별도 항목(`{data}` vs `{timestamp,…}`)에서 두 필터를 함께 고친다.

- [ ] **Step 2: 컴파일 확인**

```bash
pnpm build && pnpm exec oxlint src/ test/
```
기대: 둘 다 rc=0. 아직 등록 전이라 동작 변화 없음.

---

### Task 3: service 가 던지도록 바꾼다

**Files:**
- Modify: `src/cats/cats.service.ts:26-48` (`findOne`·`update`·`remove`)

**Interfaces:**
- Consumes: Task 1 의 `ResourceNotFoundError`.
- Produces: `findOne(id: number): Cat` / `update(id: number, dto: UpdateCatDto): Cat` / `remove(id: number): Cat` — **셋 다 `| undefined` 가 사라진다.** Task 5 의 controller 가 이 시그니처에 의존한다.

- [ ] **Step 1: 세 메서드를 수정한다**

제약:
- 반환 타입에서 `| undefined` 를 **지운다**. 이것이 이번 태스크의 핵심 — 타입이 안 바뀌면 controller 에서 `undefined` 검사를 못 지운다.
- 못 찾았을 때 `return undefined` 대신 `throw new ResourceNotFoundError('Cat', '<메서드명>')`. **`id` 인자는 없다.**
- `operation` 인자는 각각 `'findOne'`·`'update'`·`'remove'`.
- `findOne` 은 지금 `find()` 한 줄이라 구조를 바꿔야 한다 — 결과를 변수에 받고 `undefined` 면 던진다.
- `update`·`remove` 는 이미 `if (catIndex === -1)` 분기가 있으므로 그 안의 `return undefined` 만 `throw` 로 바꾸면 된다.
- **`create`·`findAll` 은 건드리지 않는다** (Global Constraints 범위 밖).

> **왜 `findOne` 도 던지나**: Q7 에서 (a)로 정했다. 메서드마다 규칙이 다르면 호출하는 쪽이 매번 외워야 한다. 진짜로 "있는지만 확인" 이 필요해지면 그때 `exists(id): boolean` 을 **따로 추가**한다.

- [ ] **Step 2: 컴파일이 실패하는 것을 확인한다 (의도된 실패)**

```bash
pnpm build
```
기대: **FAIL**. `cats.controller.ts` 에서 `result === undefined` 비교가 이제 불가능한 타입이라 TS 가 잡는다. 에러 메시지에 `cats.controller.ts` 의 줄 번호가 나와야 한다.

> **이 실패가 중요하다.** 타입이 실제로 좁아졌다는 증거이고, controller 에서 지워야 할 자리를 컴파일러가 정확히 짚어준다. 실패가 안 나면 `| undefined` 를 덜 지운 것이다.

- [ ] **Step 3: 커밋하지 않는다** — Task 5 에서 controller 를 고쳐야 빌드가 다시 통과한다.

---

### Task 4: 필터를 전역 등록한다

**Files:**
- Modify: `src/main.ts` (L9 `useGlobalPipes` 다음 줄)

**Interfaces:**
- Consumes: Task 2 의 `ResourceNotFoundFilter`.

- [ ] **Step 1: `main.ts` 에 한 줄 추가한다**

제약:
- `app.useGlobalFilters(new ResourceNotFoundFilter());`
- 위치는 **`await app.listen(...)` 앞** (Global Constraints). `useGlobalPipes` 줄 바로 다음이 자연스럽다.
- import 를 잊지 않는다.

> **기존 `HttpExceptionFilter` 는 전역으로 옮기지 않는다** — 범위 밖이고, controller 레벨에 그대로 둬도 두 필터는 다른 타입을 잡으므로 충돌하지 않는다.

- [ ] **Step 2: 아직 빌드는 실패 상태다**

Task 3 의 타입 변경 때문에 controller 가 여전히 안 맞는다. 다음 태스크에서 해소된다.

---

### Task 5: controller 의 404 검사 3곳을 제거한다

**Files:**
- Modify: `src/cats/cats.controller.ts:37-41`, `:45-49`, `:58-62`

**Interfaces:**
- Consumes: Task 3 의 새 시그니처 (`findOne`/`update`/`remove` 가 `Cat` 반환).

- [ ] **Step 1: 세 핸들러를 한 줄로 줄인다**

제약:
- `findOne`·`update`·`remove` 각각의 본문이 `return this.catsService.<메서드>(...)` **한 줄**이 된다.
- `const result = ...` / `if (result === undefined)` / `throw new NotFoundException(...)` 전부 삭제.
- **`NotFoundException` import 를 지운다** (L8). 더 이상 쓰지 않는다 — 안 지우면 oxlint 가 미사용 import 로 잡을 수 있다.
- `@Param('id', ParseIntPipe)` 는 **그대로 둔다** — 별개 항목(#2)이다.
- `findAll`·`create` 는 건드리지 않는다.

- [ ] **Step 2: 빌드·린트 통과 확인**

```bash
pnpm build && pnpm exec oxlint src/ test/
```
기대: **둘 다 rc=0**. Task 3 에서 의도적으로 깨뜨린 빌드가 여기서 복구된다.

- [ ] **Step 3: service 에 HTTP 가 없는지 확인한다**

```bash
grep -n "NotFoundException\|HttpException\|@nestjs/common" src/cats/cats.service.ts
```
기대: `@nestjs/common` 은 `Injectable` 때문에 **1줄만** 나오고, `NotFoundException`·`HttpException` 은 **0건**.

- [ ] **Step 4: 서버를 띄우고 실측한다**

```bash
pnpm start:dev
```

seed 후 아래 전부 확인 (`x-api-key: k` 필수):

```bash
S=http://localhost:3000/cats; H='x-api-key: k'; CT='Content-Type: application/json'
curl -s -X POST $S -H "$H" -H "$CT" -d '{"name":"Tom","age":3,"breed":"Persian"}'   # 201

curl -s -w '\n%{http_code}\n' $S/999 -H "$H"                                        # 404
curl -s -w '\n%{http_code}\n' -X PATCH $S/999 -H "$H" -H "$CT" -d '{"age":1}'       # 404
curl -s -w '\n%{http_code}\n' -X DELETE $S/999 -H "$H" -H 'x-roles: admin'          # 404
curl -s -w '\n%{http_code}\n' $S/1 -H "$H"                                          # 200
curl -s -w '\n%{http_code}\n' -X PATCH $S/1 -H "$H" -H "$CT" -d '{"age":7}'         # 200
curl -s -w '\n%{http_code}\n' $S/abc -H "$H"                                        # 400 (회귀 확인)
curl -s -w '\n%{http_code}\n' $S -H "$H"                                            # 200 {"data":[...]}
curl -s -w '\n%{http_code}\n' -X POST $S -H "$H" -H "$CT" -d '{"age":5}'            # 400
curl -s -w '\n%{http_code}\n' -X DELETE $S/1 -H "$H" -H 'x-roles: user'             # 403 (회귀 확인)
curl -s -w '\n%{http_code}\n' -X DELETE $S/1 -H "$H" -H 'x-roles: admin'            # 200
```

**가장 중요한 확인 — 404 본문:**

```
{"timestamp":"...","statusCode":404,"path":"/cats/999","message":"Cat not found"}
```

`message` 가 **`Cat not found`** 여야 한다(리팩터 전 `Cat with id 999 not found` 에서 의도적으로 변경). 나머지 3필드는 이름·순서·값 모두 그대로여야 한다 — `statusCode` 404, `path` `/cats/999`.

> `/cats/abc` 의 400 과 `DELETE` 의 403 을 굳이 확인하는 이유: 전역 필터를 새로 붙였으므로 **다른 예외 경로가 가로채이지 않았는지** 봐야 한다. `@Catch(ResourceNotFoundError)` 가 좁아서 안 걸리는 게 정상이다.

- [ ] **Step 5: 커밋**

```bash
git add src/common/exceptions/resource-not-found.error.ts \
        src/common/filters/resource-not-found.filter.ts \
        src/cats/cats.service.ts src/cats/cats.controller.ts src/main.ts
git commit
```

메시지 (본문 포함):
```
refactor: 404 처리를 도메인 예외 + 전역 필터로 이관

BREAKING: 404 message 가 "Cat with id N not found" -> "Cat not found" 로 바뀐다.
범용 예외에서 id 가 없는 조회(이름·조건·현재 사용자)가 더 흔하므로 생성자에서
제외했다. 어느 id 였는지는 응답의 path 로 추적한다.

- ResourceNotFoundError(resource, operation, message?) 신설 —
  common/ 의 범용 예외. HttpException 을 상속하지 않아 HTTP 를 모른다
- ResourceNotFoundFilter 를 전역 등록, 404 + 기존과 동일한 4필드 응답으로 변환
- service: findOne/update/remove 가 Cat | undefined → Cat, 못 찾으면 throw
- controller: undefined 검사 3곳(각 3줄) 제거, NotFoundException import 제거
- 실측: /cats/999 404 message "Cat not found" / PATCH·DELETE 999 404 /
  정상경로 200 / /cats/abc 400 · DELETE roles:user 403 무회귀

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FrjiiiYQavzXnbdMihxU5p
```

> `.prettierrc` 와 `cats.controller.ts` 의 포매팅 변경은 **이 커밋에 넣지 않는다** — 무관한 변경이다. `git add` 에 파일을 명시하는 이유가 이것(`-A` 금지).

---

### Task 6: LEARNING.md 기록

**Files:**
- Modify: `docs/LEARNING.md` — 진행 기록 표 + Phase 1.5 표 + Step 11 절 신규

- [ ] **Step 1: 진행 기록 표에 행을 추가한다**

`| 10 | Phase 1.5 — DTO 중복 제거 (PartialType) | 완료 | ... |` 다음에:
```
| 11 | Phase 1.5 — 404 중복 제거 (도메인 예외 + 필터) | 완료 | <커밋 해시> |
```

- [ ] **Step 2: Phase 1.5 후보 표에서 해당 행을 해결 처리한다**

```
| ~~404 `throw` 3줄이 3곳 반복~~ | ✅ **해결** — 도메인 예외 + 전역 필터 (Step 11) |
```

- [ ] **Step 3: `### Step 11 에서 익힌 것` 절을 Step 10 절 **앞**에 추가한다**

(이 파일의 단계 절은 **최신이 위**로 정렬돼 있다.)

담을 내용:

| 항목 | 요지 |
|---|---|
| 층의 책임 분리 | 예외 = "무슨 일이 일어났나"(도메인) / 필터 = "HTTP 로 어떻게 말하나"(전송). service 가 `NotFoundException` 을 던지면 **모든 소비자가 HTTP 라고 가정**하는 것 |
| service : controller = 1 : N | `exports: [CatsService]` 가 이미 공유를 전제. provider 는 **싱글턴** — `POST /cats` 결과가 `/cat-count` 에 바로 보이는 게 증거. "controller 마다 service" 로 가면 **중복 service** 가 생긴다 |
| 예외를 일반화한 이유 | "id 로 찾았는데 없다" 는 cats 고유 지식이 아니다. 리소스 이름은 **필드로 받으면 되는 것**이었다. 덕분에 `common/` 필터가 `cats/` 를 import 하는 역방향 의존이 아예 안 생긴다 |
| 포기한 것 | `resource` 가 문자열이라 **오타를 컴파일러가 못 잡는다**. 리소스 1개 + 필터가 분기 없음이라 지금은 수용 |
| 타입이 먼저, 삭제는 나중 | service 반환 타입에서 `\| undefined` 를 지우면 **컴파일러가 controller 의 지울 자리를 정확히 짚어준다**. Task 3 의 의도된 빌드 실패가 그 증거 — 실패가 안 나면 타입이 안 좁아진 것 |
| `create` 가 실패하지 않는 진짜 이유 | 서버가 id 를 만들어서가 **아니라**, **기존 데이터를 조회하지 않아서**다. `findOne`·`update`·`remove` 는 "먼저 찾는다" 로 시작하니 못 찾는 실패가 있다. 클라이언트가 id 를 정하는 설계였다면 create 도 조회가 필요하고 **409** 가 생긴다 |
| 전역 필터의 함정 | `new` 로 등록해서 **DI 를 못 받는다**. 그리고 `listen` **앞**에 둬야 한다(7단계 `useGlobalPipes` 와 같은 함정) |
| 남긴 중복 | 응답 4필드 조립이 두 필터에 중복. **의도적** — 형식을 지금 손대면 "동작 불변" 을 증명할 수 없다 |

**되돌릴 조건도 함께 적는다** (Q9):
> `resource` 의 문자열 일반화는 조건부다. ① 필터 안에 `resource` 문자열 **분기**가 생기거나, ② 리소스가 **3개 이상**이 되면 → 타입으로 쪼갠다(`CatNotFoundError` 등). 그 전까지는 현 설계가 맞다.

- [ ] **Step 4: 커밋**

```bash
git add docs/LEARNING.md docs/superpowers/plans/2026-09-21-resource-not-found.md
git commit -m "docs: Step 11 기록 — 404 도메인 예외 이관"
```

---

## 완료 기준 (전체)

- [ ] `pnpm build` rc=0
- [ ] `pnpm exec oxlint src/ test/` rc=0
- [ ] `grep -c "result === undefined" src/cats/cats.controller.ts` → **0**
- [ ] `grep -c "NotFoundException" src/cats/cats.controller.ts` → **0**
- [ ] `grep -c "NotFoundException\|HttpException" src/cats/cats.service.ts` → **0**
- [ ] `GET /cats/999` → 404, `message` 가 **`Cat not found`**, `statusCode`·`path` 는 기존과 동일
- [ ] `/cats/abc` 400 · `DELETE roles:user` 403 · `GET /cats` 200 `{"data":[…]}` 무회귀
- [ ] LEARNING.md Step 11 절 + Phase 1.5 표 갱신 + 되돌릴 조건 기록

---

## 부록 A — grilling 요약 (spec)

2026-09-21 세션에서 확정. 결정 근거는 아래가 SSOT.

**목적:** 404 처리 3줄 × 3곳 중복 제거 + service 를 HTTP 로부터 분리.

**선택:** B안 (도메인 예외 + 변환 필터). A안(service 가 `NotFoundException` 직접 던짐)은 소비자가 이미 2곳(`CatsController`·`AppController`)이라 "모든 소비자가 HTTP" 가정이 깨져서 기각. C안(현행 유지 + helper)은 실패 비용 0인 학습 레포에서 배울 게 없어 기각.

**질문별 결정:**

| Q | 결정 |
|---|---|
| Q1 service 가 HTTP 를 알아도 되나 | **아니오** → B안 |
| Q2 세 메서드의 404 가 같은 의미인가 | 지금은 같으나 **메시지가 갈릴 수 있음** (status 는 아님) |
| Q3 `AppController` 취급 | 설계 변경 없음. 단 소비자 복수가 B안의 근거가 됨 |
| Q4 예외 개수 | **(c)** 컨텍스트를 실은 하나 — `operation` 필드로 갈릴 여지만 확보 |
| Q5 필터 | **새로 만든다** — 각자 자기 일만 |
| Q6 예외 위치 | **`common/` 의 범용** `ResourceNotFoundError(resource, operation, message?)` — 사용자 제안이 Claude 원안(`CatNotFoundError` in `cats/`)을 대체 |
| Q7 반환 타입 변경 범위 | **(a)** 셋 다 `Cat` 반환 |
| Q8 `create`·`findAll` | 손대지 않음. **`create` 의 예외는 12단계 DB 에서** |
| Q9 되돌릴 조건 | **기록한다** — 필터에 문자열 분기 발생 시 / 리소스 3개 이상 시 |
| Q10 필터 등록 | **전역** (`main.ts`, `listen` 앞) |
| Q11 응답 형식 | 4필드 구조는 **기존과 동일**, 조립 중복은 수용. **단 `message` 는 변경** — 아래 Q12 |

| Q12 `id` 를 생성자에 둘 것인가 (2026-09-21 추가) | **제거.** 범용 예외라 id 없는 조회가 더 흔하다. 기본 메시지는 `${resource} not found`. "응답 바이트 불변" 제약을 공식 폐기하고 `message` 만 새 기준으로 둔다 |

**폐기되는 기존 전제:**
- state 의 *"service 시그니처 통일: `findOne`·`update`·`remove` 전부 `Cat | undefined`"* → `Cat` 으로 대체.
- 플랜 초안의 *"응답 바이트 불변"* → `message` 변경을 허용하는 기준으로 대체 (Q12).
