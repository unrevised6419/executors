# @repo/ide

Web IDE for the Furnica (ant) language. Write a program, set up the 10 × 10 grid, watch the ant run, open and save the original `.ant` files, and solve the 24 tasks of the "Sarcina Furnica" worksheet.

```sh
pnpm --filter @repo/ide dev      # http://localhost:3000
pnpm --filter @repo/ide test     # unit and component tests (Vitest)
pnpm --filter @repo/ide e2e      # end-to-end tests (Playwright)
pnpm --filter @repo/ide build
```

- **Editor:** Monaco, bundled locally, with highlighting and errors from [`@repo/ant-grammar`](../../packages/ant-grammar).
- **Runs:** [`@repo/ant-runtime`](../../packages/ant-runtime), stepped by `ide/run/run-controller.ts` at the original's speed scale (200 − 10 · position ms).
- **Files:** [`@repo/ant-file`](../../packages/ant-file). `.ant` files are read and written in windows-1250, or in windows-1251 for Russian. Other files are read as UTF-8 program text.
- **Tasks:** [`@repo/ant-tasks`](../../packages/ant-tasks). Each task's goal is checked after every run.
- **Saving:** exercises are saved in IndexedDB through the `ExerciseStore` interface (`storage/exercise.ts`). A cloud store can replace it later without changing the UI.

The design is in [`docs/superpowers/specs/2026-10-13-ide-design.md`](../../docs/superpowers/specs/2026-10-13-ide-design.md).
