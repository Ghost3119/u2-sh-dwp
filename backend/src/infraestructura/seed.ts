import { db } from './database';

db.init();
db.seed();

export { db };
