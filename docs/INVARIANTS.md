# INVARIANTS.md

> These rules must NEVER be broken by any AI agent or refactor.  
> If a task requires violating an invariant, stop and ask the human first.

## API Contract

- [ ] All public API responses maintain backward-compatible structure
- [ ] ...

## Architecture Boundaries

- [ ] Domain layer does not import from infrastructure layer
- [ ] ...

## State Management

- [ ] ...

## Security

- [ ] Auth middleware remains stateless
- [ ] No secrets in source code
- [ ] ...

## Performance

- [ ] ...

---

## How to Handle Invariant Conflicts

If a Codex task would violate an invariant:

1. Stop immediately
2. Report to Claude: "INVARIANT CONFLICT: [rule] violated by [task]"
3. Do not proceed until human approves an invariant change

Invariants are only updated by humans, not by AI agents.
