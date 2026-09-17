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
| 4 | Modules — CatsModule | 완료 | |
| 5 | Middleware — LoggerMiddleware | 완료 | |
| 6 | Exception filters | 완료 | `672295e` |
| 7 | Pipes — ParseIntPipe / ValidationPipe | 완료 | |

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
