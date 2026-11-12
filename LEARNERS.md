# Learner guide

Build an AI app that reads the assignment email text. **Send it to the API only if your own name appears in it.**

`POST https://<API_URL>/api/entries`
Headers: `Content-Type: application/json` (and `X-API-Key: <key>` if the organisers gave you one)
Body: `{"text": "<full email text>", "sender": "<Your Full Name>"}`

- 201 = stored, and it shows up on the dashboard.
- 422 = your name was not found in the text, so it was rejected.

Plain-text alternative: `POST /api/text?sender=Your+Name` with the raw text as the body.
