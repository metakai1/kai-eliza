import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'land_database'
    },
    cache: {
        host: process.env.CACHE_HOST || 'localhost',
        port: parseInt(process.env.CACHE_PORT || '6379')
    },
    nft: {
        reservoirApiKey: process.env.RESERVOIR_API_KEY || 'd2a8c0da-12d7-5cb7-a5d1-99f7bdca8bbb',
        reservoirBaseUrl: process.env.RESERVOIR_BASE_URL || 'https://api.reservoir.tools',
        nftCollectionAddress: process.env.NFT_COLLECTION_ADDRESS || '0xd396ca541f501f5d303166c509e2045848df356b',
    }
};