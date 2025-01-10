import { unrealAgentAction } from "./actions";
import { startPropertySearch } from "./initialSearchAction";
import { processPropertySearch } from "./searchProcessingAction";
import { endPropertySearch } from "./endSearchAction";
import { factEvaluator } from "./evaluators";
import { propertySearchProvider } from "./searchContextProvider";
import { Plugin } from "@ai16z/eliza";
import { PropertySearchManager } from "./searchManager";
import { PostgresLandDataProvider } from "./adapters/PostgresLandDataProvider";
import { DistanceCategory, SearchMetadata } from "./types";
import { LandDatabaseAdapter } from "./database/land_database_adapter";

export { PostgresDatabaseAdapter } from '@ai16z/adapter-postgres'
export *  from "./types";
export * as actions from "./actions";
export * as providers from "./providers";
export { PropertySearchManager } from "./searchManager";
export { PostgresLandDataProvider } from "./adapters/PostgresLandDataProvider";
export { SearchMetadata } from "./types";
export { LandDatabaseAdapter} from "./database/land_database_adapter"
export { ReservoirAPI } from "./nft/ReservoirAPI";
export { NFTPrice, NFTPriceCache, NFTPriceProvider } from "./nft/types_NFT";
//export { Post}
export const unrealPlugin: Plugin = {
    name: "unreal",
    description: "Unreal Agent with basic actions and evaluators",
    actions: [startPropertySearch, processPropertySearch, endPropertySearch],
    evaluators: [],
    providers: [propertySearchProvider],
};
