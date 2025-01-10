import { createReadStream, createWriteStream } from 'fs';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';

interface NFTMetadata {
    tokenId: string;
    name: string;
}

interface AlchemyResponse {
    nfts: Array<{
        tokenId: string;
        name: string;
    }>;
    pageKey?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchNFTMetadata(): Promise<NFTMetadata[]> {
    const apiKey = 'yAe_o7yc1FGFMeUGIMLB-uKGkeVGP96W';
    const contractAddress = '0xd396ca541F501f5D303166C509e2045848df356b';
    const baseUrl = 'https://eth-mainnet.g.alchemy.com/nft/v3';
    const options = {
        method: 'GET',
        headers: { accept: 'application/json' }
    };

    const nftMetadata: NFTMetadata[] = [];
    let hasMore = true;
    let pageKey = '';

    while (hasMore) {
        const url = `${baseUrl}/${apiKey}/getNFTsForContract?contractAddress=${contractAddress}&withMetadata=true&limit=100${pageKey ? `&pageKey=${pageKey}` : ''}`;

        console.log(`Fetching page: ${url}`);

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: AlchemyResponse = await response.json();

            // Extract tokenId and name from each NFT
            data.nfts.forEach(nft => {
                nftMetadata.push({
                    tokenId: nft.tokenId,
                    name: nft.name
                });
            });

            console.log(`Fetched ${data.nfts.length} NFTs${pageKey ? ' (page key: ' + pageKey + ')' : ''}`);

            // Check if there are more pages
            if (data.pageKey) {
                pageKey = data.pageKey;
                // Add delay before next request
                await delay(70);
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error('Error fetching NFT data:', error);
            hasMore = false;
        }
    }

    return nftMetadata;
}

async function processCSV(nftMetadata: NFTMetadata[]) {
    const inputFile = './data/land_plots.csv';
    const outputFile = './data/land_plots_w_tokenid.csv';

    const parser = csvParse({ columns: true, skip_empty_lines: true });
    const stringifier = csvStringify({ header: true });
    const outputStream = createWriteStream(outputFile);

    // Create a map for quick lookups
    const nameToTokenId = new Map(
        nftMetadata.map(({ tokenId, name }) => [name, tokenId])
    );

    parser.on('readable', function() {
        let record;
        while ((record = parser.read()) !== null) {
            // Match the name in CSV with NFT name
            const tokenId = nameToTokenId.get(record['Name']) || '';

            // Add tokenId to the record
            const newRecord = {
                ...record,
                tokenId
            };

            stringifier.write(newRecord);
        }
    });

    parser.on('end', function() {
        stringifier.end();
    });

    stringifier.pipe(outputStream);

    createReadStream(inputFile).pipe(parser);

    return new Promise((resolve, reject) => {
        outputStream.on('finish', resolve);
        outputStream.on('error', reject);
    });
}

async function main() {
    try {
        console.log('Fetching NFT metadata...');
        const nftMetadata = await fetchNFTMetadata();
        console.log(`Found ${nftMetadata.length} NFTs`);

        console.log('Processing CSV file...');
        await processCSV(nftMetadata);
        console.log('Done! New CSV file created with tokenIds');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
