import { unrealAgentAction } from "./actions";
import { startPropertySearch } from "./initialSearchAction";
import { processPropertySearch } from "./searchProcessingAction";
import { endPropertySearch } from "./endSearchAction";
import { factEvaluator } from "./evaluators";
import { propertySearchProvider } from "./searchContextProvider";
import { Plugin } from "@ai16z/eliza";

export * as actions from "./actions";
//export * as evaluators from "./evaluators";
export * as providers from "./providers";

export const unrealPlugin: Plugin = {
    name: "unreal",
    description: "Unreal Agent with basic actions and evaluators",
    actions: [startPropertySearch, processPropertySearch, endPropertySearch],
    evaluators: [],
    providers: [propertySearchProvider],
};
