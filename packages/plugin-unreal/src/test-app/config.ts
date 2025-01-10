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
    }
};
