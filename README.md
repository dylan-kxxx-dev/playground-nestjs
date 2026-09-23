# playground-nestjs

NestJS 학습·실험용 개인 플레이그라운드.

---

## 요청 하나가 지나가는 길

`GET /cats/1` 하나가 들어와서 응답이 나갈 때까지. **왼쪽 위에서 시작해 아래로 내려갔다가, 오른쪽으로 올라온다.**

```
        요청                                                      응답
         │                                                         ▲
         ▼                                                         │
┌────────────────────┐                                  ┌────────────────────┐
│ 1. Middleware      │  LoggerMiddleware                │ res.on('finish')   │
│    (Express 층)    │  app.module.ts  forRoutes('*')   │ 로 상태코드 기록   │
└────────┬───────────┘                                  └────────────────────┘
         ▼                                                         ▲
┌────────────────────┐                                             │
│ 2. Guard           │  AuthGuard → RolesGuard          ──401/403──┤
│    통과? 차단?     │  @UseGuards (CatsController)                │
└────────┬───────────┘                                             │
         ▼                                                         │
┌────────────────────┐                                  ┌────────────────────┐
│ 3. Interceptor     │  LoggingInterceptor (전역)       │ 6. Interceptor     │
│    (핸들러 前)     │  "Before..." 출력                │    (핸들러 後)     │
└────────┬───────────┘                                  │ "After... 12ms"    │
         ▼                                              │ TransformInterceptor│
┌────────────────────┐                                  │ (전역) → {data:...} │
│ 4. Pipe            │  ParseIntPipe  '1' → 1           └────────────────────┘
│    변환·검증       │  ValidationPipe (전역) DTO 검사             ▲
└────────┬───────────┘                              ──400──────────┤
         ▼                                                         │
┌────────────────────┐                                             │
│ 5. Controller      │  return this.catsService.findOne(id)        │
│    → Service       │  찾으면 Cat 반환 ───────────────────────────┘
└────────┬───────────┘
         │ 못 찾으면 throw
         ▼
┌────────────────────────────────────────────────────────────────┐
│ Exception Filter   예외가 발생하면 위 흐름을 벗어나 여기로 온다 │
└────────────────────────────────────────────────────────────────┘
```

**핵심 두 가지**

- **가는 길과 오는 길이 다르다.** Guard·Pipe 는 가는 길에만 있고, Interceptor 는 **양쪽 모두**에 있다 (`next.handle()` 앞뒤로 갈린다).
- **어디서든 실패하면 남은 단계를 건너뛰고 Filter 로 간다.** Guard 에서 막히면 Pipe·Controller 는 아예 실행되지 않는다.

> 이 순서는 `docs/LEARNING.md` → `Step 8 에서 익힌 것` 의 "생명주기에서의 위치" 에 상세히 있다.

---

## 예외가 응답이 되기까지

Step 11 에서 만든 구조. **`throw` 한 순간 함수가 탈출하고, 나머지는 Nest 가 한다.**

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. service — 도메인 사실만 말한다. HTTP 를 모른다                │
│                                                                  │
│    findOne(id) {                                                 │
│        const cat = this.cats.find(...)                           │
│        if (!cat) throw new ResourceNotFoundError('Cat')  ────┐   │
│        return cat                                            │   │
│    }                                                         │   │
└──────────────────────────────────────────────────────────────┼───┘
                                                               │
        throw 는 그 자리에서 함수를 빠져나간다                 │
                                                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. controller — 그냥 지나간다. 할 일이 없다                      │
│                                                                  │
│    return this.catsService.findOne(id)                           │
│           ↑ 이 줄이 완료되지 않는다. return 에 도달 못 함        │
└──────────────────────────────────┬───────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Nest — 등록된 필터를 순회하며 instanceof 로 고른다            │
│                                                                  │
│    좁은 스코프부터:  핸들러 @UseFilters                          │
│                   →  컨트롤러 @UseFilters                        │
│                   →  전역 useGlobalFilters  ← 이 레포는 둘 다 여기│
│                                                                  │
│    exception instanceof <@Catch 에 적힌 타입> ?                  │
└──────────────────────────────────┬───────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. filter — 여기서 처음 HTTP 가 등장한다                         │
│                                                                  │
│    response.status(HttpStatus.NOT_FOUND).json({ ... })           │
│                    ↑ 404 라는 숫자가 나오는 유일한 자리          │
└──────────────────────────────────┬───────────────────────────────┘
                                   ▼
        {"error":{"code":"NOT_FOUND","message":["Cat not found"]}}
```

### 왜 이렇게 나눴나

| 층 | 아는 것 | 모르는 것 |
|---|---|---|
| `ResourceNotFoundError` | "Cat 을 못 찾았다" | 404, HTTP, Express |
| `ResourceNotFoundFilter` | "그건 404 다" | 왜 못 찾았는지 |

예외 클래스에는 **404 라는 숫자가 아예 없다.** 그래서 service 는 HTTP 를 모르고, 같은 예외를 나중에 gRPC 필터가 `NOT_FOUND` 코드로 번역해도 service 는 그대로다.

### 필터가 고르는 기준은 상태코드가 아니라 **계보**

```
ResourceNotFoundError  ──→ Error                     ← 전역 필터가 잡는다
NotFoundException      ──→ HttpException ──→ Error   ← 컨트롤러 필터가 잡는다
BadRequestException    ──→ HttpException ──→ Error
ForbiddenException     ──→ HttpException ──→ Error
```

`NotFoundException` **도 404 지만** 전역 필터에 안 걸린다 — 타입이 다르기 때문이다.
반대로 `@Catch(Error)` 였다면 위 넷이 **전부** 걸렸다.

---

## 필터 스코프 — "전역" 은 `main.ts` 뿐

헷갈리기 쉬운 자리. `@UseFilters` 를 컨트롤러에 붙인 것은 **전역이 아니다.**

```
main.ts    app.useGlobalFilters(new F())   ──→ 앱 전체
클래스 위   @UseFilters(F)                  ──→ 그 컨트롤러의 핸들러 전부
메서드 위   @UseFilters(F)                  ──→ 그 메서드 하나
```

현재 이 레포:

| 필터 | 등록 위치 | 스코프 |
|---|---|---|
| `ResourceNotFoundFilter` | `main.ts` | **전역** |
| `HttpExceptionFilter` | `main.ts` | **전역** (Step 14 에서 이동) |

**전에는 `HttpExceptionFilter` 가 `cats.controller.ts` 의 `@UseFilters` 로 `CatsController` 한정이었다.** 그래서 `AppController` 나 라우트 자체가 없는 요청에서 난 예외는 이 필터를 **안 타고** Nest 기본 필터로 나갔다 — 응답 형식이 하나 더 있었던 것이다:

```
전:  GET /nope → {"message":"Cannot GET /nope","error":"Not Found","statusCode":404}
후:  GET /nope → {"error":{"code":"NOT_FOUND","message":["Cannot GET /nope"]}}
```

이름이 `HttpExceptionFilter` 로 범용적인데 스코프는 컨트롤러 하나였다 — **이름이 스코프를 거짓말하고 있었다.**

> 함정 둘: 전역 필터는 `new` 로 만들어 넘기므로 **DI 를 못 받는다.** 그리고 `await app.listen()` **앞**에 등록해야 한다 — 뒤면 조용히 무시된다.

---

## 현재 응답 형식

**모든 응답이 두 형태 중 하나다** (Step 14 에서 통일).

| | 형식 | 만드는 곳 |
|---|---|---|
| 성공 전부 | `{"data": ...}` | `TransformInterceptor` (전역) |
| 에러 전부 | `{"error": {"code": "...", "message": [...]}}` | 두 필터 (둘 다 전역) |

```jsonc
GET /cats/1     {"data":{"id":1,"name":"나비","age":3,"breed":"코숏"}}
GET /           {"data":"Hello World!"}              // 원시값도 감싼다
GET /cats/999   {"error":{"code":"NOT_FOUND","message":["Cat not found"]}}
POST /cats {}   {"error":{"code":"BAD_REQUEST","message":["name must be a string", …]}}
```

**규칙 셋:**

- **성패 판정은 HTTP 상태코드 단독.** 바디에 `success` 같은 판정 필드를 두지 않는다 —
  같은 사실이 두 군데 있으면 어긋난다. 대신 상태코드가 정확해야 한다
- **`message` 는 항상 배열.** `ValidationPipe` 가 실패한 제약을 전부 모아 던지기 때문에
  단일 메시지도 감싸서 타입을 하나로 고정한다
- **`code` 는 `HttpStatus` 역방향 조회.** `HttpStatus[404] === 'NOT_FOUND'`.
  enum 에 없는 코드는 `undefined` 라 `'UNKNOWN_ERROR'` 로 폴백한다

---

## Dev

```bash
pnpm start:dev   # watch 모드, localhost:3000
pnpm build
pnpm test:e2e
pnpm exec oxlint src/ test/   # `pnpm lint` 는 쓰지 않는다 — 아래 참고
```

> `package.json` 의 `lint` 스크립트는 `oxlint src/ test/` 로 올바르다. 그런데 `pnpm lint` 를
> 실행하면 **로컬 셸 훅이 이 명령을 가로채 eslint 로 돌려** `Command "eslint" not found` 가 난다.
> 스크립트의 문제가 아니므로 고칠 것은 없고, `pnpm exec oxlint src/ test/` 를 직접 쓴다.

**Jest 단위 테스트는 전부 실패한다** — `@nestjs/testing` 12.0.2 가 ESM 전용인데 프로젝트가 CommonJS. 코드 문제가 아닌 환경 문제이고, Phase 3 ESM 전환에서 해소될 것으로 본다. 그래서 이 레포의 검증은 **`pnpm build` + `oxlint` + curl 실측**으로 한다.

동작 확인 예시:

```bash
S=http://localhost:3000/cats; H='x-api-key: k'; CT='Content-Type: application/json'
curl -s -X POST $S -H "$H" -H "$CT" -d '{"name":"Tom","age":3,"breed":"Persian"}'
curl -s -w '\n%{http_code}\n' $S/999 -H "$H"                    # 404 "Cat not found"
curl -s -w '\n%{http_code}\n' $S/abc -H "$H"                    # 400
curl -s -w '\n%{http_code}\n' -X DELETE $S/1 -H "$H" -H 'x-roles: user'  # 403
curl -s -w '\n%{http_code}\n' $S/1                              # 401 (키 없음)
```

`x-api-key` 헤더는 **값을 보지 않는 학습용 stub** 이다(존재 여부만 확인). 보안 기능이 아니며 시크릿을 포함하지 않는다.

---

## 구조

```
src/
├── cats/                      # Cats CRUD — 학습 주 소재
│   ├── dto/                   # 외부 입력 → class (검증 decorator 부착)
│   ├── interfaces/            # 내부 타입 → interface
│   ├── cats.controller.ts     # 다섯 핸들러 전부 service 위임 한 줄
│   └── cats.service.ts        # 메모리 배열. 못 찾으면 도메인 예외 throw
├── common/
│   ├── decorators/            # @Roles
│   ├── exceptions/            # ResourceNotFoundError — HTTP 를 모른다
│   ├── filters/               # 예외 → HTTP 응답 변환
│   ├── guards/                # AuthGuard(인증) / RolesGuard(인가)
│   ├── interceptors/          # Logging / Transform (둘 다 전역)
│   └── middleware/            # LoggerMiddleware
├── types/express.d.ts         # req.user — declaration merging
├── app.module.ts              # configure() 로 middleware 등록
└── main.ts                    # 전역 pipe·interceptor·filter 등록
```

---

## 문서

| 파일 | 내용 |
|---|---|
| [`docs/LEARNING.md`](docs/LEARNING.md) | **학습 로드맵 · 단계별로 익힌 것 · 미결 사항.** 이 레포의 중심 문서 |
| [`docs/adr/`](docs/adr/) | 되돌리기 비싼 결정 (ADR) |
| `CLAUDE.md` | 프로젝트 컨텍스트 (AI 에이전트용) |
| `docs/` | TASKS / DECISIONS / INVARIANTS |
