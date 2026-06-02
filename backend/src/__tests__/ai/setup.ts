import { beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

// mongodb-memory-server downloads the MongoDB binary the first time.
// Allow 60 s so a cold environment doesn't time out.
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// Wipe all collections between individual tests so state never leaks.
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const coll = collections[key];
    if (coll) await coll.deleteMany({});
  }
});
