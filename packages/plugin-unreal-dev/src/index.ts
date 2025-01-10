import { PropertySearchManager } from '@ai16z/plugin-unreal';
import { PostgresLandDataProvider } from '@ai16z/plugin-unreal';
import { LandDatabaseAdapter, DistanceCategory } from '@ai16z/plugin-unreal';
import { TestRuntime } from './runtime/TestRuntime.js';
import { config } from './config/index.js';
import { SearchMetadata } from '@ai16z/plugin-unreal';
import { PostgresDatabaseAdapter }  from "@ai16z/plugin-unreal";
import { IAgentRuntime } from '@ai16z/eliza';
import {
    PlotSize, ZoningType, BuildingType,
} from '@ai16z/plugin-unreal';

async function main() {
    try {
        // Initialize components

        const postgresAdapter = new PostgresDatabaseAdapter(config.database);
        const landDbAdapter = new LandDatabaseAdapter(postgresAdapter);
        const dbAdapter = new PostgresLandDataProvider(landDbAdapter);
        const runtime = new TestRuntime(postgresAdapter);

        const searchManager = new PropertySearchManager(runtime);

        // Test search functionality
        const userId = 'test-user-1';

        console.log('Initializing search session...');
        await searchManager.initializeNewSearchSession(userId);

        const searchMetadata: SearchMetadata = {
            searchText: "Looking for a property near the ocean",
            metadata: {
                neighborhoods: ["Space Mind"],
                plotSizes: [PlotSize.Macro],
                buildingTypes: [],
                zoningTypes: [],
                distances: {
                    ocean: {
                        maxMeters: 1000,
                        category: DistanceCategory.Close,
                    }
                }
            }
        };

        console.log('Executing search with metadata:', searchMetadata);
        const results = await searchManager.executeSearch(searchMetadata);

        if (!results) {
            console.log('No results found by executeSearch()')
            return;
        }

        console.log(`Found ${results.length} results`);

        results.slice(0, 3).forEach((result, index) => {
            console.log(`\nResult ${index + 1}:`);
            console.log(JSON.stringify(result, null, 2));
        });

        console.log('\nTesting session management...');
        const session = await searchManager.getSearchSession(userId);
        console.log('Current session:', session);

        console.log('\nEnding search session...');
        await searchManager.endSearchSession(userId);

        const endedSession = await searchManager.getSearchSession(userId);
        console.log('Session after ending:', endedSession);

    } catch (error) {
        console.error('Error in test application:', error);
    }
}

main().catch(console.error);
