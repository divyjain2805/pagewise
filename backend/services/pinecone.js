import { Pinecone } from "@pinecone-database/pinecone";

const SHARED_NAMESPACE = "pagewise-shared";

let client;
let index;
let replacementQueue = Promise.resolve();

const getPineconeClient = () => {
  if (client) {
    return client;
  }

  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "PINECONE_API_KEY is not configured"
    );
  }

  client = new Pinecone({ apiKey });
  return client;
};

export const getPineconeIndex = () => {
  if (index) {
    return index;
  }

  const indexName =
    process.env.PINECONE_INDEX_NAME;

  if (!indexName) {
    throw new Error(
      "PINECONE_INDEX_NAME is not configured"
    );
  }

  index = getPineconeClient().index({
    name: indexName,
    namespace: SHARED_NAMESPACE
  });
  return index;
};

export const searchChunks = async (queryEmbedding) => {
  const index = getPineconeIndex();
  const results =
    await index.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true
    });

  return results.matches;
};

export const getCurrentDocumentStatus = async () => {
  const stats = await getPineconeIndex().describeIndexStats();
  const vectorCount = stats.namespaces?.[SHARED_NAMESPACE]?.recordCount ?? 0;

  return {
    hasDocument: vectorCount > 0,
    vectorCount
  };
};

export const replaceCurrentDocument = (records) => {
  const replacement = replacementQueue.then(async () => {
    if (!records.length) {
      throw new Error("Cannot replace the current PDF with no vector records");
    }

    const currentIndex = getPineconeIndex();
    const stats = await currentIndex.describeIndexStats();
    const currentVectorCount =
      stats.namespaces?.[SHARED_NAMESPACE]?.recordCount ?? 0;

    if (currentVectorCount > 0) {
      await currentIndex.deleteAll();
    }

    await currentIndex.upsert({ records });
  });

  replacementQueue = replacement.then(
    () => undefined,
    () => undefined
  );
  return replacement;
};