import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { LandDatabaseAdapter } from "../land_database_adapter";
import { LandMemorySystem } from "../land_memory_system";
import {
    LandPlotMemory,
    LandPlotMetadata,
    ZoningType,
    PlotSize,
    BuildingType,
    DistanceCategory,
    LAND_TABLE,
    LAND_ROOM_ID,
    LAND_AGENT_ID,
    LandSearchParams,
    LandKnowledgeItem
} from "../types";
import { stringToUuid, ModelProviderName, MemoryManager, embed } from "@ai16z/eliza";
import { printLandMemory } from "../logging";

describe('Land Plot Database Operations', () => {
    let runtime: any;
    let db: LandDatabaseAdapter;
    let memorySystem: LandMemorySystem;
    let idCounter = 0;
    const generateUniqueId = (prefix: string) => {
        idCounter++;
        return stringToUuid(`${prefix}-${idCounter}`);
    };

    beforeAll(async () => {
        // Initialize database
        db = new LandDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/test',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        await db.init();

        // Create runtime with real database adapter
        runtime = {
            agentId: LAND_AGENT_ID,
            serverUrl: 'http://localhost:3000',
            databaseAdapter: db,
            token: process.env.OPENAI_API_KEY,
            modelProvider: 'openai' as ModelProviderName,
            character: {
                modelProvider: 'openai',
                modelEndpointOverride: process.env.OPENAI_API_ENDPOINT,
            },
            messageManager: {
                getCachedEmbeddings: async () => [],
            },
            memoryManager: new MemoryManager({ tableName: 'memories', runtime }),
            documentsManager: new MemoryManager({ tableName: 'documents', runtime }),
            knowledgeManager: new MemoryManager({ tableName: 'knowledge', runtime }),
            getCachedEmbeddings: async () => {
                // Return a properly sized embedding array
                return new Float32Array(1536).fill(0.1);
            },
        };

        const embedder = {
            embedText: async (text: string) => embed(runtime, text)
        };

        // Initialize memory system with real embedder
        memorySystem = new LandMemorySystem(db, embedder);

        // Clear any existing data before all tests
        await memorySystem.removeAllLandMemories();

    });

    beforeEach(async () => {
        // Reset ID counter
        idCounter = 0;
        // Clear database
        //await db.removeAllLandMemories(LAND_ROOM_ID);
    });

    afterEach(async () => {
        // Clean up after each test
        //await db.removeAllLandMemories(LAND_ROOM_ID);
    });

    afterAll(async () => {
        //await memorySystem.removeAllLandMemories();
        await db.close();
    });

    const landMetadata1: LandPlotMetadata = {
        rank: 1,
        name: 'Oceanview Residence',
        neighborhood: 'Coastal District',
        zoning: ZoningType.Residential,
        plotSize: PlotSize.Large,
        buildingType: BuildingType.MidRise,
        distances: {
            ocean: {
                meters: 150,
                category: DistanceCategory.Close
            },
            bay: {
                meters: 2000,
                category: DistanceCategory.Far
            }
        },
        building: {
            floors: { min: 5, max: 8 },
            height: { min: 15, max: 24 }
        },
        plotArea: 2500,
    };


    describe('Land Knowledge Operations', () => {
        test('should store and retrieve land knowledge with storeProperty()', async () => {

            const id = await memorySystem.storeProperty(landMetadata1);

            // Store the knowledge and get the ID
            expect(id).toBeDefined();

            // Retrieve the knowledge by ID
            const retrievedKnowledge = await memorySystem.getLandKnowledgeById(id);
            expect(retrievedKnowledge).toBeDefined();
            expect(retrievedKnowledge?.content.text).toBeDefined();
            expect(retrievedKnowledge?.content.metadata).toEqual(landMetadata1);
            await memorySystem.removeAllLandMemories();
        });
    });

    describe('Land Plot Creation', () => {
        test('should create valid land plot memory', async () => {

            await memorySystem.storeProperty(landMetadata1);

            // Verify creation by searching for the property
            const searchParams = {
                names: [landMetadata1.name]
            }
            const results = await memorySystem.searchPropertiesByParams(searchParams);

            expect(results.length).toBeGreaterThan(0);

            const result = results[0];
            expect(result.content.metadata.name).toBe(landMetadata1.name);
            expect(result.content.metadata.plotSize).toBe(landMetadata1.plotSize);
            expect(result.content.metadata.zoning).toBe(landMetadata1.zoning);
        }, 10000);
    });


    describe('Land Plot Search', () => {
        test('should find plots by neighborhood', async () => {
            const searchParams = {
                neighborhoods: ['Coastal District']
            };

            const results = await memorySystem.searchPropertiesByParams(searchParams);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].content.metadata.neighborhood).toBe('Coastal District');
        });

        test('should find plots by neighborhood and plot size', async () => {
            const searchParams = {
                neighborhoods: ['Coastal District'],
                plotSizes: [PlotSize.Large],
           };

            const results = await memorySystem.searchPropertiesByParams(searchParams);

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                console.log("Neighborhood + Plot Size test" ,
                    result.content.metadata.neighborhood, 
                    result.content.metadata.plotSize);

                expect(result.content.metadata.neighborhood).toBe('Coastal District');
                expect(result.content.metadata.plotSize).toBe(PlotSize.Large);
                //expect(result.content.metadata.distances.ocean.meters).toBeLessThanOrEqual(200);
            });
        });

        test('should find plots by distance to ocean', async () => {
            const searchParams = {
                distances: {
                    ocean: {
                        maxMeters: 200,
                        category: DistanceCategory.Close
                    }
                }
            };

            const results = await memorySystem.searchPropertiesByParams(searchParams);

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                console.log("Distance to Ocean test\n",
                    "distance to Ocean", result.content.metadata.distances.ocean.meters,
                    "\ndistance category", result.content.metadata.distances.ocean.category);
                expect(result.content.metadata.distances.ocean.meters).toBeLessThanOrEqual(200);
            });
        });

        /*         test('should find plots by semantic search', async () => {
            const testMetadata = landMetadata1;

            const query = `${testMetadata.name} is a ${testMetadata.plotSize} ${testMetadata.zoning} plot in ${testMetadata.neighborhood}. `

            const testMetadataParams: Partial<LandSearchParams> = {
                neighborhoods: [testMetadata.neighborhood],
                zoningTypes: [testMetadata.zoning],
                plotSizes: [testMetadata.plotSize],
                buildingTypes: [testMetadata.buildingType]
            };

            console.log('Query:', query);
            console.log('Metadata Params:', testMetadataParams);

            const results = await memorySystem.searchProperties(query,testMetadataParams);

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.content.metadata.plotSize).toBe(PlotSize.Large);
                expect(result.content.metadata.zoning).toBe(ZoningType.Residential);
                expect(result.content.metadata.distances.ocean.category).toBe(DistanceCategory.Close);
            });
        }); */
    });




});