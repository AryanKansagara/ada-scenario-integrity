# Scenario Integrity Compiler

Ada builds customer-service AI agents and already offers simulations, mocked tools and staged testing. Its mock-tool guidance describes fixture conflicts and misplaced user knowledge that require manual checking. This independent deterministic compiler targets those explicit fixture defects, not the agent's conversational intelligence.

## Run

Node.js 22+; verified with Node 24.22.1/Linux. No dependencies or credentials.

```sh
node --test
node cli.mjs
node cli.mjs path/to/scenario.txt
```

The default CLI compiles a clean and an injected-defect fixture, executes the clean mock assertions, and emits JSON. File input emits diagnostics and exits 1 when rejected. [benchmarks/demo.json](benchmarks/demo.json) records actual compiler/mock-run output. Eight test groups cover source spans, positive controls, contradictory facts, missing mocks, knowledge leaks, tool modes, malformed grammar and ungraded assertions.

## Explicit DSL

One command per line; identifiers and symbolic values contain no whitespace. `entity.field` identifies a fact; values are literal symbols, not natural language. `//` starts a comment. Source locations are 1-based, with an exclusive end column.

```text
scenario shipping
private order_1.status shipped
initial order_1.status shipped
tool lookup mock
mock lookup order_1.status shipped
call lookup order_1.status
learn lookup order_1.status
user order_1.status shipped
assert order_1.status shipped
```

`initial`, `system` and `private` declare facts at the same scenario instant. Conflicting values for one entity-field are errors. `private` also marks knowledge that cannot appear in `user` before an earlier `call` and `learn` reveal the matching mocked value. Identical repeated facts are allowed. Distinct order identities do not cross-satisfy records. Tool declarations may be `mock` or `live`: mock calls need matching records; live tools cannot carry mocks. A clean live tool declaration is permitted, but local execution never makes a live call and reports unknown. Tool modes and cross-tool records cannot contradict each other.

Successful compilation produces a JSON intermediate program. Only accepted programs execute. Local execution resolves explicit mock calls and checks literal assertions; a mismatched assertion fails, unobserved facts or assertion-free programs remain unknown. It does not run an AI agent. Passing assertions shows that authored mocks returned the expected symbolic values.

## Limits and next work

This is Node ESM with runtime grammar and dataflow checks, not a TypeScript build. No Ada API integration or compatible export schema has been validated. There is no branch language, temporal evolution, fuzzy matching, general natural-language contradiction detector or model-assisted linting. The knowledge checker requires explicit `private` annotations; unannotated sensitive facts cannot be inferred. `learn` from a live tool cannot establish a verified disclosure locally. Free text with spaces is rejected, rather than assigned a fictitious semantic score.

The next milestones are a larger separately authored corpus, bounded branch/temporal semantics and schema-checked Ada import/export. This small fixture suite is not a precision/recall benchmark on customer simulations. GitHub Actions runs the same tests and CLI demo; inspect the repository Actions tab for the latest hosted result.

## Sources and overlap

- [Ada testing](https://docs.ada.cx/docs/optimization/testing): existing interactive and simulation testing.
- [Mock API tools](https://docs.ada.cx/docs/optimization/testing/simulations/mock-api-tools): fixture conflicts, tool-mode and knowledge-placement pitfalls.
- [Configuration and test runs](https://docs.ada.cx/mcp/tools/edit-agent-config): existing staged testing capability.

The compiler opportunity is our inference from documented fixture pitfalls. This project is unaffiliated with Ada.
