import generated from './generated/catalog.json';
import { createHandler } from './handler';

export default createHandler(generated.puzzles, generated.schema);
