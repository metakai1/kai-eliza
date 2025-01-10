import { NFTPrice, NFTPriceCache, NFTPriceProvider, ReservoirResponse } from './types_NFT';

const DEFAULT_API_KEY = 'd2a8c0da-12d7-5cb7-a5d1-99f7bdca8bbb';
const DEFAULT_BASE_URL = 'https://api.reservoir.tools';
const DEFAULT_COLLECTION_ADDRESS = '0xd396ca541f501f5d303166c509e2045848df356b';

export class ReservoirAPI implements NFTPriceProvider {
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private cache: Map<string, NFTPriceCache>;

    constructor(
        apiKey: string = DEFAULT_API_KEY,
        baseUrl: string = DEFAULT_BASE_URL
    ) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.cache = new Map();
    }

    private async fetchFromAPI(collectionAddress: string = DEFAULT_COLLECTION_ADDRESS): Promise<ReservoirResponse> {
        const options = {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'x-api-key': this.apiKey
            }
        };

        const response = await fetch(
            `${this.baseUrl}/tokens/floor/v1?collection=${collectionAddress}`,
            options
        );

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response.json();
    }

    async getPricesForCollection(collectionAddress: string = DEFAULT_COLLECTION_ADDRESS): Promise<NFTPrice[]> {
        try {
            const data = await this.fetchFromAPI(collectionAddress);
            const prices: NFTPrice[] = Object.entries(data.tokens).map(([tokenId, price]) => ({
                tokenId,
                price
            }));

            // Update cache
            this.cache.set(collectionAddress, {
                lastUpdated: new Date(),
                prices,
                collection: collectionAddress
            });

            return prices;
        } catch (error) {
            console.error('Error fetching NFT prices:', error);
            throw error;
        }
    }

    async getCachedPrices(collectionAddress: string = DEFAULT_COLLECTION_ADDRESS): Promise<NFTPriceCache | null> {
        return this.cache.get(collectionAddress) || null;
    }
}
