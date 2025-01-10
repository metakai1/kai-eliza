import { config } from 'dotenv';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { LandDatabaseAdapter } from '../src/database/land_database_adapter';
import { PostgresLandDataProvider } from '../src/adapters/PostgresLandDataProvider';
import { LandPlotMemory, ZoningType, PlotSize, BuildingType, DistanceCategory, AGENT_ID } from '../src/types';
import { PostgresDatabaseAdapter } from '@ai16z/adapter-postgres';
import { UUID } from '@ai16z/eliza';

// Load environment variables
//config();

async function seedDatabase() {
    // Initialize database connection
    const dbAdapter = new PostgresDatabaseAdapter({
        connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/test',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    });

    await dbAdapter.init();

    const landDbAdapter = new LandDatabaseAdapter(dbAdapter);
    const landDataProvider = new PostgresLandDataProvider(landDbAdapter);

    // Read CSV file
    const parser = parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true
    });

    const records: LandPlotMemory[] = [];

    createReadStream('./data/land_plots_w_tokenid.csv')
        .pipe(parser)
        .on('data', async (row) => {
            console.log('Processing plot:', row['Name'], 'TokenId:', row['tokenId']);
            const memory: LandPlotMemory = {
                id: row.id,
                userId: AGENT_ID,
                agentId: AGENT_ID,
                roomId: AGENT_ID,
                content: {
                    text: row.description,
                    metadata: {
                        rank: parseInt(row['Rank']),
                        name: row['Name'],
                        neighborhood: row['Neighborhood'],
                        zoning: row['Zoning Type'] as ZoningType,
                        plotSize: row['Plot Size'] as PlotSize,
                        buildingType: row['Building Size'] as BuildingType,
                        building: {
                            floors: {
                                min: parseInt(row['Min # of Floors']),
                                max: parseInt(row['Max # of Floors'])
                            },
                            height: {
                                min: parseInt(row['Min Building Height (m)']),
                                max: parseInt(row['Max Building Height (m)'])
                            }
                        },
                        plotArea: parseInt(row['Plot Area (m²)']),
                        distances: {
                            ocean: {
                                meters: parseInt(row['Distance to Ocean (m)']),
                                category: row['Distance to Ocean'] as DistanceCategory
                            },
                            bay: {
                                meters: parseInt(row['Distance to Bay (m)']),
                                category: row['Distance to Bay'] as DistanceCategory
                            }
                        },
                        tokenId: row['tokenId'] || null
                    }
                }
            };
            records.push(memory);
        })
        .on('end', async () => {
            try {
                // Batch insert records
                for (const record of records) {
                    await landDataProvider.createLandMemory(record);
                }
                console.log(`Successfully seeded ${records.length} records`);
                process.exit(0);
            } catch (error) {
                console.error('Error seeding database:', error);
                process.exit(1);
            }
        });
}

seedDatabase().catch(console.error);
