# Pagewise

Pagewise is a PDF question-answering app. It extracts text from an uploaded PDF, indexes chunks in Pinecone, and answers questions using Gemini embeddings and Groq.

## Requirements

- Node.js 20 or newer
- A Pinecone index configured for 768-dimensional vectors
- API keys for Google Gemini, Pinecone, and Groq

## Local setup

1. Copy `backend/.env.example` to `backend/.env`, generate a strong random `UPLOAD_ADMIN_TOKEN`, and fill in the remaining values.
2. Install backend dependencies:

   ```sh
   cd backend
   npm ci
   ```

3. Start the app:

   ```sh
   npm run dev
   ```

4. Open <http://localhost:5000>.

For production mode, use `npm start` instead of `npm run dev`.

## Environment variables

| Variable | Description |
| --- | --- |
| `GOOGLE_API_KEY` | Google AI Studio API key used for embeddings |
| `GROQ_API_KEY` | Groq API key used to generate answers |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX_NAME` | Name of the 768-dimensional Pinecone index |
| `UPLOAD_ADMIN_TOKEN` | Secret bearer token required to upload or replace the shared PDF |
| `FRONTEND_ORIGINS` | Comma-separated exact browser origins allowed to call the API, such as `https://your-site.vercel.app` |
| `PORT` | Optional HTTP port; defaults to `5000` |
| `TRUST_PROXY_HOPS` | Optional trusted proxy hop count; leave at `0` unless configured for your host |

Keep real keys in the host's secret/environment-variable settings. Never commit `.env` or put provider keys in frontend code.

Generate a random upload token (for example, `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`), then set it as `UPLOAD_ADMIN_TOKEN` in `backend/.env` locally or in the hosting provider's secret settings. The upload form asks the site owner for this key; it is sent only to the same-origin backend and is not saved in browser storage. If the token is not configured, uploads are disabled. Do not share this key with visitors.

If deploying behind a reverse proxy, configure `TRUST_PROXY_HOPS` to the exact number of proxy hops in front of Node. Do not enable trust for arbitrary proxy addresses or user-supplied forwarding headers.

## Hosting and GitHub

The backend can be deployed to Render from the included `render.yaml` Blueprint. Set the provider API keys, upload token, and the exact Vercel site origin in Render's environment settings. Deploy the `frontend` directory as a Vercel project; set `PAGEWISE_API_URL` to the Render service's base URL in the Vercel project environment settings, then redeploy. The frontend build writes that public API URL into a generated config file; do not put provider secrets in Vercel or frontend files.

The backend accepts browser API requests from its own origin and the exact origins listed in `FRONTEND_ORIGINS`. For a Vercel production domain and a custom domain, list each origin as a comma-separated value (scheme and host only, with no path). GitHub Pages cannot run the Node.js API or process PDFs.

The app has one shared Pinecone namespace. Each successful PDF upload replaces the document used by all visitors, so only upload documents intended to be shared. Uploads are restricted to the site owner using the `UPLOAD_ADMIN_TOKEN`; visitors can still chat with the current shared PDF.

## Security notes

- Uploaded PDFs are processed temporarily and removed from the server's upload staging directory after processing.
- PDF replacement requires the `UPLOAD_ADMIN_TOKEN`; uploads require a configured, allowed frontend origin, public chat and uploads are rate-limited, upload size is capped at 20 MB, and cross-origin API access is restricted to configured origins.
- Chat and upload endpoints use paid/limited third-party API services; configure provider spending limits and monitor usage before exposing the app publicly.
- Do not publish credentials, private PDFs, `.env` files, or generated uploads.

## Tests

Run the backend unit tests with `npm test`.
