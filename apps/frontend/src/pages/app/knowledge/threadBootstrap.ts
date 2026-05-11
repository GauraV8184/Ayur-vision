import {
  createKnowledgeChat,
  listKnowledgeChats,
  type KnowledgeChatThreadSummary,
} from "../../../services/api";

async function loadOrCreate(): Promise<KnowledgeChatThreadSummary[]> {
  const first = await listKnowledgeChats();
  let threads = first.data?.threads ?? [];
  if (threads.length > 0) return threads;

  await createKnowledgeChat();
  const second = await listKnowledgeChats();
  return second.data?.threads ?? [];
}

/** Serialize boot so React Strict Mode / double-mount doesn’t create two empty threads. */
let sharedBoot: Promise<KnowledgeChatThreadSummary[]> | null = null;

export function ensureKnowledgeThreads(): Promise<KnowledgeChatThreadSummary[]> {
  if (!sharedBoot) {
    sharedBoot = loadOrCreate().finally(() => {
      sharedBoot = null;
    });
  }
  return sharedBoot;
}
