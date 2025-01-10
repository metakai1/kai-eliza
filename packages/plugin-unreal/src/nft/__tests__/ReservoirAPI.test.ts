import { ReservoirAPI } from '../ReservoirAPI';
import { NFTPrice, ReservoirResponse } from '../types';

describe('ReservoirAPI', () => {
    let api: ReservoirAPI;
    const mockApiKey = 'test-api-key';
    const mockBaseUrl = 'http://mock-api';
    const mockCollectionAddress = '0xd396ca541f501f5d303166c509e2045848df356b';

    beforeEach(() => {
        api = new ReservoirAPI(mockApiKey, mockBaseUrl);
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    const mockApiResponse: ReservoirResponse = {
        tokens: {
            "token1": 0.5,
            "token2": 1.0,
            "token3": 1.5
        }
    };

    describe('getPricesForCollection', () => {
        it('should fetch and transform prices correctly', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse
            });

            const prices = await api.getPricesForCollection(mockCollectionAddress);

            expect(prices).toHaveLength(3);
            expect(prices).toContainEqual({ tokenId: 'token1', price: 0.5 });
            expect(prices).toContainEqual({ tokenId: 'token2', price: 1.0 });
            expect(prices).toContainEqual({ tokenId: 'token3', price: 1.5 });
        });

        it('should update cache after successful fetch', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse
            });

            await api.getPricesForCollection(mockCollectionAddress);
            const cached = await api.getCachedPrices(mockCollectionAddress);

            expect(cached).toBeTruthy();
            expect(cached?.prices).toHaveLength(3);
            expect(cached?.collection).toBe(mockCollectionAddress);
        });

        it('should throw error on API failure', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found'
            });

            await expect(api.getPricesForCollection(mockCollectionAddress))
                .rejects
                .toThrow('API request failed: Not Found');
        });
    });

    describe('getCachedPrices', () => {
        it('should return null for non-cached collection', async () => {
            const cached = await api.getCachedPrices('non-existent');
            expect(cached).toBeNull();
        });

        it('should return cached prices after fetch', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse
            });

            await api.getPricesForCollection(mockCollectionAddress);
            const cached = await api.getCachedPrices(mockCollectionAddress);

            expect(cached?.prices).toBeDefined();
            expect(cached?.lastUpdated).toBeInstanceOf(Date);
        });
    });
});
