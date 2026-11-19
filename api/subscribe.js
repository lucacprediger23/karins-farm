// Karin's Farm waitlist: saves one record per email address in a private Vercel Blob store.
// Only what is needed is kept: the email, that consent was given, the consent wording and the time.
// Works two ways:
//   - from the page's script (JSON in, JSON out), which shows the result next to the form;
//   - as a plain HTML form (when the script can't run): it then answers with a page, or sends the
//     visitor to /thanks.
import { put } from '@vercel/blob';
import { createHash } from 'node:crypto';

const CONSENT_VERSION = '2026-10-24';
const CONSENT_TEXT = "I'm 16 or older and I agree that Karin's Farm may email me when the game is available. I can unsubscribe at any time.";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MESSAGES = {
  email: 'That email doesn’t look right. Check it and try again.',
  consent: 'Please tick the box to confirm you’re 16 or older and agree to be emailed, then try again.',
  save: 'Something went wrong and your email wasn’t saved. Please try again in a moment.'
};

// A small page for plain-form submissions that went wrong.
function errorPage(code) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not saved yet · Karin’s Farm</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="/assets/base.css"></head>
<body><main class="doc wl-result" id="doc">
<p class="kicker">Waitlist</p><h1>Not saved yet</h1>
<p class="lead" role="alert">${MESSAGES[code]}</p>
<p><a class="hud-btn" href="/waitlist#form">Back to the form</a></p>
<p class="small">Questions? Write to <a href="mailto:lucacprediger@gmail.com">lucacprediger@gmail.com</a>.</p>
</main></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }

  const isForm = String(req.headers['content-type'] || '').includes('application/x-www-form-urlencoded');
  let body = req.body;
  if (typeof body === 'string') {
    try { body = isForm ? Object.fromEntries(new URLSearchParams(body)) : JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const fail = (status, code) => {
    if (!isForm) return res.status(status).json({ ok: false, error: code });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(errorPage(code));
  };
  const done = () => {
    if (!isForm) return res.status(200).json({ ok: true });
    res.statusCode = 303; res.setHeader('Location', '/thanks'); return res.end();
  };

  // a field people can't see: bots fill it in, people don't
  if (body.website) return done();

  const email = String(body.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return fail(400, 'email');
  // the script sends true; a plain form sends the checkbox as "on"
  const consent = body.consent === true || body.consent === 'on' || body.consent === 'true';
  if (!consent) return fail(400, 'consent');

  const id = createHash('sha256').update(email).digest('hex').slice(0, 40);   // one file per address, no duplicates
  const record = { email, consent: true, consentText: CONSENT_TEXT, consentVersion: CONSENT_VERSION, signedUpAt: new Date().toISOString(), source: isForm ? 'website-form' : 'website' };

  try {
    await put(`waitlist/${id}.json`, JSON.stringify(record), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  } catch (err) {
    console.error('waitlist: save failed', err && err.message);
    return fail(500, 'save');
  }
  return done();
}
