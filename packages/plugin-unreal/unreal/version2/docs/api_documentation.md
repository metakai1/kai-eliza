# Land Memory System API Documentation

## Table of Contents
1. [LandDatabaseAdapter](#landdatabaseadapter)
2. [LandMemorySystem](#landmemorysystem)
3. [Runtime Property Database Tests](#runtime-property-database-tests)

## LandDatabaseAdapter

The `LandDatabaseAdapter` class extends `PostgresDatabaseAdapter` and provides specialized database operations for managing land plot memories in a PostgreSQL database.

### Constructor
```typescript
constructor(connectionConfig: any)
```
- **Parameters:**
  - `connectionConfig`: Database connection configuration object
    - `connectionString`: PostgreSQL connection URL
    - `max`: Maximum number of connections
    - `idleTimeoutMillis`: Connection idle timeout
    - `connectionTimeoutMillis`: Connection attempt timeout

### Methods

#### `init(): Promise<void>`
Initializes the database adapter and establishes connection.

#### `createLandMemory(memory: LandPlotMemory): Promise<void>`
Creates a new land memory entry in the database.
- **Parameters:**
  - `memory`: LandPlotMemory object containing plot information and embedding

#### `getLandMemoryById(id: UUID): Promise<LandPlotMemory | undefined>`
Retrieves a land memory by its unique identifier.
- **Parameters:**
  - `id`: UUID of the memory to retrieve
- **Returns:** Promise resolving to the LandPlotMemory if found, undefined otherwise

#### `getLandMemories(roomId: UUID): Promise<LandPlotMemory[]>`
Retrieves all land memories for a specific room.
- **Parameters:**
  - `roomId`: UUID of the room
- **Returns:** Array of LandPlotMemory objects

#### `searchLandByEmbedding(embedding: number[], metadata: Partial<LandSearchParams>, similarity_threshold: number): Promise<LandPlotMemory[]>`
Searches for land plots using vector similarity.
- **Parameters:**
  - `embedding`: Vector embedding for similarity search
  - `metadata`: Optional search parameters
  - `similarity_threshold`: Minimum similarity score (default: 0.4)

#### `searchLandByMetadata(params: LandSearchParams): Promise<LandPlotMemory[]>`
Searches for land plots using metadata filters.
- **Parameters:**
  - `params`: Search parameters for filtering

#### `removeLandMemory(memoryId: UUID): Promise<void>`
Removes a specific land memory.
- **Parameters:**
  - `memoryId`: UUID of the memory to remove

#### `removeAllLandMemories(roomId: UUID): Promise<void>`
Removes all land memories for a specific room.
- **Parameters:**
  - `roomId`: UUID of the room

## LandMemorySystem

The `LandMemorySystem` class provides high-level operations for managing and searching land plot information.

### Constructor
```typescript
constructor(
    database: LandDatabaseAdapter,
    embedder: {
        embedText: (text: string) => Promise<number[]>
    }
)
```
- **Parameters:**
  - `database`: Instance of LandDatabaseAdapter
  - `embedder`: Text embedding service object

### Methods

#### `createLandMemoryFromCSV(csvRow: any): Promise<void>`
Creates a land memory from CSV data.
- **Parameters:**
  - `csvRow`: Object containing CSV row data

#### `searchProperties(query: string, metadata?: Partial<LandSearchParams>, limit?: number): Promise<LandPlotMemory[]>`
Searches for properties using natural language query and metadata filters.
- **Parameters:**
  - `query`: Natural language search query
  - `metadata`: Optional metadata filters
  - `limit`: Maximum number of results (default: 20)

#### `searchPropertiesSimple(query: string, metadata?: Partial<LandSearchParams>, limit?: number): Promise<LandPlotMemory[]>`
Simplified property search using basic criteria.
- **Parameters:**
  - `query`: Search query
  - `metadata`: Optional metadata filters
  - `limit`: Maximum number of results

#### `setLandKnowledge(item: LandKnowledgeItem, chunkSize?: number, bleed?: number): Promise<UUID>`
Creates a land memory and its fragments from a knowledge item.
- **Parameters:**
  - `item`: Knowledge item to store
  - `chunkSize`: Size of text chunks (default: 512)
  - `bleed`: Overlap between chunks (default: 20)
- **Returns:** UUID of the created memory

#### `getLandKnowledgeById(id: UUID): Promise<LandKnowledgeItem | undefined>`
Retrieves a land knowledge item by ID.
- **Parameters:**
  - `id`: UUID of the knowledge item
- **Returns:** Promise resolving to the LandKnowledgeItem if found

## Runtime Property Database Tests

The test suite (`runtime-property-database2.test.ts`) provides comprehensive testing for the Land Memory System.

### Test Categories

#### Database Operations
- Connection and initialization
- Memory creation and retrieval
- Data cleanup and resource management

#### Land Knowledge Operations
- Storage and retrieval of land knowledge
- Knowledge item validation
- Error handling

#### Land Plot Search
- Neighborhood-based search
- Metadata filtering
- Vector similarity search
- Combined search criteria

### Test Setup
- Uses Vitest testing framework
- Configurable database connection
- Automatic test data cleanup
- Mock embedding service for testing

### Environment Requirements
- PostgreSQL database
- Environment variables:
  - `POSTGRES_URL`: Database connection string
  - `OPENAI_API_KEY`: API key for embedding service
  - `OPENAI_API_ENDPOINT`: Optional API endpoint override

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test runtime-property-database2.test.ts
```
