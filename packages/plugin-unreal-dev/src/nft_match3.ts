import { config } from './config/index.js';
import { PostgresDatabaseAdapter } from '@ai16z/adapter-postgres';
import { LandDatabaseAdapter } from '@ai16z/plugin-unreal';
import { PostgresLandDataProvider } from '@ai16z/plugin-unreal';
import { PropertySearchManager } from '@ai16z/plugin-unreal';
import { TestRuntime } from './runtime/TestRuntime.js';
import { PlotSize, LandPlotMemory, NFTPrice, DistanceCategory } from '@ai16z/plugin-unreal';

async function main() {
    const userId = 'test-user-1';
    let searchManager: PropertySearchManager | undefined;
    let postgresAdapter: PostgresDatabaseAdapter | undefined;
    let runtime: TestRuntime | undefined;

    try {
        // Initialize components
        postgresAdapter = new PostgresDatabaseAdapter(config.database);
        await postgresAdapter.init();  // Make sure to initialize the adapter

        const landDbAdapter = new LandDatabaseAdapter(postgresAdapter);
        const landDataProvider = new PostgresLandDataProvider(landDbAdapter);
        runtime = new TestRuntime(postgresAdapter);
        searchManager = new PropertySearchManager(runtime);

        console.log('Initializing search session...');
        await searchManager.initializeNewSearchSession(userId);

        const searchMetadata = {
            searchText: "Looking for space mind properties",
            metadata: {
                neighborhoods: ["Space Mind"],
                plotSizes: [],
                buildingTypes: [],
                zoningTypes: [],
            }
        };

        // create
        console.log('Executing search with metadata:', searchMetadata);
        const enrichedResults = await searchManager.executeSearchV2(searchMetadata);

        if (!enrichedResults || enrichedResults.length === 0) {
            console.log('No property results found');
            return;
        }

        // Display results
        console.log(`\nFound ${enrichedResults.length} total properties:`);

        const matchedResults = enrichedResults.filter(result => result.content.metadata.nftData?.price);
        console.log(`${matchedResults.length} properties have NFT price matches:\n`);

        matchedResults.forEach((result, index) => {
            console.log(`Result ${index + 1}:`);
            console.log('Property:', result.content.metadata.name);
            console.log('NFT Match Found:');
            console.log('- Price:', result.content.metadata.nftData?.price || 'N/A');
            console.log('- Token ID:', result.content.metadata.tokenId);
            console.log('- Last Updated:', result.content.metadata.nftData?.lastUpdated || 'N/A');
            console.log();
        });

    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
    } finally {
        try {
/*             if (searchManager) {
                await searchManager.cleanup?.();
            }
            if (runtime) {
                await runtime.cleanup?.();
            }
            if (postgresAdapter) {
                await postgresAdapter.close();
            } */
            process.exit(0);
        } catch (cleanupError) {
            console.error('Error during cleanup:', cleanupError);
            process.exit(1);
        }
    }
}

main().catch(console.error);