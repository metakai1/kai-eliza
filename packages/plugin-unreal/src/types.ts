import { Memory, UUID } from "@ai16z/eliza";
import { z } from "zod";
import { NFTPrice } from './nft/types_NFT';

export enum PlotSize {
    Nano = 'Nano',
    Micro = 'Micro',
    Mini = 'Mini',
    Mid = 'Mid',
    Macro = 'Macro',
    Mega = 'Mega',
    Mammoth = 'Mammoth',
    Giga = 'Giga'
}

export enum ZoningType {
    Residential = 'Residential',
    Commercial = 'Commercial',
    Industrial = 'Industrial',
    Mixed = 'Mixed Use',  // Note: Changed to "Mixed Use"
    Legendary = 'Legendary'
}

export enum BuildingType {
    Lowrise = 'Lowrise',    // 2-20 floors
    Midrise = 'Midrise',    // 21-35 floors
    Highrise = 'Highrise',  // 36-65 floors
    Tall = 'Tall',          // 66-80 floors
    Supertall = 'Supertall',// 81-100 floors
    Megatall = 'Megatall'   // 100+ floors
}

export enum DistanceCategory {
    Close = 'Close',    // 0-300m
    Medium = 'Medium',  // 301-700m
    Far = 'Far'        // 701m+
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
    tokenId?: string;
    nftData?: {
        price?: number;
        lastUpdated?: string;
    };
}

export interface LandPlotMemory extends Memory {
    id: UUID;
    content: {
        text: string;
        metadata: LandPlotMetadata;
        source?: UUID;  // Optional source UUID to track origin of fragments
    };
}

// Add this after the LandPlotMemory interface
export interface LandPlotMemoryNFTmatch extends LandPlotMemory {
    content: {
        text: string;
        metadata: LandPlotMetadata;
        source?: UUID;  // Optional source UUID to track origin of fragments
        nftPrice?: NFTPrice;  // Optional NFT price information
        tokenId?: string
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
    tokenId?: string;  // Add tokenId search parameter
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

export interface SearchSession {
    status: "ACTIVE" | "INACTIVE";
    lastQuery: string | null;
    results: any[];
    filters: Record<string, any>;
}

// Zod schema for search metadata
export const SearchMetadataSchema = z.object({
    searchText: z.string(),
    metadata: z.object({
        names: z.array(z.string()).optional(),
        neighborhoods: z.array(z.string()).optional(),
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
