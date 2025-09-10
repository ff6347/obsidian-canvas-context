import { setupServer } from "msw/node";
import { handlers } from "./handlers.ts";

// Create MSW server with our handlers
export const server = setupServer(...handlers);
