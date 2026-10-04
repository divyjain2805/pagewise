import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "node:url";
import {
    getConfiguredFrontendOrigins,
    isAllowedOrigin,
    requireSameOrigin,
    requireUploadAdmin
} from "./middleware/uploadAuth.js";
dotenv.config();
import uploadRoutes
from "./routes/uploadRoutes.js";

import chatRoutes
from "./routes/chatRoutes.js";

const app = express();
app.disable("x-powered-by");
const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");
}
app.set("trust proxy", trustedProxyHops);
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
});

const configuredFrontendOrigins = getConfiguredFrontendOrigins();
app.use((req, res, next) => {
    const origin = req.get("origin");
    res.vary("Origin");

    if (origin) {
        let requestOrigin;
        try {
            requestOrigin = new URL(`${req.protocol}://${req.get("host")}`).origin;
        } catch {
            return res.status(403).json({ error: "This website origin is not allowed." });
        }

        if (!isAllowedOrigin(origin, requestOrigin, configuredFrontendOrigins)) {
            return res.status(403).json({ error: "This website origin is not allowed." });
        }
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    if (req.method === "OPTIONS") {
        if (!origin) {
            return res.status(403).end();
        }
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        res.setHeader("Access-Control-Max-Age", "600");
        return res.status(204).end();
    }

    next();
});

const frontendDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../frontend"
);

app.use(express.json({ limit: "16kb" }));

const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many upload attempts. Please try again later." }
});
const chatRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many chat requests. Please try again later." }
});
const documentStatusRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many status requests. Please try again later." }
});

app.get("/api/health", (req, res) => {
    res.json({
        message: "RAG API Running"
    });
});

app.use("/api/upload", uploadRateLimit, requireUploadAdmin, requireSameOrigin);
app.use("/api/chat", chatRateLimit);
app.use("/api/test-embedding", chatRateLimit);
app.use("/api/document-status", documentStatusRateLimit);
app.use("/api", uploadRoutes);
app.use("/api", chatRoutes);
app.use(express.static(frontendDirectory));

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    console.error("Request failed:", error.message);
    if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "PDF files must be 20 MB or smaller." });
    }
    if (error.message === "Only PDF files are allowed.") {
        return res.status(415).json({ error: error.message });
    }
    if (error.status === 400) {
        return res.status(400).json({ error: "The request body is invalid." });
    }

    return res.status(error.status === 413 ? 413 : 500).json({
        error: "The request could not be processed."
    });
});

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {

    console.log(`Server running on port ${port}`);
});