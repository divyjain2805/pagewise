import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import {
  requireSameOrigin,
  requireUploadAdmin
} from "../middleware/uploadAuth.js";

const originalToken = process.env.UPLOAD_ADMIN_TOKEN;
const TEST_TOKEN = "test-only-upload-admin-token";

beforeEach(() => {
  process.env.UPLOAD_ADMIN_TOKEN = TEST_TOKEN;
});

after(() => {
  if (originalToken === undefined) {
    delete process.env.UPLOAD_ADMIN_TOKEN;
  } else {
    process.env.UPLOAD_ADMIN_TOKEN = originalToken;
  }
});

const runUploadAuth = authorization => {
  const request = { get: name => name.toLowerCase() === "authorization" ? authorization : undefined };
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
  let nextCalled = false;

  requireUploadAdmin(request, response, () => {
    nextCalled = true;
  });

  return { request, response, nextCalled };
};

test("allows upload with the configured admin bearer token", () => {
  const { nextCalled, response } = runUploadAuth(`Bearer ${TEST_TOKEN}`);
  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, 200);
});

test("rejects a missing or incorrect admin bearer token", () => {
  const missing = runUploadAuth(undefined);
  const incorrect = runUploadAuth("Bearer incorrect-token");
  assert.equal(missing.response.statusCode, 401);
  assert.equal(incorrect.response.statusCode, 401);
  assert.equal(missing.nextCalled, false);
  assert.equal(incorrect.nextCalled, false);
});

test("fails closed when the admin token is not configured", () => {
  delete process.env.UPLOAD_ADMIN_TOKEN;
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const { response, nextCalled } = runUploadAuth(`Bearer ${TEST_TOKEN}`);
    assert.equal(response.statusCode, 503);
    assert.equal(nextCalled, false);
  } finally {
    console.error = originalConsoleError;
  }
});

test("allows same-origin uploads and rejects cross-origin or origin-less requests", () => {
  const runOriginCheck = origin => {
    const response = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      }
    };
    const request = {
      protocol: "https",
      get(name) {
        if (name.toLowerCase() === "origin") return origin;
        if (name.toLowerCase() === "host") return "app.example.com";
        return undefined;
      }
    };
    let nextCalled = false;

    requireSameOrigin(request, response, () => {
      nextCalled = true;
    });

    return { response, nextCalled };
  };

  assert.equal(runOriginCheck("https://app.example.com").nextCalled, true);
  assert.equal(runOriginCheck("https://attacker.example").response.statusCode, 403);
  assert.equal(runOriginCheck(undefined).response.statusCode, 403);
});
