# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added
- Initial release of Playwright Reporter for QAStudio.dev
- Automatic test run creation
- Test result submission to QAStudio.dev API
- Support for linking tests to QAStudio.dev test cases via annotations or test titles
- Screenshot and video upload for failed tests
- Batch API requests for optimal performance
- Retry handling (only reports final results)
- Comprehensive error handling with silent mode
- Rich metadata extraction from test annotations
- TypeScript support with full type definitions
- Configurable batch size, timeouts, and retry attempts
- Environment and milestone support
- Verbose logging mode for debugging

### Features
- ✅ Auto-creation of test runs
- ✅ Map Playwright tests to QAStudio.dev test cases
- ✅ Upload screenshots and videos
- ✅ Batch processing of test results
- ✅ Exponential backoff retry logic
- ✅ Graceful degradation when API is unavailable
- ✅ Support for test tags and custom metadata
- ✅ Full TypeScript type safety

[1.0.0]: https://github.com/QAStudio-Dev/playwright/releases/tag/v1.0.0
