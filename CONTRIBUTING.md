# Contributing to OpenLearn Platform

Thank you for your interest in contributing to OpenLearn! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Development Setup](#development-setup)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Docker and Docker Compose
- Git
- Basic knowledge of TypeScript, Express.js, and Prisma

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/openlearn-js.git
   cd openlearn-js
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/original-owner/openlearn-js.git
   ```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clear, concise commit messages
- Follow the coding standards below
- Add tests for new functionality
- Update documentation when needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Check TypeScript compilation
npm run build

# Test database migrations
npx prisma migrate dev
```

### 4. Commit and Push

```bash
git add .
git commit -m "feat: add new feature description"
git push origin feature/your-feature-name
```

## Coding Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Define proper types for all functions and variables
- Avoid `any` type unless absolutely necessary
- Use meaningful variable and function names

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at the end of statements
- Follow existing naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_SNAKE_CASE` for constants

### File Organization

```
src/
├── controllers/     # Request handlers (one per entity)
├── middleware/      # Express middleware functions
├── routes/         # Route definitions
├── services/       # Business logic layer
├── utils/          # Helper functions
├── types/          # TypeScript type definitions
└── config/         # Configuration files
```

### Database Guidelines

- Use Prisma schema for all database changes
- Create migrations for schema changes
- Follow naming conventions:
  - Tables: `snake_case` (users, user_profiles)
  - Columns: `camelCase` in schema, `snake_case` in DB
  - Relations: descriptive names

### API Design

- Follow RESTful conventions
- Use appropriate HTTP status codes
- Implement proper error handling
- Add input validation for all endpoints
- Document new endpoints in the appropriate docs file

## Pull Request Process

### Before Submitting

1. Ensure your code follows the coding standards
2. Run all tests and ensure they pass
3. Update documentation if needed
4. Rebase your branch on the latest main branch

### PR Description Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Documentation
- [ ] I have updated the documentation accordingly
- [ ] I have added/updated API documentation for new endpoints

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings
```

### Review Process

1. At least one maintainer review is required
2. All CI checks must pass
3. Address review feedback promptly
4. Maintainers may request changes or additional tests

## Issue Guidelines

### Reporting Bugs

When reporting bugs, please include:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**: OS, Node.js version, browser (if applicable)
- **Screenshots**: If applicable
- **Error Messages**: Full error messages or logs

### Feature Requests

When requesting features:

- **Description**: Clear description of the proposed feature
- **Use Case**: Why this feature would be useful
- **Implementation Ideas**: Any thoughts on how it could be implemented
- **Alternatives**: Any alternative solutions you've considered

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `help wanted`: Extra attention is needed
- `good first issue`: Good for newcomers

## Development Setup

### Local Environment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

3. **Start Database**
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Run Database Migrations**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Seed Database (Optional)**
   ```bash
   npx prisma db seed
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Database Operations

```bash
# Create a new migration
npx prisma migrate dev --name description-of-change

# Reset database (development only)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

## Additional Resources

### Documentation

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Authentication System](./docs/AUTH_API_DOCUMENTATION.md)
- [Deployment Guide](./docs/AWS_DEPLOYMENT_GUIDE.md)

### Useful Links

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

## Questions?

If you have questions about contributing:

1. Check existing issues and documentation
2. Create a new issue with the `question` label
3. Join our community discussions on GitHub

Thank you for contributing to OpenLearn! Your efforts help make education more accessible and effective for everyone.
