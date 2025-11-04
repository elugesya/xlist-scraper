# Contributing to X List Scraper

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the project:
   ```bash
   pnpm build
   ```
4. Run tests:
   ```bash
   pnpm test
   ```

## Development Workflow

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and ensure:
   - Code follows TypeScript best practices
   - All tests pass: `pnpm test`
   - Code is properly formatted: `pnpm format`
   - No linting errors: `pnpm lint`

3. Add tests for new features

4. Commit your changes with clear, descriptive messages

5. Push to your fork and submit a pull request

## Code Style

- Use TypeScript for all code
- Follow the existing code structure
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Testing

- Write unit tests for utility functions
- Add integration tests for API endpoints
- Ensure tests are deterministic and don't rely on external services
- Aim for high code coverage

## Pull Request Process

1. Update README.md if you're adding new features
2. Update type definitions if you're changing interfaces
3. Ensure all tests pass
4. Request review from maintainers
5. Address any feedback

## Reporting Bugs

When reporting bugs, please include:
- Operating system and version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error messages and logs

## Feature Requests

We welcome feature requests! Please:
- Check if the feature already exists or is planned
- Provide a clear use case
- Explain how it benefits users
- Consider offering to implement it

## Questions?

Feel free to open an issue for questions or discussions.

Thank you for contributing! 🙏
