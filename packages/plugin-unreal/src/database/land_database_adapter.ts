import { IDatabaseAdapter } from "@ai16z/eliza";
import { elizaLogger, UUID } from "@ai16z/eliza";
import PostgresDatabaseAdapter from "@ai16z/adapter-postgres";
import {
    LandPlotMemory,
    LandSearchParams,
    LAND_TABLE,
    LAND_ROOM_ID,
    LAND_AGENT_ID,
    DEFAULT_MATCH_THRESHOLD
} from "../types";

const LAND_MEMORY_TYPE = 'land_plot';

export class LandDatabaseAdapter {
    private dbAdapter: IDatabaseAdapter;

    constructor(configOrAdapter: IDatabaseAdapter) {
        this.dbAdapter = configOrAdapter;
    }

    async init(): Promise<void> {
        await this.dbAdapter.init();
        // Add any additional initialization specific to LandDatabaseAdapter if needed
    }

    async createLandMemory(memory: LandPlotMemory): Promise<void> {
        console.log("Creating land memory with :", memory.content.metadata.name);
        await this.dbAdapter.createMemory(memory, LAND_MEMORY_TYPE, true, LAND_TABLE);
    }

    async getLandMemoryById(id: UUID): Promise<LandPlotMemory | undefined> {
        const memory = null //await this.dbAdapter.getMemoryById(id, LAND_MEMORY_TYPE, LAND_TABLE);
        if (!memory) return undefined;
        return memory as LandPlotMemory;
    }

    async getLandMemories(roomId: UUID): Promise<LandPlotMemory[]> {
/*         const memories = await this.dbAdapter.getMemories({
            roomId,
            tableName: LAND_MEMORY_TYPE,
            dbTable: LAND_TABLE
        });
        return memories as LandPlotMemory[]; */
        return null
    }

/*     async removeLandMemory(memoryId: UUID): Promise<void> {
        await this.dbAdapter.removeMemory(memoryId, LAND_MEMORY_TYPE, LAND_TABLE);
    }

    async removeAllLandMemories(roomId: UUID): Promise<void> {
        await this.dbAdapter.removeAllMemories(roomId, LAND_MEMORY_TYPE, LAND_TABLE);
    } */

    async searchLandByMetadata(params: LandSearchParams): Promise<LandPlotMemory[]> {
        let sql = `
            SELECT * FROM ${LAND_TABLE}
            WHERE type = $1
            AND content IS NOT NULL
        `;
        const values: any[] = [LAND_MEMORY_TYPE];
        let paramCount = 1;

        // Add names condition
        if (params.names?.length) {
            paramCount++;
            sql += ` AND content->'metadata'->>'name' = ANY($${paramCount}::text[])`;
            values.push(params.names);
        }

        if (params.neighborhoods?.length) {
            paramCount++;
            sql += ` AND content->'metadata'->>'neighborhood' = ANY($${paramCount}::text[])`;
            values.push(params.neighborhoods);
        }

        if (params.zoningTypes?.length) {
            paramCount++;
            sql += ` AND content->'metadata'->>'zoning' = ANY($${paramCount}::text[])`;
            values.push(params.zoningTypes);
        }

        if (params.plotSizes?.length) {
            paramCount++;
            sql += ` AND content->'metadata'->>'plotSize' = ANY($${paramCount}::text[])`;
            values.push(params.plotSizes);
        }

        if (params.buildingTypes?.length) {
            paramCount++;
            sql += ` AND content->'metadata'->>'buildingType' = ANY($${paramCount}::text[])`;
            values.push(params.buildingTypes);
        }

        if (params.distances?.ocean) {
            if (params.distances.ocean.maxMeters) {
                paramCount++;
                sql += ` AND (content->'metadata'->'distances'->'ocean'->>'meters')::int <= $${paramCount}`;
                values.push(params.distances.ocean.maxMeters);
            }
            if (params.distances.ocean.category) {
                paramCount++;
                sql += ` AND content->'metadata'->'distances'->'ocean'->>'category' = $${paramCount}`;
                values.push(params.distances.ocean.category);
            }
        }

        if (params.distances?.bay) {
            if (params.distances.bay.maxMeters) {
                paramCount++;
                sql += ` AND (content->'metadata'->'distances'->'bay'->>'meters')::int <= $${paramCount}`;
                values.push(params.distances.bay.maxMeters);
            }
            if (params.distances.bay.category) {
                paramCount++;
                sql += ` AND content->'metadata'->'distances'->'bay'->>'category' = $${paramCount}`;
                values.push(params.distances.bay.category);
            }
        }
        if (params.building?.floors) {
            if (params.building.floors.min) {
                paramCount++;
                sql += ` AND (content->'metadata'->'building'->'floors'->>'min')::int >= $${paramCount}`;
                values.push(params.building.floors.min);
            }
            if (params.building.floors.max) {
                paramCount++;
                sql += ` AND (content->'metadata'->'building'->'floors'->>'max')::int <= $${paramCount}`;
                values.push(params.building.floors.max);
            }
        }

        if (params.rarity?.rankRange) {
            if (params.rarity.rankRange.min) {
                paramCount++;
                sql += ` AND (content->'metadata'->>'rank')::int >= $${paramCount}`;
                values.push(params.rarity.rankRange.min);
            }
            if (params.rarity.rankRange.max) {
                paramCount++;
                sql += ` AND (content->'metadata'->>'rank')::int <= $${paramCount}`;
                values.push(params.rarity.rankRange.max);
            }
        }

        // Add tokenId search condition
        if (params.tokenId) {
            paramCount++;
            sql += ` AND content->'metadata'->>'tokenId' = $${paramCount}`;
            values.push(params.tokenId);
        }

        try {
            const { rows } = await (this.dbAdapter as PostgresDatabaseAdapter).query(sql, values);
            return rows.map(row => ({
                ...row,
                content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content
            }));
        } catch (error) {
            elizaLogger.error('Error in searchLandByMetadata:', {
                error: error instanceof Error ? error.message : String(error),
                params
            });
            throw error;
        }
    }


    async getPropertiesByRarityRange(
        minRank: number,
        maxRank: number
    ): Promise<LandPlotMemory[]> {
        return this.searchLandByMetadata({
            rarity: {
                rankRange: {
                    min: minRank,
                    max: maxRank
                }
            }
        });
    }
}
