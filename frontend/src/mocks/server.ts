import { setupServer } from 'msw/node';
import handlers, { handlers as namedHandlers } from './handlers';

// Setup server with handlers
export const server = setupServer(...namedHandlers);

export default server;
