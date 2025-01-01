import { IAgentRuntime } from '@ai16z/eliza';
import { PropertyData, SearchOptions, SearchResult, FilterGroup } from './types';
import { StorageError, StorageErrorCode } from './errors';

/**
 * Core interface for property storage operations
 */
export interface PropertyStorage {
    /**
     * Initialize the storage with runtime
     */
    initialize(runtime: IAgentRuntime): void;

    /**
     * Add a single property to storage
     * @throws {StorageError} If property is invalid or operation fails
     */
    addProperty(property: PropertyData): Promise<string>;

    /**
     * Retrieve a property by ID
     * @throws {StorageError} If property not found
     */
    getProperty(id: string): Promise<PropertyData>;

    /**
     * Update an existing property
     * @throws {StorageError} If property not found or update fails
     */
    updateProperty(id: string, property: PropertyData): Promise<void>;

    /**
     * Delete a property
     * @throws {StorageError} If property not found or delete fails
     */
    deleteProperty(id: string): Promise<void>;

    /**
     * Search properties by vector similarity
     */
    searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]>;

    /**
     * Search properties by metadata filters
     */
    searchByFilters(filters: FilterGroup): Promise<SearchResult[]>;

    /**
     * Bulk load properties
     * @throws {StorageError} If any property is invalid or operation fails
     */
    bulkLoad(properties: PropertyData[]): Promise<void>;

    /**
     * Get total count of stored properties
     */
    getCount(): Promise<number>;

    /**
     * Clear all stored properties
     */
    clear(): Promise<void>;
}

/**
 * Abstract base class for property storage implementations
 */
export abstract class BasePropertyStorage implements PropertyStorage {
    abstract addProperty(property: PropertyData): Promise<string>;
    abstract getProperty(id: string): Promise<PropertyData>;
    abstract updateProperty(id: string, property: PropertyData): Promise<void>;
    abstract deleteProperty(id: string): Promise<void>;
    abstract searchByVector(vector: number[], options: SearchOptions): Promise<SearchResult[]>;
    abstract searchByFilters(filters: FilterGroup): Promise<SearchResult[]>;
    abstract getCount(): Promise<number>;
    abstract clear(): Promise<void>;

    /**
     * Default bulk load implementation
     * Override for more efficient implementation
     */
    async bulkLoad(properties: PropertyData[]): Promise<void> {
        try {
            await Promise.all(properties.map(p => this.addProperty(p)));
        } catch (error) {
            throw new StorageError(
                StorageErrorCode.INTERNAL_ERROR,
                `Bulk load failed: ${error}`
            );
        }
    }

    /**
     * Validate property data
     * @throws {StorageError} If property is invalid
     */
    protected validateProperty(property: PropertyData): void {
        if (!property.id || !property.name) {
            throw new StorageError(
                StorageErrorCode.INVALID_INPUT,
                'Property must have id and name'
            );
        }
    }

    /**
     * Validate vector dimensions
     * @throws {StorageError} If vector dimensions don't match
     */
    protected validateVector(vector: number[]): void {
        if (!Array.isArray(vector) || vector.length === 0) {
            throw new StorageError(
                StorageErrorCode.INVALID_INPUT,    // KAI wilder got rid of a stupid enum here
                'Invalid vector'
            );
        }
    }

    initialize(runtime: IAgentRuntime): void {
        // To be implemented by subclasses
    }
}
