# Contributing to DataBees

Thank you for your interest in contributing to DataBees! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/databees-vscode.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Test your changes: `npm test`
7. Commit your changes: `git commit -am 'Add new feature'`
8. Push to your branch: `git push origin feature/your-feature-name`
9. Create a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Watch for changes
npm run watch

# Run tests
npm test

# Build for production
npm run compile
```

## Code Style

- Use TypeScript
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

## Commit Messages

Use clear, descriptive commit messages:
- `feat: Add support for MongoDB connections`
- `fix: Resolve SSL certificate validation issue`
- `docs: Update README with examples`
- `refactor: Improve connection manager performance`
- `test: Add unit tests for export service`

## Pull Request Process

1. Update the README.md with any new features
2. Update CHANGELOG.md
3. Ensure tests pass: `npm test`
4. Ensure linting passes: `npm run lint`
5. Request review from maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
