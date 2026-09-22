# `@Param` ParseIntPipe 반복 제거 Implementation Plan

> **이 레포는 코드를 사용자가 직접 작성한다.** 아래 각 태스크의 "구현" 스텝은 완성 코드가
> 아니라 **힌트와 제약**이다. Claude 는 가이드·리뷰·검증만 한다 (CLAUDE.md 프로젝트 컨벤션).
> 따라서 `subagent-driven-development` 는 이 플랜에 적용하지 않는다.
> **문서(LEARNING.md·이 플랜)는 Claude 가 작성한다** (2026-09-22 사용자 확정).

> ## ⛔ 실행 결과: **기각** (2026-09-22)
>
> Task 1 게이트에서 탈락했다. `transform: true` 는 **변환은 하지만 실패를 막지 않는다** —
> `/cats/abc` 가 400 에서 **404 로 퇴행**했다(`NaN` 이 조용히 통과). Q3 의 채택 조건이
> 깨졌으므로 Q9 에서 정한 대로 **(a) 롤백**했다. Task 2·3 은 실행하지 않았다.
>
> | 요청 | `ParseIntPipe` | 결과 |
> |---|---|---|
> | `GET /cats/1` | 제거 | 200 — 변환은 된다 |
> | `GET /cats/abc` | 제거 | **404** (기대 400) |
> | `GET /cats/1.5` | 제거 | **404** (기대 400) |
> | `DELETE /cats/abc` | 남김 (대조군) | 400 |
>
> 코드는 `git checkout` 으로 원복됐고 반복은 그대로 남아 있다. 상세 분석·되돌릴 조건은
> LEARNING.md `Step 12 에서 익힌 것`. **이 플랜은 실행 이력으로만 남긴다.**

**Goal:** `cats.controller.ts` 의 `@Param('id', ParseIntPipe)` 3회 반복을 전역 `ValidationPipe({ transform: true })` 로 대체한다.

**Architecture:** NestJS v12 문서가 코드 예시로 보여주는 유일한 반복 제거 방법을 쓴다 — 전역 `ValidationPipe` 에 `transform: true` 를 켜면 핸들러 시그니처의 `id: number` 타입만 보고 string→number 변환이 일어난다. 데코레이터 인자가 필요 없어진다. **단 문서에 변환 실패 동작 서술이 없으므로**(원문: "will **try to** convert"), `/cats/abc` → 400 이 유지되는지를 **먼저 실측**하고 그 결과에 따라 진행 여부를 가른다.

**Tech Stack:** NestJS 12.0.1 / TypeScript 6.0.3 / CommonJS / Express 5 / pnpm / class-validator

**Spec:** 이 파일 하단 [부록 A — grilling 요약](#부록-a--grilling-요약-spec) (2026-09-22 세션에서 확정)

## Global Constraints

- **`/cats/abc` → 400 (Bad Request) 유지가 채택 조건이다.** 상태코드와 4필드 응답 형식(`timestamp`·`statusCode`·`path`·`message`)은 **불변**. `message` 문구는 **가변** (Step 11 과 같은 기준 — 방식이 바뀌면 문구가 달라질 수 있다).
- **실패 시 롤백(a).** Task 1 실측에서 400 이 안 나오면 `transform: true` 를 되돌리고 `ParseIntPipe` 를 유지한 채 종료한다. **혼합(b)·커스텀 복구(c)는 기각됐다** — 문서는 `transform` ↔ `ParseIntPipe` 2택으로만 제시하며 섞는 예시가 없으므로, 고르면 문서 권장이 아니라 문서에 없는 길이 된다.
- **`ParseIntPipe` 는 전부 제거하거나 전부 남긴다.** 일부만 남기는 것은 Step 11 의 `message?` 와 같은 불일치.
- **기존 전역 파이프 설정을 교체하지 않고 옵션을 추가한다** — `whitelist: true` 는 그대로 유지. 지우면 DTO 에 없는 필드가 통과하게 되어 별개 회귀가 생긴다.
- **`useGlobalPipes` 는 `await app.listen()` 앞에** (이미 그렇다. 순서를 바꾸지 않는다).
- **검증은 Jest 가 아니라 실측 HTTP**: 이 레포의 Jest 는 `@nestjs/testing` 12.0.2 가 ESM 전용인데 프로젝트가 CommonJS 라 **스펙 전부 실패**한다(알려진 환경 문제). 따라서 검증은 `pnpm build` + `oxlint` + `prettier --check` + `curl` 실측으로 한다.
- **범위 밖**: 응답 형식 이원화(별도 항목, 두 필터를 함께 고쳐야 함) / `tap`→`finalize`(별도) / `{"age":null}` 구멍 해결(12단계 DB) / `forbidNonWhitelisted` / 커스텀 파라미터 데코레이터 학습(Phase 1.5 의 `getRequest()` 항목).

## Review Focus

이 플랜의 태스크 테스트가 직접 다루지 않지만 실제로 물릴 수 있는 입력들. Task 3 의 실측 표에 각각 대응 행을 넣었다.

1. **`/cats/abc` — 변환 불가 문자열.** 문서에 실패 동작 서술이 없다. 400 이 아니면 채택 불가 → Task 1 에서 **가장 먼저** 본다.
2. **`/cats/1.5` — 정수가 아닌 숫자.** `ParseIntPipe` 는 400 을 냈다. `transform` 이 `1.5` 를 통과시키면 `cat.id === 1.5` 가 항상 false 라 **조용한 404** 가 된다(에러 아님, 더 찾기 어렵다).
3. **`/cats/999999999999999999999` — 범위 초과.** 부동소수점 정밀도로 다른 수가 될 수 있다.
4. **`{"age":null}` — 알려진 구멍.** `IsOptional` 이 `null` 도 skip 한다. `transform` 이 이 동작을 **바꾸면 그것도 회귀**다(이번 작업 대상이 아니므로 현 상태 유지가 정답).
5. **`{"age":"5"}` — 문자열 숫자를 DTO 로 전송.** `transform` 은 DTO 에도 걸린다. 지금까지 400 이었다면 200 으로 바뀔 수 있고, 그러면 `create`·`update` 검증이 느슨해진 것이다.

---

## File Structure

| 파일 | 역할 | 신규/수정 |
|---|---|---|
| `src/main.ts` | 전역 파이프 옵션에 `transform: true` 추가 (L10) | 수정 |
| `src/cats/cats.controller.ts` | `ParseIntPipe` 3곳 + import 제거 (L7·35·39·48) | 수정 |
| `docs/LEARNING.md` | Step 12 기록 + Phase 1.5 표 갱신 + lint 오진 정정 | 수정 |

**왜 파일이 둘뿐인가**: 이번 변경은 "선언을 한 곳으로 모으는 것"이라 로직 이동이 없다. Step 11 이 예외/필터 두 파일을 새로 만든 것과 대조적이다.

---

### Task 1: 실측으로 채택 여부부터 가른다 (게이트)

> **이 태스크는 코드를 남기지 않는다.** `transform: true` 를 켜고 `/cats/abc` 를 때려본 뒤,
> 400 이면 Task 2 로 가고 아니면 **되돌리고 종료**한다. 문서에 답이 없으므로 실험이 먼저다.

**Files:**
- Modify (임시): `src/main.ts:10`

**Interfaces:**
- Produces: Task 2 의 진행 여부. 400 이 확인돼야 Task 2 가 성립한다.

- [ ] **Step 1: 서버를 띄운다**

```bash
pnpm start:dev
```

`Nest application successfully started` 확인. 이 상태에서 **변경 전 기준값**을 먼저 잡는다:

```bash
S=http://localhost:3000/cats; H='x-api-key: k'; CT='Content-Type: application/json'
curl -s -X POST $S -H "$H" -H "$CT" -d '{"name":"Tom","age":3,"breed":"Persian"}'
curl -s -w ' [%{http_code}]\n' $S/abc -H "$H"
curl -s -w ' [%{http_code}]\n' $S/1.5 -H "$H"
```

기대 (현재 `ParseIntPipe` 동작):
```
400  {"timestamp":…,"statusCode":400,"path":"/cats/abc","message":"Validation failed (numeric string is expected)"}
400  같은 형식, path=/cats/1.5
```

이 두 줄을 **적어둔다.** Step 3 의 비교 대상이다.

- [ ] **Step 2: `main.ts` L10 에 `transform: true` 를 추가한다**

제약:
- 기존 `whitelist: true` 를 **지우지 않는다.** 옵션 객체에 키를 하나 더 넣는 것이다.
- `useGlobalPipes` 줄의 위치는 바꾸지 않는다 (`listen` 앞 유지).
- 이 단계에서 `cats.controller.ts` 는 **아직 건드리지 않는다.** `ParseIntPipe` 가 남아 있어도 `transform` 과 공존하므로 서버는 뜬다. 한 번에 둘 다 바꾸면 400 이 어느 쪽 때문인지 구분할 수 없다.

watch 모드가 재시작되는지 확인한다.

- [ ] **Step 3: 게이트 — `/cats/abc` 를 다시 때린다**

```bash
curl -s -w ' [%{http_code}]\n' $S/abc -H "$H"
curl -s -w ' [%{http_code}]\n' $S/1.5 -H "$H"
```

**이 시점에는 `ParseIntPipe` 가 아직 있으므로 400 이 나오는 게 당연하다.** 여기서 보는 것은 "transform 을 켜도 기존 동작이 안 깨졌나" 하나다. 400 이 아니면 `transform` 이 `ParseIntPipe` 를 방해한 것이므로 **즉시 롤백하고 종료**한다.

- [ ] **Step 4: 진짜 게이트 — `ParseIntPipe` 를 한 곳만 지우고 본다**

`cats.controller.ts:35` 의 `findOne` **한 곳만** `@Param('id') id: number` 로 바꾼다. (`update`·`remove` 와 L7 import 는 그대로 둔다.)

```bash
curl -s -w ' [%{http_code}]\n' $S/abc -H "$H"      # ← 이 줄이 이번 작업의 전부다
curl -s -w ' [%{http_code}]\n' $S/1.5 -H "$H"
curl -s -w ' [%{http_code}]\n' $S/1 -H "$H"
curl -s -w ' [%{http_code}]\n' -X PATCH $S/1 -H "$H" -H "$CT" -d '{"age":7}'
```

판정:

| `/cats/abc` 결과 | 판정 | 다음 |
|---|---|---|
| **400** + 4필드 형식 | ✅ 채택 | Task 2 로 진행 |
| 200 / 404 (NaN 조용히 통과) | ❌ 롤백 | Step 5 |
| 500 또는 4필드 아닌 형식 | ❌ 롤백 | Step 5 |

`/cats/1.5` 도 함께 본다 — 여기서 404 가 나오면 **조용한 실패**다(Review Focus 2). 400 이 아니어도 롤백 사유로 본다.

`/cats/1` 200 과 `PATCH` 200 은 **정상 경로가 살아 있는지** 확인이다. 여기가 깨지면 변환 자체가 안 된 것이다.

- [ ] **Step 5: (롤백 경로) 되돌리고 종료한다**

```bash
git checkout -- src/main.ts src/cats/cats.controller.ts
pnpm build
```

Task 2·3 은 실행하지 않는다. **Task 4 로 건너뛰어 실패를 기록한다** — "공식 문서 권장이 이 레포에선 안 맞았다" 는 그 자체로 값어치 있는 학습 기록이다. Phase 1.5 표의 이 항목은 **해결 처리하지 않고** 확인된 사실을 적는다.

- [ ] **Step 6: (채택 경로) 커밋하지 않는다**

Task 2 에서 나머지를 지워야 일관된 상태가 된다.

---

### Task 2: `ParseIntPipe` 를 전부 제거한다

> Task 1 Step 4 가 **400 을 확인했을 때만** 실행한다.

**Files:**
- Modify: `src/cats/cats.controller.ts:7` (import), `:39` (`update`), `:48` (`remove`)
- (`:35` `findOne` 은 Task 1 Step 4 에서 이미 변경됨)

**Interfaces:**
- Consumes: Task 1 의 `main.ts` `transform: true`.
- Produces: `ParseIntPipe` 0건인 컨트롤러. Task 3 의 전체 실측이 이 상태를 검증한다.

- [ ] **Step 1: 남은 두 곳을 바꾼다**

`:39` `update` 와 `:48` `remove` 의 `@Param('id', ParseIntPipe)` → `@Param('id')`.

제약:
- **`id: number` 타입 표기는 반드시 남긴다.** `transform` 이 이 타입을 보고 변환한다 — 지우거나 `any` 로 바꾸면 변환이 일어나지 않는다. 이번 방식의 **핵심 의존점**이다.
- `@Body() updateCatDto: UpdateCatDto` 는 건드리지 않는다.
- `@Roles(['admin'])` 등 다른 데코레이터는 그대로.

- [ ] **Step 2: import 를 지운다**

`:7` 의 `ParseIntPipe,` 한 줄 삭제. 안 지우면 oxlint 가 미사용 import 로 잡는다.

- [ ] **Step 3: 빌드·린트·포맷 확인**

```bash
pnpm build && pnpm exec oxlint src/ test/
rtk proxy pnpm exec prettier --check "src/**/*.ts" "test/**/*.ts"
```

기대: 셋 다 rc=0.

> `prettier --check` 를 `rtk proxy` 로 부르는 이유: 2026-09-22 실측에서 재작성된 출력이
> `All files formatted correctly` 를 내면서 **rc=1** 이었다(실제로는 20개 파일 불일치).
> 출력과 rc 가 어긋나면 rc 를 믿고 proxy 로 재확인한다.

- [ ] **Step 4: 제거 확인**

```bash
grep -c "ParseIntPipe" src/cats/cats.controller.ts
```

기대: **0**. (0건이면 `grep -c` 가 rc=1 을 내지만 그게 정답이다.)

- [ ] **Step 5: 커밋하지 않는다** — Task 3 의 전체 실측을 통과해야 한다.

---

### Task 3: 전체 회귀 실측 + 커밋

**Files:**
- 변경 없음 (검증 + 커밋)

- [ ] **Step 1: 서버를 재시작하고 seed 한다**

```bash
pnpm start:dev
```

```bash
S=http://localhost:3000/cats; H='x-api-key: k'; CT='Content-Type: application/json'
curl -s -o /dev/null -X POST $S -H "$H" -H "$CT" -d '{"name":"Tom","age":3,"breed":"Persian"}'
curl -s -o /dev/null -X POST $S -H "$H" -H "$CT" -d '{"name":"Nabi","age":5,"breed":"Korean"}'
```

- [ ] **Step 2: Step 11 의 12건 + Review Focus 4건을 돌린다**

```bash
for t in \
  "404|GET|$S/999||" \
  "404|PATCH|$S/999|{\"age\":1}|" \
  "404|DELETE|$S/999||x-roles: admin" \
  "200|GET|$S/1||" \
  "200|PATCH|$S/1|{\"age\":7}|" \
  "200|GET|$S||" \
  "400|GET|$S/abc||" \
  "400|POST|$S|{\"age\":5}|" \
  "403|DELETE|$S/1||x-roles: user" \
  "400|GET|$S/1.5||" \
  "200|PATCH|$S/1|{\"age\":null}|" \
  "200|PATCH|$S/1|{\"age\":\"5\"}|" \
  "200|GET|$S/999999999999999999999||" \
  "200|DELETE|$S/1||x-roles: admin" \
  "404|GET|$S/1||" ; do
  IFS='|' read -r exp m u d r <<< "$t"
  args=(-s -w '\n%{http_code}' -X "$m" "$u" -H "$H" -H "$CT")
  [ -n "$d" ] && args+=(-d "$d"); [ -n "$r" ] && args+=(-H "$r")
  out=$(curl "${args[@]}"); code=$(tail -1 <<< "$out"); body=$(sed '$d' <<< "$out")
  [ "$code" = "$exp" ] && v=OK || v="CHECK(기대 $exp)"
  printf '%-5s %-6s %-30s %s\n      %s\n' "$code" "$m" "${u#http://localhost:3000}" "$v" "${body:0:130}"
done
echo; echo "401 확인:"; curl -s -w '\n%{http_code}\n' $S/2
```

**무회귀 기준 (Step 11 과 동일해야 하는 12건):**

| 요청 | 기대 |
|---|---|
| `GET/PATCH/DELETE /cats/999` | 404 `{"…","message":"Cat not found"}` |
| `GET /cats/1` · `PATCH /cats/1` | 200 |
| `GET /cats` | 200 `{"data":[…]}` |
| `GET /cats/abc` · `POST` 빈 DTO | 400 |
| `DELETE roles:user` | 403 |
| 키 없음 | 401 |
| `DELETE /cats/1 (admin)` → `GET /cats/1` | 200 → 404 |

**새로 보는 4건 (Review Focus):**

| 요청 | 기대 | 다르면 |
|---|---|---|
| `GET /cats/1.5` | **400** | 404 면 조용한 실패 — 롤백 검토 |
| `PATCH {"age":null}` | 200, 본문에 `"age":null` | **현 상태 유지가 정답.** 고쳐졌어도 회귀로 보고 기록 |
| `PATCH {"age":"5"}` | 200 또는 400 — **어느 쪽인지 기록** | `transform` 이 DTO 검증에 미치는 영향의 증거 |
| `GET /cats/999999999999999999999` | 404 (없는 id) | 500 이면 범위 초과 처리 문제 |

> `{"age":"5"}` 에 "기대값" 대신 "기록" 이라 쓴 이유: `transform` 이 DTO 필드에도 걸리므로
> 문자열 `"5"` 가 숫자 5 로 변환돼 통과할 수 있다. 어느 쪽이든 **이번 작업이 바꾼 사실**이니
> 판정이 아니라 관측 대상이다. 위 루프는 200 을 기대값으로 넣었으므로 400 이 나오면
> `CHECK` 로 표시된다 — 실패가 아니라 기록하라는 신호다.

- [ ] **Step 3: 커밋**

```bash
git add src/main.ts src/cats/cats.controller.ts
git commit
```

메시지:
```
refactor: ParseIntPipe 반복을 전역 transform 으로 대체

@Param('id', ParseIntPipe) 3회 반복을 없앤다. 전역 ValidationPipe 에
transform: true 를 켜면 핸들러 시그니처의 id: number 타입만 보고
string -> number 변환이 일어난다 (v12 techniques/validation 의
"Transform payload objects" 예시).

- main.ts: ValidationPipe({ whitelist: true, transform: true })
  whitelist 는 유지 — 지우면 DTO 에 없는 필드가 통과한다
- cats.controller.ts: findOne/update/remove 의 ParseIntPipe 제거,
  import 제거. id: number 타입 표기는 유지 (변환이 이 타입에 의존)
- 실측: /cats/abc 400 유지 · /cats/1.5 400 · Step 11 12건 무회귀

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GvjmYjXCr5MN5EM6HAvbAr
```

실측 결과에 따라 마지막 줄은 관측값으로 고친다.

---

### Task 4: LEARNING.md 기록

> **채택·롤백 어느 경로든 실행한다.** 롤백이면 기록 내용이 달라진다.

**Files:**
- Modify: `docs/LEARNING.md` — 진행 기록 표 + Phase 1.5 표 + Step 12 절 + lint 오진 정정

- [ ] **Step 1: 진행 기록 표에 행을 추가한다**

`| 11 | Phase 1.5 — 404 중복 제거 (도메인 예외 + 필터) | 완료 | \`1cdfe76\` |` 다음에:

```
| 12 | Phase 1.5 — ParseIntPipe 반복 제거 (전역 transform) | 완료 | <커밋 해시> |
```

롤백이면 상태를 `기각` 으로 적고 해시 칸은 비운다.

- [ ] **Step 2: Phase 1.5 표를 갱신한다**

채택 시:
```
| ~~`@Param('id', ParseIntPipe)` 가 3곳 반복~~ | ✅ **해결** — 전역 `transform: true` (Step 12) |
```

롤백 시 — 해결 처리하지 **않고** 확인된 사실을 적는다:
```
| `@Param('id', ParseIntPipe)` 가 3곳 반복 | ⚠️ 전역 `transform` 시도 → `/cats/abc` 400 손실로 기각 (Step 12). 현행 유지 |
```

- [ ] **Step 3: `### Step 12 에서 익힌 것` 절을 Step 11 절 **앞**에 추가한다**

(이 파일의 단계 절은 **최신이 위**로 정렬돼 있다.)

담을 내용:

| 항목 | 요지 |
|---|---|
| 변환이 **타입 표기에 의존**한다 | `@Param('id') id: number` 에서 `number` 를 지우면 변환이 안 된다. 런타임 동작이 **타입 주석**에 걸린 드문 경우 — 보통 타입은 컴파일 때 사라지는데, 여기선 `emitDecoratorMetadata` 가 메타데이터로 남겨 파이프가 읽는다 |
| 문서에 없는 것을 문서로 답하려 하지 않는다 | v12 문서는 변환 **실패** 동작을 서술하지 않는다("will *try to* convert"). `/cats/abc` 가 어떻게 되는지는 **실험으로만** 알 수 있었다 — 그래서 Task 1 이 게이트다 |
| 문서 조사의 함정 | `curl` 로 `docs.nestjs.com/v12/*` 를 받으면 세 페이지가 **전부 같은 19KB SPA 셸**(본문 0)이다. grep 으로 "없다" 를 판정하면 전량 거짓 음성. 렌더링된 본문으로 봐야 한다 |
| 공식 권장이 항상 정답은 아니다 | 채택했다면: 문서 예시가 이 레포에서도 성립했다 / 기각했다면: 문서 권장이 기존 동작(400)을 깨서 포기했다. **어느 쪽이든 실측이 판정했다** |
| 2택을 섞지 않은 이유 | 문서는 `transform` ↔ `ParseIntPipe` 를 **상호 대안**으로 제시한다. 혼합(b)은 문서에 없는 길이라 "공식 권장" 기준에서 탈락 |
| 반복 제거의 근거 | DRY 가 아니라 **비용 곡선**이다. 지금은 단발성이지만 컨트롤러가 늘면 반복 비용도 같이 커진다. 부수적으로 누락 위험도 준다 — `ParseIntPipe` 를 빠뜨리면 `id` 가 문자열인 채 들어가 `cat.id === id` 가 조용히 false 가 되는데 **타입이 `number` 라 컴파일러도 안 잡는다** |
| 커스텀 데코레이터를 안 쓴 이유 | v12 문서에 `createParamDecorator` 로 파이프를 **번들하는 예시가 없다.** "Working with pipes" 는 호출부에 파이프를 붙이는 것만 보여줘 반복이 그대로 남는다. 커스텀 데코레이터는 Phase 1.5 의 `getRequest()` 항목에서 따로 (소재 겹침 방지) |

**실측 표도 함께 넣는다** — Task 3 Step 2 의 결과 중 새로 본 4건(`/cats/1.5`·`{"age":null}`·`{"age":"5"}`·범위 초과)을 관측값 그대로.

- [ ] **Step 4: lint 오진을 정정한다**

Phase 1.5 표의 이 행:
```
| `pnpm lint` 가 깨져 있음 | package.json 스크립트 점검 |
```
→
```
| ~~`pnpm lint` 가 깨져 있음~~ | ⚠️ **오진이었다** — 스크립트는 `oxlint src/ test/` 로 올바르다. rtk 셸 훅이 명령을 가로채 eslint 로 돌리는 것이 원인(2026-09-22 실측). 레포에서 고칠 것 없음 → `pnpm exec oxlint src/ test/` 사용 |
```

> 이 정정은 이번 작업과 무관하지만 **같은 파일의 같은 표**를 고치는 김에 처리한다. README 는 `96b4294` 에서 이미 정정됐고 LEARNING.md 만 남아 있었다.

- [ ] **Step 5: 커밋**

```bash
git add docs/LEARNING.md docs/superpowers/plans/2026-09-22-param-parseintpipe.md
git commit -m "docs: Step 12 기록 — ParseIntPipe 반복 제거"
```

---

## 완료 기준 (전체)

**채택 경로:**
- [ ] `pnpm build` rc=0
- [ ] `pnpm exec oxlint src/ test/` rc=0
- [ ] `rtk proxy pnpm exec prettier --check "src/**/*.ts" "test/**/*.ts"` rc=0
- [ ] `grep -c "ParseIntPipe" src/cats/cats.controller.ts` → **0**
- [ ] `GET /cats/abc` → **400**, 4필드 형식 유지
- [ ] `GET /cats/1.5` → **400**
- [ ] Step 11 의 12건 전부 무회귀
- [ ] `{"age":null}` → 200 + `"age":null` 저장 (현 상태 유지)
- [ ] `{"age":"5"}` 결과를 **기록** (200/400 어느 쪽이든)
- [ ] LEARNING.md Step 12 절 + Phase 1.5 표 2행(ParseIntPipe·lint) 갱신

**롤백 경로:**
- [ ] `git status` clean (main.ts·controller 원복)
- [ ] `pnpm build` rc=0
- [ ] LEARNING.md 에 **기각 근거와 관측값** 기록, Phase 1.5 표는 해결 처리하지 않음

---

## 부록 A — grilling 요약 (spec)

2026-09-22 세션에서 확정. 결정 근거는 아래가 SSOT.

**목적:** `@Param('id', ParseIntPipe)` 3회 반복 제거. 근거는 DRY 가 아니라 **비용 곡선** — 지금은 단발성이지만 컨트롤러가 늘면 반복 비용도 같이 커진다(사용자 표현: *"지금은 단발성 비용이지만 나중엔 커진 만큼 비용이 증가"*).

**사용자 기준:** 실무에서 보편적이고 **공식 문서가 권장하는** 방향 (문서가 1순위).

**v12 문서 조사 결과** (렌더링 본문 + 리터럴 검색 교차 확인, 접근 실패 URL 없음):

| 방법 | 문서 지위 |
|---|---|
| `ValidationPipe({ transform: true })` + `@Param('id') id: number` | ✅ **명시적 코드 예시 있음** — 반복을 실제로 없애는 유일한 문서 방법 |
| `@Param('id', ParseIntPipe)` 반복 | ✅ 기본 바인딩. "auto-transformation 이 꺼진 경우의 **대안**" 으로 위치 |
| 커스텀 데코레이터에 파이프 번들 | ❌ 예시 없음 (호출부 적용만 — 반복이 남는다) |
| 컨트롤러 레벨 `@UsePipes(ParseIntPipe)` | ❌ 서술·예시 없음 (`@UsePipes` 는 메서드 레벨 예시만) |
| `enableImplicitConversion` | ❌ v12 validation 문서에 **문자열 자체가 부재** |
| `whitelist` × `transform` 상호작용 | ❌ 서술 없음 → 실험으로만 확인 가능 |

문서 원문 (techniques/validation → "Transform payload objects"):
> "With the auto-transformation option enabled, the `ValidationPipe` will also perform conversion of primitive types."
> ```ts
> @Get(':id')
> findOne(@Param('id') id: number) { console.log(typeof id === 'number'); // true }
> ```
> "By default, every path parameter and query parameter comes over the network as a `string`. … the `ValidationPipe` will **try to** automatically convert a string identifier to a number."

**질문별 결정:**

| Q | 결정 |
|---|---|
| Q1 고칠 만한 중복인가 | **그렇다** — 비용 곡선 + 누락 위험 |
| Q2 적용 범위 | **A(전역)** — 자동 적용. 붙여야 기억나는 방식은 누락 위험을 남긴다 |
| Q3 `/cats/abc` 400 | **유지가 조건.** 400 = Bad Request 확인. 상태코드만 유지, 문구 가변 |
| Q4 부작용 검증 범위 | **전체** — controller 가 적을 때 하자 (사용자) |
| Q5 커스텀 데코레이터를 여기서 배울까 | **아니오** — `getRequest()` 항목과 소재가 겹친다. 게다가 문서 근거도 없다 |
| Q6 A 확정 | **확정** |
| Q7 문서에 없는 구멍 | **구현 전 `/cats/abc` 먼저 실측** (Task 1 게이트) |
| Q8 `ParseIntPipe` 전부 지울까 | **전부** — 일부만 남기면 `message?` 와 같은 불일치 |
| Q9 실측 실패 시 | **(a) 롤백.** b(혼합)·c(커스텀 복구)는 문서에 없는 길이라 "공식 권장 1순위" 기준에서 기각 |
| Q10 DTO 영향 검증 | curl 12건 + `{"age":null}` 본문 비교. 이 구멍이 **고쳐져도 회귀로 취급** |
