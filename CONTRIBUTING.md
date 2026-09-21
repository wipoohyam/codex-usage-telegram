# Contributing

Issues and pull requests are welcome. Keep the runtime dependency-free where practical, never add real credentials to fixtures, and include tests for behavior changes.

Before opening a pull request, run:

```sh
npm run check
npm test
docker build -t codex-usage-telegram:test .
```
