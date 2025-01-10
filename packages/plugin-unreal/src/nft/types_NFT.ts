export interface NFTPrice {
    tokenId: string;
    price: number;
    propertyName?: string;  // Optional property name for matching
}

export interface ReservoirResponse {
    tokens: Record<string, number>;
}

export interface NFTPriceCache {
    lastUpdated: Date;
    prices: NFTPrice[];
    collection: string;
}

export interface NFTPriceProvider {
    getPricesForCollection(collectionAddress: string): Promise<NFTPrice[]>;
    getCachedPrices(collectionAddress: string): Promise<NFTPriceCache | null>;
}
