# aitofix

A CI bot that auto-fixes errors. It wraps your build command, detects failures, uses AI to generate a fix, verifies the fix by re-running the command, and posts a comment with the solution.

## Installation

```bash
npm install -D aitofix
# or
bun add -d aitofix
```

## Usage

Wrap your build or test command in your CI configuration:

```bash
npx aitofix "your-test-command"
# e.g.
npx aitofix "bun test"
```

## Configuration

`aitofix` is configured via environment variables.

### 🔑 BYOK (Bring Your Own Key) - Recommended

The simplest way to use `aitofix` is to provide your own OpenAI API Key. This gives you full control over usage and billing.

1.  Get an API Key from [OpenAI Platform](https://platform.openai.com/api-keys).
2.  Add it to your CI secrets as `OPENAI_API_KEY`.

### Options

| Variable                  | Description                                                  | Default         |
| :------------------------ | :----------------------------------------------------------- | :-------------- |
| `OPENAI_API_KEY`          | **Required**. Your OpenAI API Key.                           | -               |
| `GITHUB_TOKEN`            | **Required** for GitHub. Auto-set by GitHub Actions.         | -               |
| `GITLAB_TOKEN`            | **Required** for GitLab. Use a Project Access Token.         | -               |
| `AITOFIX_MODEL`           | The OpenAI model to use.                                     | `gpt-5.1-codex` |
| `AITOFIX_MIN_CONFIDENCE`  | Minimum confidence (0-100) to attempt a fix.                 | `80`            |
| `AITOFIX_COMMENT_MODE`    | `verified_only`, `always`, or `silent`.                      | `verified_only` |
| `AITOFIX_ENABLE_SKIP_MSG` | Set to `true` to post a comment even when fixing is skipped. | `false`         |

## CI Examples

### GitHub Actions

```yaml
- name: Run Tests with Auto-Fix
  run: npx aitofix "npm test"
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### GitLab CI

```yaml
test:
  script:
    - npx aitofix "npm test"
  variables:
    OPENAI_API_KEY: $OPENAI_API_KEY
    GITLAB_TOKEN: $GITLAB_TOKEN
```
