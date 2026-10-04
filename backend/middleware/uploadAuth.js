import { timingSafeEqual } from "node:crypto";

export const requireUploadAdmin = (req, res, next) => {
  const expectedToken = process.env.UPLOAD_ADMIN_TOKEN;
  if (!expectedToken) {
    return res.status(503).json({
      error: "PDF uploads are disabled until the upload admin token is configured."
    });
  }

  const authorization = req.get("authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  const suppliedToken = match?.[1] ?? "";
  const expectedBuffer = Buffer.from(expectedToken);
  const suppliedBuffer = Buffer.from(suppliedToken);

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      error: "A valid upload access key is required."
    });
  }

  return next();
};

export const requireSameOrigin = (req, res, next) => {
  const origin = req.get("origin");
  const host = req.get("host");

  if (!origin || !host) {
    return res.status(403).json({
      error: "This request must come from the Pagewise website."
    });
  }

  let requestOrigin;
  try {
    requestOrigin = new URL(`${req.protocol}://${host}`).origin;
  } catch {
    return res.status(403).json({
      error: "This request must come from the Pagewise website."
    });
  }

  if (origin !== requestOrigin) {
    return res.status(403).json({
      error: "This request must come from the Pagewise website."
    });
  }

  return next();
};
