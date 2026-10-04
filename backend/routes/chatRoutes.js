import express from "express";

import { createEmbedding } from "../services/embeddings.js";

import { searchChunks } from "../services/pinecone.js";

import { generateAnswer } from "../services/llm.js";


const router = express.Router();

router.post("/chat", async (req, res) => {
  let generatingAnswer = false;
  const question =
    typeof req.body?.question === "string"
      ? req.body.question.trim()
      : "";

  if (!question) {
    return res.status(400).json({
      error: "A non-empty question is required"
    });
  }
  if (question.length > 2000) {
    return res.status(400).json({
      error: "Questions must be 2,000 characters or fewer."
    });
  }

  try {
    const queryEmbedding = await createEmbedding(question);
    const matches = await searchChunks(queryEmbedding);

    const context = matches
      .map(match => match.metadata?.text)
      .filter(text => typeof text === "string" && text.trim())
      .join("\n\n");

    let answer = "I could not find that information in the uploaded PDF.";
    if (context) {
      generatingAnswer = true;
      answer = await generateAnswer(context, question);
    }

    return res.json({
      success: true,
      totalMatches: matches.length,
      matches,
      answer
    });
  } catch (error) {
    console.error("Could not answer chat request:", error);
    if (generatingAnswer && error?.status === 401) {
      return res.status(503).json({
        error: "The chat provider rejected its API key. Check GROQ_API_KEY in the backend environment and restart the server."
      });
    }
    return res.status(500).json({
      error: "Could not answer that question. Please try again later."
    });
  }
});

export default router;