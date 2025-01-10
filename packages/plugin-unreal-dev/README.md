# Plugin Unreal Development Environment

This package provides a development and testing environment for the `@ai16z/plugin-unreal` package. It allows us to:

1. Test database operations
2. Test search functionality
3. Test cache operations
4. Develop new features
5. Run integration tests

## Setup

1. Create a `.env` file with your configuration
2. Run `npm install` from the root directory
3. Run `npm run dev` to start the development environment

## Structure

- `src/` - Source code for development and testing
  - `tests/` - Test files
  - `config/` - Configuration management
  - `runtime/` - Test runtime implementation
  - `index.ts` - Main entry point

## Available Scripts

- `npm run dev` - Run the development environment
- `npm test` - Run tests
