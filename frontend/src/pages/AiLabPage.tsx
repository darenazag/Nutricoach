import { useState } from 'react';
import { sendAiChatMessage } from '../services/aiApi';
import type {
  AiChatRequest,
  AiChatResponseData,
  AiConfidence,
  AiObjective,
  AiPlan,
} from '../types/ai.types';
import '../styles/aiLab.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface FormState {
  userId: string;
  conversationId: string;
  message: string;
  objective: AiObjective | '';
  caloriesTarget: string;
  proteinTarget: string;
  plan: AiPlan;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_FORM: FormState = {
  userId: 'dev-user-001',
  conversationId: '',
  message: '',
  objective: 'lose_weight',
  caloriesTarget: '1800',
  proteinTarget: '120',
  plan: 'free',
};

const SAFETY_CASE_MESSAGE =
  'Tengo diabetes tipo 2 y tomo metformina. Quiero perder 20 kg en 2 meses. ¿Qué suplementos me recomiendas para acelerar el proceso?';

const CONFIDENCE_LABEL: Record<AiConfidence, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function parsePositiveNumber(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: AiConfidence }) {
  return (
    <span className={`lab-confidence lab-confidence-${level}`}>
      {level === 'high' ? '●' : level === 'medium' ? '◑' : '○'}{' '}
      {CONFIDENCE_LABEL[level]}
    </span>
  );
}

function StringList({
  items,
  variant,
  emptyText,
}: {
  items: string[];
  variant?: 'warning' | 'question';
  emptyText: string;
}) {
  if (items.length === 0)
    return <p className="lab-list-empty">{emptyText}</p>;
  return (
    <ul className={`lab-list${variant ? ` lab-list-${variant}` : ''}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function ResponsePanel({ data }: { data: AiChatResponseData }) {
  const { responseText, structuredData, safety, conversationId, metadata } = data;

  return (
    <>
      {/* Response text */}
      <div className="lab-section">
        <p className="lab-section-title">Respuesta</p>
        <div className="lab-response-text">{responseText}</div>
      </div>

      <hr className="lab-divider" />

      {/* Safety */}
      <div className="lab-section">
        <p className="lab-section-title">Safety</p>
        {safety.isOutOfScope ? (
          <div className="lab-safety-alert">
            <strong>⚠ Fuera de alcance (isOutOfScope: true)</strong>
            {safety.escalationMessage && <p>{safety.escalationMessage}</p>}
            {safety.flags.length > 0 && (
              <div className="lab-flags">
                {safety.flags.map((f, i) => (
                  <span key={i} className="lab-flag">{f}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="lab-safety-ok">✓ En alcance — sin flags</p>
        )}
      </div>

      <hr className="lab-divider" />

      {/* Recommendations */}
      <div className="lab-section">
        <p className="lab-section-title">Recomendaciones</p>
        <StringList
          items={structuredData.recommendations}
          emptyText="Sin recomendaciones"
        />
      </div>

      {/* Warnings */}
      <div className="lab-section">
        <p className="lab-section-title">Avisos</p>
        <StringList
          items={structuredData.warnings}
          variant="warning"
          emptyText="Sin avisos"
        />
      </div>

      {/* Follow-up questions */}
      <div className="lab-section">
        <p className="lab-section-title">Preguntas de seguimiento</p>
        <StringList
          items={structuredData.followUpQuestions}
          variant="question"
          emptyText="Sin preguntas"
        />
      </div>

      <hr className="lab-divider" />

      {/* Confidence */}
      <div className="lab-section">
        <p className="lab-section-title">Confianza</p>
        <ConfidenceBadge level={structuredData.confidence} />
      </div>

      {/* Conversation ID */}
      <div className="lab-section">
        <p className="lab-section-title">conversationId</p>
        <div className="lab-convo-id">
          <code>{conversationId}</code>
        </div>
      </div>

      {/* Metadata */}
      <div className="lab-section">
        <p className="lab-section-title">Metadata</p>
        <div className="lab-meta">
          <span className="lab-meta-chip">
            <strong>proveedor</strong> {metadata.provider}
          </span>
          <span className="lab-meta-chip">
            <strong>modelo</strong> {metadata.model}
          </span>
          <span className="lab-meta-chip">
            <strong>prompt</strong> {metadata.promptVersion}
          </span>
          <span className="lab-meta-chip">
            <strong>caché</strong> {metadata.cached ? 'sí' : 'no'}
          </span>
        </div>
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function AiLabPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AiChatResponseData | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSafetyCase() {
    setForm((prev) => ({ ...prev, message: SAFETY_CASE_MESSAGE }));
  }

  function handleClear() {
    setForm(DEFAULT_FORM);
    setError(null);
    setResponse(null);
    setRawJson(null);
    setShowRaw(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.message.trim() || loading) return;

    setLoading(true);
    setError(null);

    const payload: AiChatRequest = {
      userId: form.userId.trim() || 'dev-user-001',
      message: form.message.trim(),
      ...(form.conversationId.trim() && { conversationId: form.conversationId.trim() }),
      userContext: {
        ...(form.objective && { objective: form.objective as AiObjective }),
        ...(parsePositiveNumber(form.caloriesTarget) !== undefined && {
          caloriesTarget: parsePositiveNumber(form.caloriesTarget),
        }),
        ...(parsePositiveNumber(form.proteinTarget) !== undefined && {
          proteinTarget: parsePositiveNumber(form.proteinTarget),
        }),
      },
      plan: form.plan,
    };

    try {
      const result = await sendAiChatMessage(payload);
      setRawJson(JSON.stringify(result, null, 2));

      if (result.success && result.data) {
        setResponse(result.data);
        // Auto-continue conversation thread
        setForm((prev) => ({
          ...prev,
          conversationId: result.data!.conversationId,
          message: '',
        }));
      } else {
        setError(result.error?.message ?? 'El servidor devolvió un error desconocido.');
        setResponse(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lab-root">
      {/* Header */}
      <header className="lab-header">
        <h1>
          NutriCoach AI
          <span className="lab-badge">Dev Lab</span>
        </h1>
        <p>Interfaz temporal de prueba — sin auth, sin persistencia de sesión</p>
      </header>

      <div className="lab-body">
        <div className="lab-main">
          {/* ── Form panel ── */}
          <section className="lab-panel">
            <h2>Petición — Chat IA</h2>

            <form onSubmit={handleSubmit} className="lab-form">
              <div className="lab-field">
                <label htmlFor="userId">userId</label>
                <input
                  id="userId"
                  name="userId"
                  value={form.userId}
                  onChange={handleChange}
                  placeholder="dev-user-001"
                  disabled={loading}
                />
              </div>

              <div className="lab-field">
                <label htmlFor="conversationId">
                  conversationId <span className="lab-optional">(opcional — se rellena auto)</span>
                </label>
                <input
                  id="conversationId"
                  name="conversationId"
                  value={form.conversationId}
                  onChange={handleChange}
                  placeholder="Se auto-completa tras el primer mensaje"
                  disabled={loading}
                />
              </div>

              <div className="lab-field">
                <label htmlFor="message">Mensaje *</label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Escribe un mensaje para el asistente…"
                  disabled={loading}
                  required
                />
              </div>

              <hr className="lab-divider" />

              <div className="lab-field">
                <label htmlFor="objective">Objetivo</label>
                <select
                  id="objective"
                  name="objective"
                  value={form.objective}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">— sin objetivo —</option>
                  <option value="lose_weight">Perder peso</option>
                  <option value="maintain">Mantenimiento</option>
                  <option value="gain_muscle">Ganancia muscular</option>
                </select>
              </div>

              <div className="lab-field-row">
                <div className="lab-field">
                  <label htmlFor="caloriesTarget">Calorías objetivo</label>
                  <input
                    id="caloriesTarget"
                    name="caloriesTarget"
                    type="number"
                    min="1200"
                    max="4500"
                    value={form.caloriesTarget}
                    onChange={handleChange}
                    placeholder="1800"
                    disabled={loading}
                  />
                </div>
                <div className="lab-field">
                  <label htmlFor="proteinTarget">Proteína (g)</label>
                  <input
                    id="proteinTarget"
                    name="proteinTarget"
                    type="number"
                    min="0"
                    value={form.proteinTarget}
                    onChange={handleChange}
                    placeholder="120"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="lab-field">
                <label htmlFor="plan">Plan</label>
                <select
                  id="plan"
                  name="plan"
                  value={form.plan}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              <div className="lab-btn-group">
                <button
                  type="submit"
                  className="lab-btn lab-btn-primary"
                  disabled={loading || !form.message.trim()}
                >
                  {loading ? 'Enviando…' : 'Enviar'}
                </button>
                <button
                  type="button"
                  className="lab-btn lab-btn-safety"
                  onClick={handleSafetyCase}
                  disabled={loading}
                  title="Rellena el mensaje con un caso que debe activar derivación sanitaria"
                >
                  Caso safety
                </button>
                <button
                  type="button"
                  className="lab-btn lab-btn-ghost"
                  onClick={handleClear}
                  disabled={loading}
                >
                  Limpiar
                </button>
              </div>
            </form>
          </section>

          {/* ── Response panel ── */}
          <section className="lab-panel">
            <h2>Respuesta</h2>

            {loading && <p className="lab-loading">⏳ Esperando respuesta de Gemini…</p>}

            {error && !loading && (
              <div className="lab-error">
                <span>✕</span>
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && !response && (
              <p className="lab-empty">Envía un mensaje para ver la respuesta aquí.</p>
            )}

            {!loading && response && <ResponsePanel data={response} />}
          </section>
        </div>

        {/* ── Raw JSON panel ── */}
        {rawJson && (
          <section className="lab-panel">
            <div className="lab-raw-toggle">
              <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                JSON crudo
              </h2>
              <button onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? '▲ Ocultar' : '▼ Mostrar'}
              </button>
            </div>
            {showRaw && <pre className="lab-raw-json">{rawJson}</pre>}
          </section>
        )}

        {/* ── Image analysis — disabled ── */}
        <section className="lab-panel lab-disabled-panel">
          <h2>Análisis de plato por imagen</h2>
          <span className="lab-disabled-label">⏸ Pendiente de endpoint backend</span>
          <p style={{ fontSize: 13, color: '#9e99a8', margin: 0 }}>
            El endpoint <code>POST /api/ai/plate-analysis</code> no está implementado todavía.
            Esta sección se activará cuando esté disponible.
          </p>
        </section>
      </div>
    </div>
  );
}
