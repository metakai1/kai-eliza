import { Memory, UUID } from "@ai16z/eliza";
import { z } from "zod";

export enum PlotSize {
    Nano = 'Nano',
    Micro = 'Micro',
    Small = 'Small',
    Medium = 'Medium',
    Large = 'Large',
    Mega = 'Mega',
    Giga = 'Giga'
}

export enum ZoningType {
    Residential = 'Residential',
    Commercial = 'Commercial',
    Industrial = 'Industrial',
    Mixed = 'Mixed',
    Special = 'Special',
    Legendary = 'Legendary'
}

export enum BuildingType {
    LowRise = 'LowRise',
    MidRise = 'MidRise',
    HighRise = 'HighRise',
    Skyscraper = 'Skyscraper',
    Megascraper = 'Megascraper'
}

export enum DistanceCategory {
    Close = 'Close',
    Medium = 'Medium',
    Far = 'Far'
}

export interface LandPlotMetadata {
    rank: number;
    name: string;
    neighborhood: string;
    zoning: ZoningType;
    plotSize: PlotSize;
    buildingType: BuildingType;
    distances: {
        ocean: {
            meters: number;
            category: DistanceCategory;
        };
        bay: {
            meters: number;
            category: DistanceCategory;
        };
    };
    building: {
        floors: {
            min: number;
            max: number;
        };
        height: {
            min: number;
            max: number;
        };
    };
    plotArea: number;
}

export interface LandPlotMemory extends Memory {
    id: UUID;
    content: {
        text: string;
        metadata: LandPlotMetadata;
        source?: UUID;  // Optional source UUID to track origin of fragments
    };
}

export interface LandSearchParams {
    roomId?: UUID;
    agentId?: UUID;
    names?: string[];
    neighborhoods?: string[];
    zoningTypes?: ZoningType[];
    plotSizes?: PlotSize[];
    buildingTypes?: BuildingType[];
    distances?: {
        ocean?: {
            maxMeters?: number;
            category?: DistanceCategory;
        };
        bay?: {
            maxMeters?: number;
            category?: DistanceCategory;
        };
    };
    building?: {
        floors?: {
            min?: number;
            max?: number;
        };
        height?: {
            min?: number;
            max?: number;
        };
    };
    rarity?: {
        rankRange?: {
            min?: number;
            max?: number;
        };
    };
}

export interface LandKnowledgeItem {
    id: UUID;
    content: {
        text: string;
        metadata: any;
    };
}

// Zod schema for search metadata
export const SearchMetadataSchema = z.object({
    searchText: z.string(),
    metadata: z.object({
        neighborhood: z.array(z.string()).optional(),
        zoningTypes: z.array(z.nativeEnum(ZoningType)).optional(),
        plotSizes: z.array(z.nativeEnum(PlotSize)).optional(),
        buildingTypes: z.array(z.nativeEnum(BuildingType)).optional(),
        distances: z.object({
            ocean: z.object({
                maxMeters: z.number().optional(),
                category: z.nativeEnum(DistanceCategory).optional()
            }).optional(),
            bay: z.object({
                maxMeters: z.number().optional(),
                category: z.nativeEnum(DistanceCategory).optional()
            }).optional()
        }).optional(),
        building: z.object({
            floors: z.object({
                min: z.number().optional(),
                max: z.number().optional()
            }).optional(),
            height: z.object({
                min: z.number().optional(),
                max: z.number().optional()
            }).optional()
        }).optional(),
        rarity: z.object({
            rankRange: z.object({
                min: z.number().optional(),
                max: z.number().optional()
            }).optional()
        }).optional()
    })
});

export type SearchMetadata = z.infer<typeof SearchMetadataSchema>;

// Constants
export const AGENT_ID: `${string}-${string}-${string}-${string}-${string}` = '1459b245-2171-02f6-b436-c3c2641848e5';
export const LAND_TABLE = 'land_table';
export const LAND_ROOM_ID = AGENT_ID;
export const LAND_AGENT_ID = AGENT_ID;
export const LAND_USER_ID = AGENT_ID;
export const DEFAULT_MATCH_THRESHOLD = 0.4;
export const DEFAULT_MATCH_COUNT = 20;
