import { connectToDatabase } from '@/database/mongoose';
import SystemConfig from '@/database/models/SystemConfig';

/** In-process cache so we don't hit MongoDB on every single request */
let cachedUrl: string | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Returns the live VORA agent URL.
 * Order: MongoDB config → VORA_AGENT_URL env → localhost fallback.
 */
export async function getVoraUrl(): Promise<string> {
  const now = Date.now();

  if (cachedUrl && now < cacheExpiry) return cachedUrl;

  try {
    await connectToDatabase();
    const doc = await SystemConfig.findOne({ key: 'VORA_AGENT_URL' }).lean();
    if (doc?.value) {
      cachedUrl  = doc.value as string;
      cacheExpiry = now + CACHE_TTL_MS;
      return cachedUrl;
    }
  } catch {
    // DB unavailable — fall through to env
  }

  return process.env.VORA_AGENT_URL || 'http://localhost:11434';
}

/** Called by the start-vora script to persist the new tunnel URL. */
export async function setVoraUrl(url: string): Promise<void> {
  await connectToDatabase();
  await SystemConfig.findOneAndUpdate(
    { key: 'VORA_AGENT_URL' },
    { key: 'VORA_AGENT_URL', value: url },
    { upsert: true, new: true }
  );
  // Bust cache
  cachedUrl  = url;
  cacheExpiry = Date.now() + CACHE_TTL_MS;
}
