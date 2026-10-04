import { GoogleGenAI } from "@google/genai";

const EMBEDDING_DIMENSION = 768;

let ai;

const getAi = () => {
    if (ai) {
        return ai;
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_API_KEY is not configured");
    }

    ai = new GoogleGenAI({ apiKey });
    return ai;
};

export const createEmbedding = async (text) => {

    const response = await getAi().models.embedContent({
        model: "gemini-embedding-2",
        contents: text,
        config: {
            outputDimensionality: EMBEDDING_DIMENSION
        }
    });

    const values = response.embeddings?.[0]?.values;
    if (!values?.length) {
        throw new Error("Embedding API returned no embedding values");
    }
    if (values.length !== EMBEDDING_DIMENSION) {
        throw new Error(
            `Expected ${EMBEDDING_DIMENSION}-dimensional embedding, received ${values.length}`
        );
    }

    return values;
};