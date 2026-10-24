// Karin's Farm waitlist: saves one record per email address in a private Vercel Blob store.
// Only what is needed is kept: the email, that consent was given, the consent wording and the time.
import { put } from '@vercel/blob';
import { createHash } from 'node:crypto';

const CONSENT_VERSION = '2026-10-24';
const CONSENT_TEXT = "I'm 16 or older and I agree that Karin's Farm may email me when the game is available. I can unsubscribe at any time.";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // a field people can't see: bots fill it in, people don't
  if (body.website) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'email' });
  if (body.consent !== true) return res.status(400).json({ ok: false, error: 'consent' });

  const id = createHash('sha256').update(email).digest('hex').slice(0, 40);   // one file per address, no duplicates
  const record = { email, consent: true, consentText: CONSENT_TEXT, consentVersion: CONSENT_VERSION, signedUpAt: new Date().toISOString(), source: 'website' };

  try {
    await put(`waitlist/${id}.json`, JSON.stringify(record), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  } catch (err) {
    console.error('waitlist: save failed', err && err.message);
    return res.status(500).json({ ok: false, error: 'save' });
  }
  return res.status(200).json({ ok: true });
}
