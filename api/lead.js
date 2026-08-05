/**
 * POST /api/lead — Bridge Dental marketing-site lead relay.
 *
 * Replaces the old FormSubmit relay. Every form on the site (early access,
 * contact, and the three pricing modals) posts JSON here; this function
 * forwards it to Resend as a plain-text email.
 *
 * Plain text only — no HTML template — because Outlook renders some HTML
 * lead emails blank. Every submitted field goes on its own line.
 *
 * No PHI is collected by these forms and none should be added here.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FROM = 'Bridge Dental Leads <leads@mail.bridgedental.ai>';
const TO = ['admin@bridgedental.ai', 'dds.sparkman@gmail.com'];
const DEFAULT_SUBJECT = 'New Bridge Dental submission';

// Honeypot: a hidden input real users never fill in.
const HONEYPOT_FIELD = 'company_website';

// Non-lead keys handled separately from the field dump.
const META_KEYS = new Set(['form_subject', 'source_page', HONEYPOT_FIELD]);

// Preferred display order + labels. Any field not listed here still gets
// emailed (after these), so adding a form input needs no change in this file.
const FIELD_LABELS = {
  first: 'First name',
  last: 'Last name',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  practice: 'Practice / organization',
  organization: 'Organization',
  role: 'Role / title',
  pms: 'Practice management software',
  size: 'Practice size',
  locations: 'Number of locations',
  newpatients: 'Monthly new-patient volume',
  tier: 'Plan tier',
  message: 'Message',
  challenges: 'Challenges / pain points',
  extra: 'Additional information',
};

function toText(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(', ');
  if (typeof value === 'object') return '';
  return String(value).trim();
}

/** Strip CR/LF so a submitted subject can't inject extra mail headers. */
function sanitizeSubject(value) {
  const cleaned = toText(value).replace(/[\r\n]+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, 200) : DEFAULT_SUBJECT;
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function readJsonBody(req) {
  // Vercel's Node runtime parses application/json into req.body. The manual
  // read is a fallback for anything that arrives unparsed.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function buildBody(payload, req) {
  const lines = [];
  const seen = new Set();

  for (const key of Object.keys(FIELD_LABELS)) {
    if (META_KEYS.has(key)) continue;
    seen.add(key);
    const value = toText(payload[key]);
    if (value) lines.push(`${FIELD_LABELS[key]}: ${value}`);
  }

  // Anything the form sent that isn't in the label map above.
  for (const key of Object.keys(payload)) {
    if (seen.has(key) || META_KEYS.has(key)) continue;
    const value = toText(payload[key]);
    if (value) lines.push(`${key}: ${value}`);
  }

  const sourcePage = toText(payload.source_page) || '(unknown)';
  const referrer = toText(req.headers.referer || req.headers.referrer) || '(none)';
  const userAgent = toText(req.headers['user-agent']) || '(none)';
  const now = new Date();

  return [
    'New submission from the Bridge Dental website.',
    '',
    ...lines,
    '',
    '---',
    `Source page: ${sourcePage}`,
    `Referrer: ${referrer}`,
    `User agent: ${userAgent}`,
    `Submitted: ${now.toISOString()} (${now.toLocaleString('en-US', { timeZone: 'America/Chicago' })} US Central)`,
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (err) {
    console.error('[lead] failed to read request body:', err);
    return res.status(400).json({ ok: false, error: 'Invalid request body' });
  }

  // Honeypot tripped — pretend it worked, send nothing.
  if (toText(payload[HONEYPOT_FIELD])) {
    console.warn('[lead] honeypot tripped, dropping submission');
    return res.status(200).json({ ok: true });
  }

  const first = toText(payload.first);
  const last = toText(payload.last);
  const name = toText(payload.name);
  const email = toText(payload.email);

  // The early-access and contact forms send first + last; the three pricing
  // modals send a single `name` field instead. Accept either shape rather
  // than 400-ing three working forms.
  const missing = [];
  if (!first && !name) missing.push('first');
  if (!last && !name) missing.push('last');
  if (!email) missing.push('email');
  if (missing.length) {
    return res.status(400).json({
      ok: false,
      error: `Missing required field(s): ${missing.join(', ')}`,
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[lead] RESEND_API_KEY is not set — cannot send lead email');
    return res.status(500).json({ ok: false, error: 'Email service is not configured' });
  }

  const message = {
    from: FROM,
    to: TO,
    subject: sanitizeSubject(payload.form_subject),
    text: buildBody(payload, req),
  };
  if (looksLikeEmail(email)) message.reply_to = email;

  let resendRes;
  let resendBody;
  try {
    resendRes = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    resendBody = await resendRes.text();
  } catch (err) {
    console.error('[lead] Resend request failed:', err);
    return res.status(502).json({ ok: false, error: 'Could not send the email' });
  }

  if (!resendRes.ok) {
    console.error(`[lead] Resend returned ${resendRes.status}: ${resendBody}`);
    return res.status(502).json({ ok: false, error: 'Could not send the email' });
  }

  console.log(`[lead] sent "${message.subject}" from ${toText(payload.source_page) || '(unknown)'}`);
  return res.status(200).json({ ok: true });
};
