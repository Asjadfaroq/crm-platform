import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateApiWebhook } from '../store/slices/workspaceSlice';
import toast from 'react-hot-toast';

/* ─── tiny syntax-highlighter style code block ─── */
const CodeBlock = ({ code, language = 'javascript' }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div style={{
            position: 'relative',
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 10,
            marginBottom: 16,
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px',
                borderBottom: '1px solid #1e293b',
                background: '#0a0f1c',
                borderRadius: '10px 10px 0 0',
            }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    {language}
                </span>
                <button
                    onClick={handleCopy}
                    style={{
                        background: copied ? '#10b981' : '#1e293b',
                        border: 'none', borderRadius: 6, padding: '3px 10px',
                        color: copied ? '#fff' : '#94a3b8', fontSize: '0.72rem',
                        cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    {copied ? '✓ Copied' : '📋 Copy'}
                </button>
            </div>
            <pre style={{
                margin: 0, padding: '16px',
                overflowX: 'auto',
                fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
                fontSize: '0.82rem',
                lineHeight: 1.7,
                color: '#e2e8f0',
                whiteSpace: 'pre',
            }}>
                <code>{code}</code>
            </pre>
        </div>
    );
};

/* ─── section badge ─── */
const Badge = ({ label, color = '#6366f1' }) => (
    <span style={{
        display: 'inline-block',
        background: color + '22',
        color: color,
        border: `1px solid ${color}44`,
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
    }}>{label}</span>
);

/* ─── step number ─── */
const Step = ({ n, title, children }) => (
    <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <div style={{
            flexShrink: 0,
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.85rem', color: '#fff',
        }}>{n}</div>
        <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>{title}</div>
            {children}
        </div>
    </div>
);

/* ─── field table ─── */
const FieldTable = ({ rows }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: 16 }}>
        <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Field', 'Type', 'Required', 'Description'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                ))}
            </tr>
        </thead>
        <tbody>
            {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 ? 'var(--bg-hover, rgba(255,255,255,0.02))' : 'transparent' }}>
                    <td style={{ padding: '7px 10px' }}><code style={{ fontFamily: 'monospace', color: '#818cf8', fontSize: '0.8rem' }}>{r.field}</code></td>
                    <td style={{ padding: '7px 10px', color: '#34d399', fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.type}</td>
                    <td style={{ padding: '7px 10px' }}>{r.required ? <Badge label="required" color="#ef4444" /> : <Badge label="optional" color="#64748b" />}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>{r.desc}</td>
                </tr>
            ))}
        </tbody>
    </table>
);

/* ══════════════════════════════════════════════ */
export default function ApiWebhookPage() {
    const dispatch = useDispatch();
    const { currentWorkspace } = useSelector((s) => s.workspace);
    const { user } = useSelector((s) => s.auth);

    const [tab, setTab] = useState('guide');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentWorkspace?.webhookUrl) setWebhookUrl(currentWorkspace.webhookUrl);
    }, [currentWorkspace]);

    const myRole = currentWorkspace?.members?.find(
        (m) => (m.user?._id || m.user) === user?.id
    )?.role;

    if (!currentWorkspace || myRole !== 'admin') {
        return (
            <div className="page-content">
                <p style={{ color: 'var(--text-muted)' }}>Access denied — admins only.</p>
            </div>
        );
    }

    const apiKey = currentWorkspace.apiKey || '—';
    const maskedKey = apiKey.length > 12
        ? apiKey.slice(0, 8) + '•'.repeat(apiKey.length - 12) + apiKey.slice(-4)
        : apiKey;
    const workspaceId = currentWorkspace._id || '<your-workspace-id>';
    const BASE = 'https://your-crm-api.com';

    /* ── code samples ── */
    const samplePublicFetch = `// ✅ Public submission — no login needed, just API key
fetch("${BASE}/api/public/leads", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey === '—' ? 'YOUR_API_KEY' : apiKey}",
    "x-workspace-id": "${workspaceId}"
  },
  body: JSON.stringify({
    name: "Jane Doe",
    mobile: "+1-555-0100",
    amount: 5000,
    sourceLink: "https://mywebsite.com/contact"
  })
})
.then(res => res.json())
.then(data => console.log("Lead created:", data))
.catch(err => console.error(err));`;

    const sampleReactForm = `import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", mobile: "", amount: "" });
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("${BASE}/api/public/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "${apiKey === '—' ? 'YOUR_API_KEY' : apiKey}",
          "x-workspace-id": "${workspaceId}"
        },
        body: JSON.stringify({
          name: form.name,
          mobile: form.mobile,
          amount: form.amount,
          sourceLink: window.location.href
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("success");
      setForm({ name: "", mobile: "", amount: "" });
    } catch (err) {
      setStatus("error");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Full Name" value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      <input placeholder="Phone Number" value={form.mobile}
        onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} required />
      <input placeholder="Budget / Amount (e.g. 1000-100,000)" type="text" value={form.amount}
        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Submitting..." : "Submit Enquiry"}
      </button>
      {status === "success" && <p style={{color:"green"}}>✓ Enquiry submitted!</p>}
      {status === "error"   && <p style={{color:"red"}}>✗ Submission failed.</p>}
    </form>
  );
}`;

    const sampleWebhookHandler = `// Express.js — receive webhook events from Mini CRM
const express = require("express");
const app = express();
app.use(express.json());

app.post("/webhook/crm", (req, res) => {
  const event = req.body;

  switch (event.event) {
    case "lead.created":
      console.log("New lead:", event.data);
      // → Send welcome email, add to Slack, etc.
      break;
    case "lead.updated":
      console.log("Lead updated:", event.data);
      break;
    case "lead.status_changed":
      console.log(\`Status: \${event.data.oldStatus} → \${event.data.newStatus}\`);
      break;
    default:
      console.log("Unknown event:", event.event);
  }

  res.status(200).json({ received: true });
});

app.listen(3001, () => console.log("Webhook server running on :3001"));`;

    const sampleCurl = `# Submit a lead via cURL
curl -X POST "${BASE}/api/public/leads" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey === '—' ? 'YOUR_API_KEY' : apiKey}" \\
  -H "x-workspace-id: ${workspaceId}" \\
  -d '{
    "name": "John Smith",
    "mobile": "+92-300-1234567",
    "amount": 2500,
    "sourceLink": "https://mysite.com/enquiry"
  }'`;

    const sampleVerifyMobile = [
        '// Step 1: Submit lead and save the returned _id',
        `const submitRes = await fetch("${BASE}/api/public/leads", {`,
        '  method: "POST",',
        '  headers: {',
        '    "Content-Type": "application/json",',
        `    "x-api-key": "${apiKey === '—' ? 'YOUR_API_KEY' : apiKey}",`,
        `    "x-workspace-id": "${workspaceId}"`,
        '  },',
        '  body: JSON.stringify({ name: "John Smith", mobile: "+923001234567", amount: "5000" })',
        '});',
        'const { lead } = await submitRes.json();',
        'const leadId = lead._id;  // ← save this for the verify step',
        '',
        '// Step 2: After user confirms OTP, call verify-mobile',
        '// No request body needed — just the lead _id in the URL',
        `const verifyRes = await fetch(\`${BASE}/api/public/leads/\${leadId}/verify-mobile\`, {`,
        '  method: "PATCH",',
        '  headers: {',
        `    "x-api-key": "${apiKey === '—' ? 'YOUR_API_KEY' : apiKey}",`,
        `    "x-workspace-id": "${workspaceId}"`,
        '  }',
        '});',
        'const result = await verifyRes.json();',
        'console.log(result);',
        '// → { message: "Mobile verified successfully", lead: { _id: "...", verified_mobile: true } }',
    ].join('\n');

    const handleSaveWebhook = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await dispatch(updateApiWebhook({ workspaceId: currentWorkspace._id, webhookUrl })).unwrap();
            toast.success('Webhook URL saved');
        } catch (err) {
            toast.error(err || 'Failed to save');
        } finally { setSaving(false); }
    };

    const handleRegenerateKey = async () => {
        if (!confirm('Regenerate API key? The old key will stop working immediately.')) return;
        try {
            await dispatch(updateApiWebhook({ workspaceId: currentWorkspace._id, regenerateApiKey: true })).unwrap();
            toast.success('API key regenerated');
        } catch (err) { toast.error(err || 'Failed to regenerate'); }
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(apiKey);
        toast.success('API key copied!');
    };

    const handleCopyWorkspaceId = () => {
        navigator.clipboard.writeText(workspaceId);
        toast.success('Workspace ID copied!');
    };

    /* ── tabs ── */
    const TABS = [
        { id: 'guide', label: '📖 Integration Guide' },
        { id: 'keys', label: '🔑 API Keys' },
        { id: 'webhook', label: '🔗 Webhooks' },
    ];

    const tabStyle = (id) => ({
        padding: '9px 20px',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
        transition: 'all 0.18s',
        background: tab === id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
        color: tab === id ? '#fff' : 'var(--text-muted)',
    });

    return (
        <div className="page-content">
            <div style={{ maxWidth: 820 }}>

                {/* ── Page Header ── */}
                <div style={{
                    background: 'linear-gradient(135deg, #6366f122 0%, #8b5cf611 100%)',
                    border: '1px solid #6366f133',
                    borderRadius: 16, padding: '24px 28px', marginBottom: 28,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                        }}>⚡</div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>API & Webhooks</h2>
                            <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Connect your website or app to Mini CRM and push leads automatically
                                &nbsp;·&nbsp;<strong style={{ color: '#f59e0b' }}>Admin only</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Tab Nav ── */}
                <div style={{
                    display: 'flex', gap: 6, marginBottom: 24,
                    background: 'var(--bg-hover, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12, padding: 6,
                }}>
                    {TABS.map(t => (
                        <button key={t.id} style={tabStyle(t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
                    ))}
                </div>

                {/* ════════════════════════════════════════════
                    TAB: INTEGRATION GUIDE
                ════════════════════════════════════════════ */}
                {tab === 'guide' && (
                    <div>
                        {/* Overview card */}
                        <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '4px solid #6366f1' }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>How it works</div>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                                Your external website (React, Vue, plain HTML, etc.) sends a <strong>POST</strong> request to
                                the Mini CRM public endpoint. No user login is needed — just your <strong>API key</strong> and
                                <strong> Workspace ID</strong>. The lead is created instantly and appears in your CRM dashboard.
                            </p>
                        </div>

                        {/* Quick-ref endpoint */}
                        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <Badge label="POST" color="#10b981" />
                                <code style={{
                                    fontFamily: 'monospace', fontSize: '0.88rem',
                                    background: '#10b98111', color: '#10b981',
                                    padding: '3px 10px', borderRadius: 6,
                                }}>
                                    {BASE}/api/public/leads
                                </code>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { label: 'Auth Header', val: 'x-api-key: YOUR_API_KEY', color: '#818cf8' },
                                    { label: 'Workspace Header', val: 'x-workspace-id: YOUR_WS_ID', color: '#34d399' },
                                    { label: 'Content-Type', val: 'application/json', color: '#f59e0b' },
                                    { label: 'Rate Limit', val: '60 requests / 15 minutes', color: '#f87171' },
                                ].map(item => (
                                    <div key={item.label} style={{
                                        background: 'var(--bg-hover, #ffffff08)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 8, padding: '10px 14px',
                                    }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</div>
                                        <code style={{ fontSize: '0.78rem', color: item.color, fontFamily: 'monospace' }}>{item.val}</code>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PATCH verify-mobile endpoint card */}
                        <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '4px solid #8b5cf6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <Badge label="PATCH" color="#8b5cf6" />
                                <code style={{
                                    fontFamily: 'monospace', fontSize: '0.84rem',
                                    background: '#8b5cf611', color: '#8b5cf6',
                                    padding: '3px 10px', borderRadius: 6,
                                }}>
                                    {BASE}/api/public/leads/:id/verify-mobile
                                </code>
                            </div>
                            <p style={{ margin: '0 0 10px', color: 'var(--text-muted)', fontSize: '0.83rem', lineHeight: 1.6 }}>
                                After a user successfully confirms their OTP, call this endpoint to flip
                                <code style={{ fontFamily: 'monospace', color: '#818cf8', margin: '0 4px' }}>verified_mobile</code>
                                to <strong>true</strong> on the lead.
                                The <code style={{ fontFamily: 'monospace', color: '#34d399', margin: '0 4px' }}>:id</code>
                                is the <code style={{ fontFamily: 'monospace', color: '#34d399' }}>lead._id</code> from the POST response.
                                <strong> No request body needed.</strong>
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { label: 'Auth Header', val: 'x-api-key: YOUR_API_KEY', color: '#818cf8' },
                                    { label: 'Workspace Header', val: 'x-workspace-id: YOUR_WS_ID', color: '#34d399' },
                                    { label: 'Request Body', val: '(none required)', color: '#94a3b8' },
                                    { label: 'Rate Limit', val: '60 requests / 15 minutes', color: '#f87171' },
                                ].map(item => (
                                    <div key={item.label} style={{
                                        background: 'var(--bg-hover, #ffffff08)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 8, padding: '10px 14px',
                                    }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</div>
                                        <code style={{ fontSize: '0.78rem', color: item.color, fontFamily: 'monospace' }}>{item.val}</code>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Step-by-step integration</div>

                            <Step n="1" title="Get your credentials">
                                <p style={{ margin: '0 0 10px', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                                    Go to the <strong>API Keys</strong> tab and copy your API Key and Workspace ID.
                                    These are unique to your workspace and must be kept secret.
                                </p>
                                <div style={{
                                    display: 'flex', gap: 10,
                                    background: 'var(--bg-hover, #ffffff08)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 8, padding: '10px 14px',
                                    fontFamily: 'monospace', fontSize: '0.8rem',
                                }}>
                                    <span style={{ color: 'var(--text-muted)' }}>API Key:</span>
                                    <span style={{ color: '#818cf8', flex: 1 }}>{showKey ? apiKey : maskedKey}</span>
                                    <button className="btn btn-ghost" onClick={() => setShowKey(v => !v)} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>{showKey ? 'Hide' : 'Show'}</button>
                                    <button className="btn btn-ghost" onClick={handleCopyKey} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>Copy</button>
                                </div>
                                <div style={{
                                    display: 'flex', gap: 10, marginTop: 8,
                                    background: 'var(--bg-hover, #ffffff08)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 8, padding: '10px 14px',
                                    fontFamily: 'monospace', fontSize: '0.8rem',
                                }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Workspace ID:</span>
                                    <span style={{ color: '#34d399', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workspaceId}</span>
                                    <button className="btn btn-ghost" onClick={handleCopyWorkspaceId} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>Copy</button>
                                </div>
                            </Step>

                            <Step n="2" title="Request body — fields you can send">
                                <FieldTable rows={[
                                    { field: 'name', type: 'string', required: true, desc: 'Full name of the lead' },
                                    { field: 'mobile', type: 'string', required: true, desc: 'Phone / mobile number' },
                                    { field: 'amount', type: 'number', required: false, desc: 'Deal value / budget (default 0)' },
                                    { field: 'sourceLink', type: 'string', required: false, desc: 'Page URL where form was submitted' },
                                ]} />
                            </Step>

                            <Step n="3" title="Send a request — plain JavaScript / Fetch">
                                <CodeBlock language="javascript (fetch)" code={samplePublicFetch} />
                            </Step>

                            <Step n="4" title="Send a request — cURL (terminal)">
                                <CodeBlock language="bash" code={sampleCurl} />
                            </Step>

                            <Step n="5" title="Full React contact form example">
                                <CodeBlock language="jsx (React)" code={sampleReactForm} />
                            </Step>

                            <Step n="6" title="OTP Mobile Verification — mark verified_mobile as true">
                                <div style={{
                                    background: '#8b5cf611', border: '1px solid #8b5cf633',
                                    borderRadius: 8, padding: '10px 14px',
                                    fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.7,
                                    marginBottom: 12,
                                }}>
                                    <strong style={{ color: '#8b5cf6' }}>Flow: </strong>
                                    POST lead → save <code style={{ fontFamily: 'monospace', color: '#34d399' }}>lead._id</code> from response
                                    → show OTP screen → on OTP success call
                                    <code style={{ fontFamily: 'monospace', color: '#8b5cf6', margin: '0 4px' }}>PATCH .../leads/:id/verify-mobile</code>
                                </div>
                                <FieldTable rows={[
                                    { field: ':id  (URL param)', type: 'string', required: true, desc: 'The lead._id returned from POST /leads response' },
                                    { field: 'x-api-key  (header)', type: 'string', required: true, desc: 'Your workspace API key' },
                                    { field: 'x-workspace-id  (header)', type: 'string', required: true, desc: 'Your workspace ID' },
                                    { field: 'Request body', type: '—', required: false, desc: 'Not required — send empty or omit' },
                                ]} />
                                <CodeBlock language="javascript (fetch)" code={sampleVerifyMobile} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                                    <div>
                                        <div style={{ marginBottom: 6 }}><Badge label="200 OK" color="#10b981" /></div>
                                        <CodeBlock language="json" code={'{\n  "message": "Mobile verified successfully",\n  "lead": {\n    "_id": "64fa3b...",\n    "verified_mobile": true\n  }\n}'} />
                                    </div>
                                    <div>
                                        <div style={{ marginBottom: 6 }}><Badge label="Errors" color="#ef4444" /></div>
                                        <CodeBlock language="json" code={'// 404 — wrong id or workspace\n{ "message": "Lead not found" }\n\n// 401 — bad API key\n{ "message": "Invalid API key" }'} />
                                    </div>
                                </div>
                            </Step>
                        </div>

                        {/* Response section */}
                        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>POST /leads — Response format</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <div style={{ marginBottom: 8 }}><Badge label="201 Created" color="#10b981" /></div>
                                    <CodeBlock language="json" code={'{\n  "message": "Lead submitted successfully",\n  "lead": {\n    "_id": "64fa...",   ← save for verify-mobile\n    "leadId": "LD0042",\n    "name": "Jane Doe",\n    "mobile": "+1-555-0100",\n    "status": "New",\n    "verified_mobile": false,\n    "createdAt": "2024-03-01T10:00:00.000Z"\n  }\n}'} />
                                </div>
                                <div>
                                    <div style={{ marginBottom: 8 }}><Badge label="4xx Errors" color="#ef4444" /></div>
                                    <CodeBlock language="json" code={'// 401 - Missing/invalid API key\n{ "message": "Invalid API key" }\n\n// 400 - Validation error\n{\n  "message": "Validation error",\n  "errors": [\n    { "field": "name", "message": "Required" },\n    { "field": "mobile", "message": "Required" }\n  ]\n}\n\n// 429 - Rate limited\n{ "message": "Too many requests" }'} />
                                </div>
                            </div>
                        </div>

                        {/* Tips */}
                        <div style={{
                            background: '#10b98111', border: '1px solid #10b98133',
                            borderRadius: 12, padding: '16px 20px',
                        }}>
                            <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 10 }}>💡 Tips &amp; Best Practices</div>
                            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 2 }}>
                                <li>Store your API key in an environment variable (<code>.env</code>), never hardcode it in client-side code.</li>
                                <li>Always set <code>sourceLink</code> to <code>window.location.href</code> so you know which page generated the lead.</li>
                                <li><strong>Save the <code>lead._id</code></strong> from the POST response — you need it to call verify-mobile after OTP confirmation.</li>
                                <li>Handle the <strong>429 Too Many Requests</strong> error with an exponential back-off or user-friendly message.</li>
                                <li>Set up your <strong>Webhook URL</strong> (Webhooks tab) to receive real-time notifications when a lead changes status.</li>
                                <li>Use the <strong>API Keys</strong> tab to regenerate your key if it is ever compromised.</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════
                    TAB: API KEYS
                ════════════════════════════════════════════ */}
                {tab === 'keys' && (
                    <div>
                        {/* API Key Card */}
                        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                }}>🔐</div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>API Key</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        Authenticate requests with <code style={{ fontFamily: 'monospace' }}>x-api-key</code> header
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                background: 'var(--bg-input, var(--bg-hover))',
                                border: '1px solid var(--border-color)',
                                borderRadius: 10, padding: '12px 16px',
                                display: 'flex', alignItems: 'center', gap: 12,
                                fontFamily: 'monospace', fontSize: '0.88rem',
                            }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {showKey ? apiKey : maskedKey}
                                </span>
                                <button className="btn btn-ghost" onClick={() => setShowKey(v => !v)} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                                    {showKey ? '🙈 Hide' : '👁 Show'}
                                </button>
                                <button id="copy-api-key" className="btn btn-ghost" onClick={handleCopyKey} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                                    📋 Copy
                                </button>
                            </div>

                            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    id="regenerate-api-key"
                                    className="btn btn-ghost"
                                    onClick={handleRegenerateKey}
                                    style={{ fontSize: '0.82rem', color: 'var(--danger, #ef4444)', borderColor: 'var(--danger, #ef4444)' }}
                                >
                                    ⚡ Regenerate Key
                                </button>
                            </div>

                            <div style={{ marginTop: 14, padding: '10px 14px', background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: 8, fontSize: '0.78rem', color: '#92400e' }}>
                                ⚠️ Keep your API key secret. Regenerating it will immediately invalidate the old one.
                            </div>
                        </div>

                        {/* Workspace ID card */}
                        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                }}>🏢</div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>Workspace ID</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        Send this in the <code style={{ fontFamily: 'monospace' }}>x-workspace-id</code> header with every request
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                background: 'var(--bg-input, var(--bg-hover))',
                                border: '1px solid var(--border-color)',
                                borderRadius: 10, padding: '12px 16px',
                                display: 'flex', alignItems: 'center', gap: 12,
                                fontFamily: 'monospace', fontSize: '0.88rem',
                            }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#34d399' }}>
                                    {workspaceId}
                                </span>
                                <button className="btn btn-ghost" onClick={handleCopyWorkspaceId} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                                    📋 Copy
                                </button>
                            </div>
                        </div>

                        {/* Usage summary */}
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 700, marginBottom: 14 }}>How to use your API key</div>
                            <CodeBlock language="bash (cURL)" code={sampleCurl} />
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                Full integration examples are in the <button onClick={() => setTab('guide')} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '0.82rem' }}>Integration Guide</button> tab.
                            </p>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════
                    TAB: WEBHOOKS
                ════════════════════════════════════════════ */}
                {tab === 'webhook' && (
                    <div>
                        {/* Webhook URL config */}
                        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                }}>🔗</div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>Webhook Endpoint</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        Mini CRM will <code style={{ fontFamily: 'monospace' }}>POST</code> events to this URL in real-time
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSaveWebhook} style={{ display: 'flex', gap: 10 }}>
                                <input
                                    id="webhook-url"
                                    className="form-control"
                                    type="url"
                                    placeholder="https://your-server.com/webhook/crm"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button id="save-webhook" className="btn btn-primary" type="submit" disabled={saving} style={{ whiteSpace: 'nowrap' }}>
                                    {saving ? 'Saving…' : '💾 Save'}
                                </button>
                            </form>
                            <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Leave blank to disable webhooks.
                            </p>
                        </div>

                        {/* Events */}
                        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, marginBottom: 14 }}>Events dispatched</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                {[
                                    { event: 'lead.created', desc: 'A new lead is submitted via form or API', color: '#10b981' },
                                    { event: 'lead.updated', desc: 'Any lead field is modified by a team member', color: '#6366f1' },
                                    { event: 'lead.status_changed', desc: 'Lead status moves between stages', color: '#f59e0b' },
                                ].map(ev => (
                                    <div key={ev.event} style={{
                                        background: ev.color + '11', border: `1px solid ${ev.color}33`,
                                        borderRadius: 10, padding: 14,
                                    }}>
                                        <code style={{ fontSize: '0.78rem', color: ev.color, fontFamily: 'monospace', display: 'block', marginBottom: 6 }}>{ev.event}</code>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{ev.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payload schema */}
                        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, marginBottom: 14 }}>Webhook payload structure</div>
                            <CodeBlock language="json" code={`{
  "event": "lead.status_changed",
  "workspaceId": "${workspaceId}",
  "timestamp": "2024-03-01T12:34:56.789Z",
  "data": {
    "_id": "64fa3b...",
    "leadId": "LD0042",
    "name": "Jane Doe",
    "mobile": "+1-555-0100",
    "amount": 5000,
    "status": "In Progress",
    "priority": "High",
    "oldStatus": "New",
    "newStatus": "In Progress",
    "sourceLink": "https://mysite.com/contact",
    "assignedTo": { "_id": "...", "name": "Agent Name" },
    "updatedAt": "2024-03-01T12:34:56.789Z"
  }
}`} />
                        </div>

                        {/* Handler example */}
                        <div className="card" style={{ padding: 24 }}>
                            <div style={{ fontWeight: 700, marginBottom: 14 }}>Example — Node.js webhook receiver</div>
                            <CodeBlock language="javascript (Express.js)" code={sampleWebhookHandler} />
                            <div style={{
                                padding: '12px 16px',
                                background: '#0ea5e911', border: '1px solid #0ea5e933',
                                borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7
                            }}>
                                💡 Expose your local server with&nbsp;
                                <a href="https://ngrok.com" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>ngrok</a>
                                &nbsp;during development:&nbsp;
                                <code style={{ fontFamily: 'monospace', color: '#38bdf8' }}>ngrok http 3001</code>
                                &nbsp;then paste the HTTPS URL above and save.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
