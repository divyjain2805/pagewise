import express from "express";
import multer from "multer";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = express.Router();
import {
    getCurrentDocumentStatus,
    replaceCurrentDocument
} from "../services/pinecone.js";

import { extractTextFromPdf } from "../services/pdfParser.js";

import { createChunks } from "../services/chunking.js";

import { createEmbedding } from "../services/embeddings.js";

const uploadDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../uploads"
);
await mkdir(uploadDirectory, { recursive: true });

const upload = multer({
    dest: uploadDirectory,
    limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith(".pdf")) {
            return callback(new Error("Only PDF files are allowed."));
        }
        return callback(null, true);
    }
});

router.get("/document-status", async (req, res) => {
    try {
        return res.json(await getCurrentDocumentStatus());
    } catch (error) {
        console.error("Could not retrieve document status:", error);
        return res.status(500).json({
            error: "Could not retrieve document status."
        });
    }
});


router.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: "No PDF file was uploaded"
            });
        }

        const text =
            await extractTextFromPdf(
                req.file.path
            );

        const normalizedText = text.trim();
        if (!normalizedText) {
            return res.status(422).json({
                error: "No extractable text was found in the PDF. Scanned PDFs require OCR before they can be indexed."
            });
        }

        const chunks =
            createChunks(normalizedText);

        if (chunks.length === 0) {
            return res.status(422).json({
                error: "The PDF did not produce any text chunks to index."
            });
        }

        const vectors = [];

        for (let i = 0; i < chunks.length; i++) {

            const embedding = await createEmbedding(chunks[i]);

            vectors.push({
                id: `chunk-${i}`,

                values: embedding,

                metadata: {
                    text: chunks[i]
                }
            });
        }

        await replaceCurrentDocument(vectors);


        return res.json({
            success: true,
            characters: text.length,
            preview: text.slice(0, 300),
            totalCharacters: text.length,
            totalChunks: chunks.length,
            firstChunk: chunks[0],
            vectorsStored: vectors.length,
            replacedPreviousPdf: true
        });

    } catch (error) {
        console.error("Could not process uploaded PDF:", error);
        return res.status(500).json({
            error: "Could not process the PDF. Check the file and try again."
        });

    } finally {
        if (req.file?.path) {
            try {
                await unlink(req.file.path);
            } catch (error) {
                console.error("Failed to remove temporary PDF upload:", error);
            }
        }
    }

}
);

router.get("/test-embedding", async (req, res) => {

    try {

        const embedding =
            await createEmbedding(
                "Machine learning and AI"
            );

        res.json({
            dimension: embedding.length
        });

    } catch (error) {

        res.status(500).json({
            error: "Could not create an embedding. Please try again later."
        });

 }

});






export default router;