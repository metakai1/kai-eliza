import { Provider } from "@ai16z/eliza";
import { PropertySearchManager, SearchSession } from "./searchManager";
import { LandPlotMemory, LandSearchParams } from "./types";


export const propertySearchProvider: Provider = {
    get: async (runtime, message) => {
        const searchManager = new PropertySearchManager(runtime);

        const session = await searchManager.getSearchSession(message.userId);

        if (!session || session.status === "INACTIVE") {
            return "\nThe user has not started a Wilder World property search session.\n";
        }

        let context = `\n# Wilder World propery search session:\n
The user is currently searching for Wilder World properties. Current property search session:\n`;

        if (session.lastQuery) {
            context += `Last search: "${session.lastQuery}"\n`;
        }

        if (session.results.length > 0) {
            context += `Found ${session.results.length} properties in last search.\n`;
            const neighborhoods = [...new Set(session.results.map(r => r.content.metadata.neighborhood))];
            context += `Properties found in: ${neighborhoods.join(", ")}\n`;

            const zoningTypes = [...new Set(session.results.map(r => r.content.metadata.zoning))];
            context += `Zoning types: ${zoningTypes.join(", ")}\n`;
        }

        if (Object.keys(session.filters).length > 0) {
            context += `\nActive filters:\n`;
            const filters = session.filters;

            if (filters.neighborhoods?.length) {
                context += `- Neighborhoods: ${filters.neighborhoods.join(", ")}\n`;
            }
            if (filters.zoningTypes?.length) {
                context += `- Zoning types: ${filters.zoningTypes.join(", ")}\n`;
            }
            if (filters.plotSizes?.length) {
                context += `- Plot sizes: ${filters.plotSizes.join(", ")}\n`;
            }
            if (filters.buildingTypes?.length) {
                context += `- Building types: ${filters.buildingTypes.join(", ")}\n`;
            }
            if (filters.distances?.ocean) {
                context += `- Max ocean distance: ${filters.distances.ocean.maxMeters}m\n`;
            }
            if (filters.distances?.bay) {
                context += `- Max bay distance: ${filters.distances.bay.maxMeters}m\n`;
            }
            if (filters.building?.floors) {
                const { min, max } = filters.building.floors;
                context += `- Floors: ${min || '0'}-${max || 'unlimited'}\n`;
            }
            if (filters.rarity?.rankRange) {
                const { min, max } = filters.rarity.rankRange;
                context += `- Rank range: ${min || '0'}-${max || 'unlimited'}\n`;
            }
        }

        return context;
    }
};