import { PropertySearchManager } from '../searchManager';
import { PostgresLandDataProvider } from '../database/PostgresLandDataProvider';
import { TestRuntime } from './TestRuntime';
import { config } from './config';
import { SearchMetadata } from '../types';

async function main() {
    try {
        // Initialize components
        const runtime = new TestRuntime();
        const dataProvider = new PostgresLandDataProvider(config.database);
        const searchManager = new PropertySearchManager(runtime);

        // Test search functionality
        const userId = 'test-user-1';
        
        // Initialize search session
        console.log('Initializing search session...');
        await searchManager.initializeNewSearchSession(userId);
        
        // Perform a test search
        const searchMetadata: SearchMetadata = {
            searchText: "Looking for a property near the ocean",
            neighborhoods: [],
            plotSizes: [],
            buildingTypes: [],
            zoningTypes: [],
            distances: {
                ocean: {
                    maxMeters: 1000,
                    category: "CLOSE"
                }
            }
        };

        console.log('Executing search with metadata:', searchMetadata);
        const results = await dataProvider.searchLandByMetadata(searchMetadata);
        console.log(`Found ${results.length} results`);
        
        // Display first 3 results
        results.slice(0, 3).forEach((result, index) => {
            console.log(`\nResult ${index + 1}:`);
            console.log(JSON.stringify(result, null, 2));
        });

        // Test session management
        console.log('\nTesting session management...');
        const session = await searchManager.getSearchSession(userId);
        console.log('Current session:', session);

        // End session
        console.log('\nEnding search session...');
        await searchManager.endSearchSession(userId);
        
        // Verify session ended
        const endedSession = await searchManager.getSearchSession(userId);
        console.log('Session after ending:', endedSession);

    } catch (error) {
        console.error('Error in test application:', error);
    }
}

// Run the test
main().catch(console.error);
