import { config } from './config/index.js';
import { PostgresDatabaseAdapter } from '@ai16z/adapter-postgres';
import { LandDatabaseAdapter } from '@ai16z/plugin-unreal';
import { PostgresLandDataProvider } from '@ai16z/plugin-unreal';
import { PropertySearchManager } from '@ai16z/plugin-unreal';
import { TestRuntime } from './runtime/TestRuntime.js';
import { ReservoirAPI } from '@ai16z/plugin-unreal';
import { PlotSize, LandPlotMemory, NFTPrice, DistanceCategory } from '@ai16z/plugin-unreal';

async function main() {
    const userId = 'test-user-1';
    let searchManager: PropertySearchManager | undefined;

    try {
        // Initialize components
        const postgresAdapter = new PostgresDatabaseAdapter(config.database);
        await postgresAdapter.init();  // Make sure to initialize the adapter

        const landDbAdapter = new LandDatabaseAdapter(postgresAdapter);
        const landDataProvider = new PostgresLandDataProvider(landDbAdapter);
        const runtime = new TestRuntime(postgresAdapter);
        searchManager = new PropertySearchManager(runtime);

        // Initialize ReservoirAPI with config values
        const reservoirAPI = new ReservoirAPI(
            config.nft.reservoirApiKey,
            config.nft.reservoirBaseUrl
        );

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

        console.log('Executing search with metadata:', searchMetadata);
        const results = await searchManager.executeSearch(searchMetadata);

        if (!results || results.length === 0) {
            console.log('No property results found');
            return;
        }

        // Fetch NFT prices and match with properties
        console.log('\nFetching NFT prices and matching with properties...');
        const collectionAddress = config.nft.nftCollectionAddress || process.env.NFT_COLLECTION_ADDRESS;

        if (!collectionAddress) {
            throw new Error('NFT collection address not configured');
        }

        try {
            // Fetch prices and store in cache
            const nftPrices = await reservoirAPI.getPricesForCollection(collectionAddress);
            if (!nftPrices || nftPrices.length === 0) {
                console.error(`No NFT prices found for collection: ${collectionAddress}`);
                return;
            }

            // Create a map of tokenId to price for efficient lookup
            const priceMap = new Map(nftPrices.map(nft => [nft.tokenId, nft.price]));

            // Match properties with NFT prices by tokenId
            console.log('\nMatching properties with NFT prices...');
            let matchCount = 0;

            const enrichedResults = results.map(result => {
                const tokenId = result.content.metadata.tokenId;
                if (tokenId && priceMap.has(tokenId)) {
                    matchCount++;
                    return {
                        ...result,
                        content: {
                            ...result.content,
                            metadata: {
                                ...result.content.metadata,
                                nftData: {
                                    price: priceMap.get(tokenId),
                                    lastUpdated: new Date().toISOString()
                                }
                            }
                        }
                    };
                }
                return result;
            });

            // Store enriched results in search cache
            if (searchManager) {
                await searchManager.updateSearchResults(userId, enrichedResults);
            }

            // Display results
            console.log(`\nFound ${results.length} results, matched ${matchCount} with NFT prices:`);
            // Filter for results with price matches and display them
            const matchedResults = enrichedResults.filter(result => result.content.metadata.nftData?.price);
            console.log(`\nFound ${matchedResults.length} results with NFT price matches out of ${results.length} total properties:`);

            matchedResults.forEach((result, index) => {
                console.log(`\nResult ${index + 1}:`);
                console.log('Property:', result.content.metadata.name);
                console.log('NFT Match Found:');
                console.log('- Price:', result.content.metadata.nftData?.price || 'N/A');
                console.log('- Token ID:', result.content.metadata.tokenId);
                console.log('- Last Updated:', result.content.metadata.nftData?.lastUpdated || 'N/A');
            });

        } catch (error) {
            console.error('Error fetching NFT prices:', error instanceof Error ? error.message : error);
        }

    } catch (error) {
        console.error('Error in NFT matching test:', error instanceof Error ? error.message : error);
    } finally {
        // Ensure search session is always ended
        if (searchManager) {
            await searchManager.endSearchSession(userId).catch(console.error);
        }
    }
}

main().catch(console.error);