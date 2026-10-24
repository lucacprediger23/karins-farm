// Download the waitlist as a CSV file. Protected by a secret key kept in the project settings.
// Usage: https://<your-site>/api/export?key=<WAITLIST_EXPORT_KEY>
import { list, get } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const key = process.env.WAITLIST_EXPORT_KEY;
  if (!key || !req.query.key || !same(req.query.key, key)) return res.status(401).send('Unauthorized');

  const rows = [];
  let cursor;
  do {
    const page = await list({ prefix: 'waitlist/', cursor, limit: 1000 });
    for (const b of page.blobs) {
      const r = await get(b.pathname, { access: 'private' });
      if (!r || r.statusCode !== 200) continue;
      try { rows.push(JSON.parse(await new Response(r.stream).text())); } catch {}
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  rows.sort((a, b) => String(a.signedUpAt).localeCompare(String(b.signedUpAt)));
  const csv = ['email,signed_up_at,consent_version,consent_text', ...rows.map(r => [r.email, r.signedUpAt, r.consentVersion, r.consentText].map(cell).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="karins-farm-waitlist.csv"');
  return res.status(200).send('﻿' + csv);
}
