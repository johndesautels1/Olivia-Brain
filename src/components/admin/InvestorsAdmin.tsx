'use client';

/**
 * Track P Session P4 — `/admin/investors` client.
 *
 * Three tabs: Active records · Archived · Moderation queue.
 * Plus inline create + edit forms, soft-delete (archive), an
 * `isActive` toggle, approve/reject for moderation rows, and a
 * "Re-apply seed" button.
 *
 * Style: inline + CSS variables (Aurum/Aether tokens). Visual polish
 * lands in Track C; this is the functional surface that satisfies
 * the P4 exit criterion ("Admin can add/edit/disable investor records").
 */
import { useEffect, useMemo, useState } from 'react';

import {
  INVESTOR_TYPES_ORDERED,
  type InvestorReputationRecord,
  type InvestorReputationWrite,
  type InvestorType,
} from '@/lib/deal-protection/investor-types';
import { SMART_BANDS_ORDERED, type SmartBand } from '@/lib/deal-protection/types';
import { getSmartBand } from '@/lib/deal-protection/smart-score';

type Tab = 'active' | 'archived' | 'moderation';

interface FormState {
  name: string;
  investorType: InvestorType;
  geographicFocus: string;
  stageFocus: string; // comma-separated
  sectorFocus: string;
  reputationScore: number;
  reputationBand: SmartBand;
  patterns: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  investorType: 'vc',
  geographicFocus: '',
  stageFocus: '',
  sectorFocus: '',
  reputationScore: 60,
  reputationBand: 'blue',
  patterns: '',
  notes: '',
};

function recordToForm(rec: InvestorReputationRecord): FormState {
  return {
    name: rec.name,
    investorType: rec.investorType,
    geographicFocus: rec.geographicFocus ?? '',
    stageFocus: (rec.stageFocus ?? []).join(', '),
    sectorFocus: (rec.sectorFocus ?? []).join(', '),
    reputationScore: rec.reputationScore,
    reputationBand: rec.reputationBand,
    patterns: (rec.patterns ?? []).join(', '),
    notes: rec.notes ?? '',
  };
}

function formToWrite(form: FormState): InvestorReputationWrite {
  const csv = (s: string) =>
    s
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  return {
    name: form.name.trim(),
    investorType: form.investorType,
    geographicFocus: form.geographicFocus.trim() || undefined,
    stageFocus: csv(form.stageFocus),
    sectorFocus: csv(form.sectorFocus),
    reputationScore: form.reputationScore,
    reputationBand: form.reputationBand,
    patterns: csv(form.patterns),
    notes: form.notes.trim() || undefined,
  };
}

const BAND_COLORS: Record<SmartBand, string> = {
  red: 'var(--coral-down)',
  orange: 'var(--amber-warn)',
  yellow: 'var(--sky-info)',
  blue: 'var(--aether-primary)',
  green: 'var(--mint-up)',
};

export function InvestorsAdmin() {
  const [tab, setTab] = useState<Tab>('active');
  const [records, setRecords] = useState<InvestorReputationRecord[]>([]);
  const [moderationRecords, setModerationRecords] = useState<InvestorReputationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [seedSummary, setSeedSummary] = useState<string | null>(null);

  // ── Loaders ─────────────────────────────────────────────────────────
  const loadActive = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/investors?isArchived=false', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Failed to load');
      setRecords(data.records as InvestorReputationRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadArchived = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/investors?isArchived=true', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Failed to load');
      setRecords(data.records as InvestorReputationRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadModeration = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/investors/moderation', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Failed to load');
      setModerationRecords(data.records as InvestorReputationRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'active') void loadActive();
    else if (tab === 'archived') void loadArchived();
    else void loadModeration();
  }, [tab]);

  // ── Mutations ───────────────────────────────────────────────────────
  const submitForm = async () => {
    setError(null);
    const payload = formToWrite(form);
    try {
      const url = editingId ? `/api/admin/investors/${editingId}` : '/api/admin/investors';
      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId
        ? JSON.stringify({
            investorType: payload.investorType,
            geographicFocus: payload.geographicFocus,
            stageFocus: payload.stageFocus,
            sectorFocus: payload.sectorFocus,
            reputationScore: payload.reputationScore,
            reputationBand: payload.reputationBand,
            patterns: payload.patterns,
            notes: payload.notes,
          })
        : JSON.stringify(payload);
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Save failed');
      setCreating(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadActive();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const archiveRecord = async (id: string) => {
    if (!confirm('Archive this record? It will stop influencing smart-score lookups.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/investors/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Archive failed');
      if (tab === 'archived') await loadArchived();
      else await loadActive();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  };

  const toggleActive = async (rec: InvestorReputationRecord) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/investors/${rec.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rec.isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Toggle failed');
      await loadActive();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const moderate = async (id: string, action: 'approve' | 'reject') => {
    setError(null);
    try {
      const res = await fetch('/api/admin/investors/moderation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Moderation failed');
      await loadModeration();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation failed');
    }
  };

  const runSeed = async () => {
    if (!confirm('Re-apply the canonical seed list? Existing records keyed by name will be updated; new entries will be created.')) return;
    setError(null);
    setSeedSummary(null);
    try {
      const res = await fetch('/api/admin/investors/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Seed failed');
      setSeedSummary(
        `Seed applied — created ${data.summary.created}, updated ${data.summary.updated} (of ${data.summary.attempted}).`,
      );
      if (tab === 'active') await loadActive();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed');
    }
  };

  // ── Auto-derive reputationBand when score changes ───────────────────
  const onScoreChange = (n: number) => {
    setForm((f) => ({ ...f, reputationScore: n, reputationBand: getSmartBand(n) }));
  };

  // ── Rendering ───────────────────────────────────────────────────────
  const tabBtn = (id: Tab, label: string) => {
    const active = tab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => {
          setTab(id);
          setEditingId(null);
          setCreating(false);
          setForm(EMPTY_FORM);
        }}
        style={{
          padding: '8px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          background: active ? 'var(--aurum-mute)' : 'var(--surface-1)',
          color: active ? 'var(--fg-primary)' : 'var(--fg-secondary)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    );
  };

  const showingForm = creating || editingId !== null;
  const moderationCount = moderationRecords.length;

  return (
    <div
      style={{
        padding: '32px',
        maxWidth: '1280px',
        margin: '0 auto',
        color: 'var(--fg-primary)',
        fontFamily: 'var(--font-sans, system-ui)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Investor Reputation</h1>
        <button
          type="button"
          onClick={runSeed}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-aurum)',
            background: 'var(--aurum-mute)',
            color: 'var(--fg-primary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Re-apply seed
        </button>
      </div>
      <p style={{ color: 'var(--fg-tertiary)', marginTop: 0, fontSize: '13px' }}>
        Curate the reputation table that backs deal-protection smart-score tilts. Seed is fully anonymized; real entries are operator-curated.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {tabBtn('active', 'Active')}
        {tabBtn('archived', 'Archived')}
        {tabBtn('moderation', `Moderation${moderationCount > 0 ? ` (${moderationCount})` : ''}`)}
        {tab === 'active' ? (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setForm(EMPTY_FORM);
            }}
            style={{
              marginLeft: 'auto',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--aurum-primary)',
              background: 'var(--aurum-primary)',
              color: 'var(--fg-on-accent, #0E0805)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add investor
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--coral-down)',
            background: 'var(--coral-mute, rgba(242, 141, 127, 0.12))',
            color: 'var(--coral-down)',
            marginBottom: '12px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      ) : null}

      {seedSummary ? (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--mint-up)',
            background: 'var(--mint-mute, rgba(94, 224, 190, 0.12))',
            color: 'var(--mint-up)',
            marginBottom: '12px',
            fontSize: '13px',
          }}
        >
          {seedSummary}
        </div>
      ) : null}

      {showingForm ? (
        <FormSection
          form={form}
          editingId={editingId}
          onChange={setForm}
          onScoreChange={onScoreChange}
          onSubmit={submitForm}
          onCancel={() => {
            setCreating(false);
            setEditingId(null);
            setForm(EMPTY_FORM);
          }}
        />
      ) : null}

      {tab === 'moderation' ? (
        <ModerationTable records={moderationRecords} loading={loading} onAction={moderate} />
      ) : (
        <RecordsTable
          records={records}
          loading={loading}
          tab={tab}
          onEdit={(rec) => {
            setEditingId(rec.id);
            setCreating(false);
            setForm(recordToForm(rec));
          }}
          onArchive={archiveRecord}
          onToggleActive={toggleActive}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

interface FormSectionProps {
  form: FormState;
  editingId: string | null;
  onChange: (f: FormState) => void;
  onScoreChange: (n: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function FormSection({ form, editingId, onChange, onScoreChange, onSubmit, onCancel }: FormSectionProps) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => onChange({ ...form, [k]: v });
  return (
    <div
      data-testid="investor-form"
      style={{
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        padding: '20px',
        background: 'var(--surface-1)',
        marginBottom: '20px',
      }}
    >
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginTop: 0 }}>
        {editingId ? 'Edit investor' : 'Add investor'}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="Name" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            disabled={editingId !== null}
            style={inputStyle}
          />
        </Field>
        <Field label="Investor type">
          <select
            value={form.investorType}
            onChange={(e) => set('investorType', e.target.value as InvestorType)}
            style={inputStyle}
          >
            {INVESTOR_TYPES_ORDERED.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Geographic focus">
          <input
            type="text"
            value={form.geographicFocus}
            onChange={(e) => set('geographicFocus', e.target.value)}
            placeholder="e.g. UK + EU"
            style={inputStyle}
          />
        </Field>
        <Field label="Reputation score (0-100)">
          <input
            type="number"
            min={0}
            max={100}
            value={form.reputationScore}
            onChange={(e) => onScoreChange(Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
        <Field label="Stage focus (comma-separated)">
          <input
            type="text"
            value={form.stageFocus}
            onChange={(e) => set('stageFocus', e.target.value)}
            placeholder="e.g. seed, series_a"
            style={inputStyle}
          />
        </Field>
        <Field label="Sector focus (comma-separated)">
          <input
            type="text"
            value={form.sectorFocus}
            onChange={(e) => set('sectorFocus', e.target.value)}
            placeholder="e.g. ai_saas, fintech"
            style={inputStyle}
          />
        </Field>
        <Field label="Reputation band (auto-derived from score)">
          <select
            value={form.reputationBand}
            onChange={(e) => set('reputationBand', e.target.value as SmartBand)}
            style={inputStyle}
          >
            {SMART_BANDS_ORDERED.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Patterns (comma-separated)">
          <input
            type="text"
            value={form.patterns}
            onChange={(e) => set('patterns', e.target.value)}
            placeholder="e.g. standard_1x_liq_pref, broad_based_anti_dilution"
            style={inputStyle}
          />
        </Field>
        <Field label="Notes" wide>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" onClick={onCancel} style={btnSecondary}>
          Cancel
        </button>
        <button type="button" onClick={onSubmit} style={btnPrimary}>
          {editingId ? 'Save changes' : 'Create'}
        </button>
      </div>
    </div>
  );
}

interface RecordsTableProps {
  records: ReadonlyArray<InvestorReputationRecord>;
  loading: boolean;
  tab: Tab;
  onEdit: (rec: InvestorReputationRecord) => void;
  onArchive: (id: string) => void;
  onToggleActive: (rec: InvestorReputationRecord) => void;
}

function RecordsTable({ records, loading, tab, onEdit, onArchive, onToggleActive }: RecordsTableProps) {
  const sorted = useMemo(
    () => [...records].sort((a, b) => b.reputationScore - a.reputationScore),
    [records],
  );

  if (loading) {
    return <div style={{ color: 'var(--fg-tertiary)', padding: '20px' }}>Loading…</div>;
  }
  if (records.length === 0) {
    return (
      <div style={{ color: 'var(--fg-tertiary)', padding: '20px' }}>
        {tab === 'archived' ? 'No archived records.' : 'No active records yet — run "Re-apply seed" or "Add investor".'}
      </div>
    );
  }

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Name</th>
          <th style={thStyle}>Type</th>
          <th style={thStyle}>Score</th>
          <th style={thStyle}>Band</th>
          <th style={thStyle}>Source</th>
          <th style={thStyle}>Active</th>
          <th style={thStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((rec) => (
          <tr key={rec.id}>
            <td style={tdStyle}>
              <div style={{ fontWeight: 500 }}>{rec.name}</div>
              {rec.geographicFocus ? (
                <div style={{ color: 'var(--fg-tertiary)', fontSize: '12px' }}>{rec.geographicFocus}</div>
              ) : null}
            </td>
            <td style={tdStyle}>{rec.investorType.replace(/_/g, ' ')}</td>
            <td style={{ ...tdStyle, fontFamily: 'var(--font-mono, monospace)' }}>{rec.reputationScore.toFixed(1)}</td>
            <td style={tdStyle}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: BAND_COLORS[rec.reputationBand],
                  color: 'var(--fg-on-accent, #0E0805)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {rec.reputationBand}
              </span>
            </td>
            <td style={tdStyle}>{rec.source}</td>
            <td style={tdStyle}>
              <button
                type="button"
                onClick={() => onToggleActive(rec)}
                style={{
                  padding: '2px 8px',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  background: rec.isActive ? 'var(--mint-mute, rgba(94, 224, 190, 0.12))' : 'var(--surface-2)',
                  color: rec.isActive ? 'var(--mint-up)' : 'var(--fg-tertiary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {rec.isActive ? 'Active' : 'Inactive'}
              </button>
            </td>
            <td style={tdStyle}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => onEdit(rec)} style={btnGhost}>
                  Edit
                </button>
                {!rec.isArchived ? (
                  <button type="button" onClick={() => onArchive(rec.id)} style={btnGhostCoral}>
                    Archive
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ModerationTableProps {
  records: ReadonlyArray<InvestorReputationRecord>;
  loading: boolean;
  onAction: (id: string, action: 'approve' | 'reject') => void;
}

function ModerationTable({ records, loading, onAction }: ModerationTableProps) {
  if (loading) return <div style={{ color: 'var(--fg-tertiary)', padding: '20px' }}>Loading…</div>;
  if (records.length === 0) {
    return <div style={{ color: 'var(--fg-tertiary)', padding: '20px' }}>No pending moderation entries.</div>;
  }
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Name</th>
          <th style={thStyle}>Type</th>
          <th style={thStyle}>Score</th>
          <th style={thStyle}>Notes</th>
          <th style={thStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {records.map((rec) => (
          <tr key={rec.id}>
            <td style={tdStyle}>{rec.name}</td>
            <td style={tdStyle}>{rec.investorType.replace(/_/g, ' ')}</td>
            <td style={{ ...tdStyle, fontFamily: 'var(--font-mono, monospace)' }}>{rec.reputationScore.toFixed(1)}</td>
            <td style={{ ...tdStyle, maxWidth: '320px', color: 'var(--fg-secondary)', fontSize: '12px' }}>
              {rec.notes ?? <em style={{ color: 'var(--fg-tertiary)' }}>—</em>}
            </td>
            <td style={tdStyle}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => onAction(rec.id, 'approve')} style={btnPrimary}>
                  Approve
                </button>
                <button type="button" onClick={() => onAction(rec.id, 'reject')} style={btnGhostCoral}>
                  Reject
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}

function Field({ label, required, wide, children }: FieldProps) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        gridColumn: wide ? '1 / -1' : undefined,
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--fg-tertiary)', fontWeight: 500 }}>
        {label}
        {required ? <span style={{ color: 'var(--coral-down)', marginLeft: '4px' }}>*</span> : null}
      </span>
      {children}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Style constants
// ─────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border-default)',
  background: 'var(--canvas-recess, var(--surface-1))',
  color: 'var(--fg-primary)',
  fontSize: '13px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-default)',
  color: 'var(--fg-tertiary)',
  fontWeight: 500,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-subtle)',
  color: 'var(--fg-primary)',
};

const btnPrimary: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid var(--aurum-primary)',
  background: 'var(--aurum-primary)',
  color: 'var(--fg-on-accent, #0E0805)',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid var(--border-default)',
  background: 'var(--surface-2)',
  color: 'var(--fg-secondary)',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--border-default)',
  background: 'transparent',
  color: 'var(--fg-secondary)',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'pointer',
};

const btnGhostCoral: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--coral-down)',
  background: 'transparent',
  color: 'var(--coral-down)',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'pointer',
};
