import { Plugin } from "@ai16z/eliza";
import { startOrder } from "./actions/startOrder.js";
import { pizzaOrderProvider } from "./providers/pizzaOrder.js";
import { endOrder } from "./actions/endOrder.js";
import { updateCustomer } from "./actions/updateCustomer.js";
import { updateOrder } from "./actions/updateOrder.js";
import { confirmOrder } from "./actions/confirmOrder.js";

export * as actions from "./actions/index.js";
export * as providers from "./providers/index.js";

export const dominosPlugin: Plugin = {
    name: "dominos",
    description: "Order a dominos pizza",
    actions: [startOrder, endOrder, updateCustomer, updateOrder, confirmOrder],
    providers: [pizzaOrderProvider],
};
