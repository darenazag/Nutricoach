import { AiCacheEntry, type AiCacheEntryDocument } from '../models/index.js';

export async function findCacheByKey(
  cacheKey: string,
): Promise<AiCacheEntryDocument | null> {
  return AiCacheEntry.findOne({ cacheKey }).lean<AiCacheEntryDocument | null>().exec();
}

export async function upsertCacheEntry(
  data: Partial<AiCacheEntryDocument> & { cacheKey: string },
): Promise<AiCacheEntryDocument | null> {
  return AiCacheEntry.findOneAndUpdate(
    { cacheKey: data.cacheKey },
    { $set: data, $setOnInsert: { hitCount: 0 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  )
    .lean<AiCacheEntryDocument | null>()
    .exec();
}

export async function incrementCacheHit(
  cacheKey: string,
): Promise<AiCacheEntryDocument | null> {
  return AiCacheEntry.findOneAndUpdate(
    { cacheKey },
    { $inc: { hitCount: 1 } },
    { returnDocument: 'after' },
  )
    .lean<AiCacheEntryDocument | null>()
    .exec();
}
