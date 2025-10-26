# Publishing Guide

This guide covers how to publish the `@qastudio/playwright` package to npm.

## Publishing Methods

### Automated Publishing (Recommended)

The repository includes GitHub Actions workflows for automated publishing. See [`.github/WORKFLOWS.md`](.github/WORKFLOWS.md) for complete documentation.

**Quick Steps:**

1. **One-time setup:** Add `NPM_TOKEN` to GitHub Secrets
2. **To release:** Go to Actions → "Create Release" → Run workflow → Select version type
3. **Automatic:** Package is automatically published to npm

This is the recommended approach as it:

- ✅ Ensures tests pass before publishing
- ✅ Creates consistent git tags and releases
- ✅ Generates changelogs automatically
- ✅ Uses npm provenance for security

### Manual Publishing

If you prefer to publish manually, follow the steps below.

## Pre-Publishing Checklist

Before publishing, ensure:

- [ ] All tests pass
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Type checking passes (`npm run lint`)
- [ ] README is complete and accurate
- [ ] CHANGELOG is updated with version changes
- [ ] Examples are working and up-to-date
- [ ] Version number is updated in `package.json`

## Initial Setup (First Time Only)

### 1. Update package.json

Add your information to `package.json`:

```json
{
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/QAStudio-Dev/playwright.git"
  },
  "bugs": {
    "url": "https://github.com/QAStudio-Dev/playwright/issues"
  },
  "homepage": "https://github.com/QAStudio-Dev/playwright#readme"
}
```

### 2. Create npm Account

If you don't have an npm account:

1. Visit https://www.npmjs.com/signup
2. Create an account
3. Verify your email address

### 3. Login to npm

```bash
npm login
```

Enter your:

- Username
- Password
- Email (public)
- One-time password (if 2FA enabled)

### 4. Check Package Name Availability

```bash
npm search @qastudio/playwright
```

If the name is taken, you can either:

- Choose a different name
- Use a scoped package: `@your-org/playwright-reporter`

## Publishing Process

### 1. Update Version

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.x): Bug fixes

  ```bash
  npm version patch
  ```

- **Minor** (1.x.0): New features (backward compatible)

  ```bash
  npm version minor
  ```

- **Major** (x.0.0): Breaking changes
  ```bash
  npm version major
  ```

This will:

- Update `package.json` version
- Create a git tag
- Commit the change

### 2. Update CHANGELOG.md

Document changes in CHANGELOG.md:

```markdown
## [1.0.1] - 2025-01-XX

### Fixed

- Fix API timeout handling
- Improve error messages

### Changed

- Update dependencies

[1.0.1]: https://github.com/QAStudio-Dev/playwright/releases/tag/v1.0.1
```

### 3. Build the Package

```bash
npm run clean
npm run build
```

### 4. Test the Package Locally

```bash
npm pack
```

This creates a `.tgz` file. Test it in another project:

```bash
cd /path/to/test-project
npm install /path/to/@qastudio/playwright/@qastudio/playwright-1.0.0.tgz
```

### 5. Publish to npm

For the first publish:

```bash
npm publish --access public
```

For subsequent versions:

```bash
npm publish
```

### 6. Create GitHub Release

1. Push the version tag:

   ```bash
   git push origin main --tags
   ```

2. Go to GitHub repository → Releases → "Draft a new release"

3. Select the version tag (e.g., `v1.0.0`)

4. Add release notes from CHANGELOG

5. Publish the release

## Using Scoped Packages

If you want to publish under your organization:

### 1. Update package.json

```json
{
  "name": "@qa-studio/playwright-reporter",
  ...
}
```

### 2. Publish as public

```bash
npm publish --access public
```

## Automated Publishing with GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `NPM_TOKEN` to GitHub secrets:

1. Generate token at https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Add to GitHub: Settings → Secrets → New repository secret
3. Name: `NPM_TOKEN`

## Post-Publishing

### 1. Verify the Package

```bash
npm info @qastudio/playwright
```

### 2. Test Installation

In a fresh project:

```bash
npm install --save-dev @qastudio/playwright
```

### 3. Update Documentation

If package name changed, update:

- README.md
- GETTING_STARTED.md
- Examples

### 4. Announce the Release

- Post on social media
- Update project website
- Notify users of major changes

## Unpublishing (Emergency Only)

You can only unpublish within 72 hours:

```bash
npm unpublish @qastudio/playwright@1.0.0
```

**Note:** Unpublishing is discouraged. Use deprecation instead:

```bash
npm deprecate @qastudio/playwright@1.0.0 "This version has critical bugs, please upgrade to 1.0.1"
```

## Version Management Best Practices

1. **Never** publish from a dirty working directory
2. **Always** test locally before publishing
3. **Update** CHANGELOG before each release
4. **Tag** releases in git
5. **Document** breaking changes clearly
6. **Follow** semantic versioning strictly

## Troubleshooting

### Error: Package name too similar to existing package

Choose a different name or use a scoped package.

### Error: You do not have permission to publish

1. Check you're logged in: `npm whoami`
2. Verify package name isn't taken
3. Check organization permissions for scoped packages

### Error: Version already published

You cannot republish the same version. Increment the version:

```bash
npm version patch
npm publish
```

## Maintenance

### Regular Updates

- Keep dependencies up to date
- Test with latest Playwright versions
- Monitor GitHub issues
- Review and merge pull requests

### Security

- Enable 2FA on npm account
- Use tokens for CI/CD (not passwords)
- Monitor security advisories
- Update vulnerable dependencies promptly

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [Creating and Publishing npm Packages](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages)
- [GitHub Actions for npm](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)

Happy publishing!
