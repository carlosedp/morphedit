# Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks, ensuring code quality before commits are made.

## What Runs on Pre-commit

Before each commit, the following checks are automatically executed:

```bash
bun run lint
```

This command runs:

1. **ESLint** - Checks and auto-fixes code style and quality issues
2. **Prettier** - Formats code consistently
3. **Knip** - Checks for unused dependencies and exports

## How It Works

When you run `git commit`, the pre-commit hook will:

1. 🔍 Run linting checks on your code
2. ❌ **Block the commit** if linting fails
3. ✅ **Allow the commit** if all checks pass

### Example Output

#### Success

```bash
$ git commit -m "Add new feature"
🔍 Running linters...
✅ Linting passed! Proceeding with commit.
[essentiajs abc1234] Add new feature
```

#### Failure

```bash
$ git commit -m "Add new feature"
🔍 Running linters...
❌ ESLint found errors:
  src/components/MyComponent.tsx
    15:8  error  'unused' is assigned a value but never used

✖ 1 problem (1 error, 0 warnings)

husky - pre-commit script failed (code 1)
```

## Setup

The hooks are automatically installed when you run:

```bash
bun install
```

This triggers the `prepare` script in `package.json`, which initializes Husky.

## Manual Installation

If hooks aren't working, you can manually reinstall them:

```bash
# Reinstall Husky hooks
bunx husky install

# Or run the prepare script
bun run prepare
```

## Bypassing the Hook (Not Recommended)

In rare cases where you need to commit without running checks:

```bash
git commit --no-verify -m "Emergency fix"
```

⚠️ **Warning**: Only use `--no-verify` in emergencies. It's better to fix linting issues before committing.

## Available Hooks

### `.husky/pre-commit`

- **Trigger**: Before each commit
- **Purpose**: Ensure code quality and consistency
- **Command**: `bun run lint`
- **When to modify**: If you want to add/remove pre-commit checks

## Customizing the Hook

To modify what runs before commit, edit `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Add your custom checks here
bun run lint
bun run test:run  # Add this to run tests too
```

## Benefits

✅ **Consistent code style** - All commits follow the same formatting  
✅ **Catch errors early** - Issues are caught before code review  
✅ **Cleaner git history** - No "fix linting" commits  
✅ **Team alignment** - Everyone follows the same standards  
✅ **CI/CD optimization** - Fewer failed CI builds  

## Troubleshooting

### Hook Not Running

1. **Check if Husky is installed:**

   ```bash
   ls -la .husky/
   ```

2. **Reinstall hooks:**

   ```bash
   bunx husky install
   ```

3. **Verify Git hooks are enabled:**

   ```bash
   git config core.hooksPath
   # Should output: .husky
   ```

### Hook Failing Unexpectedly

1. **Run lint manually to see errors:**

   ```bash
   bun run lint
   ```

2. **Check if all dependencies are installed:**

   ```bash
   bun install
   ```

3. **Verify hook permissions:**

   ```bash
   chmod +x .husky/pre-commit
   ```

### Slow Commits

If linting takes too long:

1. **Use lint-staged** (recommended for large projects):

   ```bash
   bun add -D lint-staged
   ```

2. **Configure to only lint staged files** (add to `package.json`):

   ```json
   {
     "lint-staged": {
       "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
       "*.{js,jsx,json,md}": ["prettier --write"]
     }
   }
   ```

3. **Update `.husky/pre-commit`:**

   ```bash
   bunx lint-staged
   ```

## Files Involved

- `.husky/pre-commit` - Pre-commit hook script
- `.husky/_/husky.sh` - Husky helper script (auto-generated)
- `package.json` - Contains `prepare` script to install hooks
- `.git/hooks/` - Git hooks directory (managed by Husky)

## Integration with CI/CD

The same linting checks that run locally also run in CI:

```yaml
# .github/workflows/ci.yml
- name: Lint
  run: bun run lint
```

This ensures consistency between local development and CI environments.

## Best Practices

1. **Fix linting errors immediately** - Don't bypass the hook
2. **Keep lint rules reasonable** - Avoid overly strict rules that slow development
3. **Communicate rule changes** - Notify team when adding new lint rules
4. **Update dependencies regularly** - Keep ESLint and Prettier up to date
5. **Use auto-fix** - Run `bun run format` before committing to auto-fix most issues

---

**Last Updated**: October 8, 2025  
**Husky Version**: 9.1.7  
**Hook Status**: ✅ Active
