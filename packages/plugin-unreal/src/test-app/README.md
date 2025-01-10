# Test Application for Land Search System

This standalone application allows testing of the land search system components including database operations, search functionality, and cache management.

## Setup

1. Install dependencies:
```bash
npm install ioredis pg @types/pg dotenv
```

2. Set up environment variables in a .env file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=land_database
CACHE_HOST=localhost
CACHE_PORT=6379
```

3. Run the application:
```bash
ts-node src/test-app/index.ts
```

## Components Tested

- Database Operations (PostgresLandDataProvider)
- Search Session Management (PropertySearchManager)
- Cache Operations (TestRuntime)
- Search Processing
- Memory System Integration

## Test Scenarios

The application tests:
1. Search session initialization
2. Property search with metadata
3. Result retrieval and formatting
4. Session management (create/end)
5. Cache operations

## Adding New Tests

To add new test scenarios:
1. Modify the main function in index.ts
2. Add new test cases following the existing pattern
3. Add appropriate error handling and logging
