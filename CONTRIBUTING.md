# Contributing to RPCS-1 SDK

Thanks for wanting to help. RPCS-1 is early, so the most useful contributions are bug reports,
clear examples, test cases, docs fixes, and small focused pull requests.

## Development setup

```bash
npm install
npm run build
```

For the Python SDK:

```bash
cd sdk/python
python -m pip install -e ".[dev]"
python -m pytest
```

## Pull requests

- Keep changes focused on one problem.
- Add or update tests when behavior changes.
- Update docs or examples when public APIs change.
- Do not include secrets, API keys, `.env` files, local build output, or generated cache files.
- Explain the user-facing reason for the change in the PR description.

## Reporting issues

Please include:

- What you expected to happen.
- What actually happened.
- A minimal input or code sample that reproduces it.
- Your runtime versions, such as Node, Python, package version, and OS.

## Project direction

RPCS-1 SDK is intended to provide deterministic, inspectable recommendations for AI agent
configuration. Contributions should preserve that spirit: transparent mappings, readable
reasoning, and tests for the recommendation behavior.
