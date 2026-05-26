import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo } from '../../../config/mongo.js';
import { AiPromptTemplate } from '../models/index.js';
import { defaultAiPromptTemplates } from '../prompts/index.js';

export async function seedAiPromptTemplates(): Promise<void> {
  const total = defaultAiPromptTemplates.length;
  console.log(`[seed:ai-prompts] Processing ${total} prompt template(s)...`);

  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  for (const tpl of defaultAiPromptTemplates) {
    const result = await AiPromptTemplate.updateOne(
      { promptKey: tpl.promptKey, version: tpl.version },
      {
        $set: {
          type: tpl.type,
          systemPrompt: tpl.systemPrompt,
          userPromptTemplate: tpl.userPromptTemplate,
          outputSchema: tpl.outputSchema,
          isActive: tpl.isActive,
          notes: tpl.notes,
        },
      },
      { upsert: true },
    );

    let action: 'CREATED' | 'UPDATED' | 'UNCHANGED';
    if (result.upsertedCount > 0) {
      action = 'CREATED';
      createdCount += 1;
    } else if (result.modifiedCount > 0) {
      action = 'UPDATED';
      updatedCount += 1;
    } else {
      action = 'UNCHANGED';
      unchangedCount += 1;
    }

    console.log(
      `[seed:ai-prompts] ${action.padEnd(9)} ${tpl.promptKey}@${tpl.version} (${tpl.type})`,
    );
  }

  console.log(
    `[seed:ai-prompts] Done. created=${createdCount}, updated=${updatedCount}, unchanged=${unchangedCount}, total=${total}`,
  );
}

async function main(): Promise<void> {
  try {
    await connectMongo();
    await seedAiPromptTemplates();
    console.log('[seed:ai-prompts] OK');
  } catch (err) {
    console.error('[seed:ai-prompts] FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[seed:ai-prompts] Mongo disconnected.');
    }
  }
}

// Entry-point detection compatible with CJS and tsx.
// Matches when argv[1] is the seeder script (ts or compiled js).
const entryPoint = process.argv[1] ?? '';
const isMain = /seedAiPromptTemplates\.(ts|js)$/.test(entryPoint);

if (isMain) {
  main().catch((err) => {
    console.error('[seed:ai-prompts] FATAL:', err);
    process.exit(1);
  });
}
