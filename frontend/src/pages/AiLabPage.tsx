import { useState } from 'react';
import { sendAiChatMessage, sendAiPlateAnalysis } from '../services/aiApi';
import type {
  AiChatRequest,
  AiChatResponseData,
  AiConfidence,
  AiObjective,
  AiPlan,
  AiPlateAnalysisResponseData,
  DetectedFood,
  NutritionRange,
} from '../types/ai.types';
import '../styles/aiLab.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatFormState {
  userId: string;
  conversationId: string;
  message: string;
  objective: AiObjective | '';
  caloriesTarget: string;
  proteinTarget: string;
  plan: AiPlan;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CHAT_FORM: ChatFormState = {
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

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

// ── Helpers ────────────────────────────────────────────────────────────────

function parsePositiveNumber(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
}

function formatRange(range: NutritionRange, unit: string): string {
  return `${range.min}–${range.max} ${unit}`;
}

// ── Shared sub-components ──────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: AiConfidence }) {
  return (
    <span className={`lab-confidence lab-confidence-${level}`}>
      {level === 'high' ? '●' : level === 'medium' ? '◑' : '○'} {CONFIDENCE_LABEL[level]}
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
  if (items.length === 0) return <p className="lab-list-empty">{emptyText}</p>;
  return (
    <ul className={`lab-list${variant ? ` lab-list-${variant}` : ''}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function SafetyBlock({
  safety,
}: {
  safety: { isOutOfScope: boolean; flags: string[]; escalationMessage: string | null };
}) {
  return safety.isOutOfScope ? (
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
  );
}

function MetaChips({
  metadata,
}: {
  metadata: { provider: string; model: string; promptVersion: string; cached: boolean };
}) {
  return (
    <div className="lab-meta">
      <span className="lab-meta-chip"><strong>proveedor</strong> {metadata.provider}</span>
      <span className="lab-meta-chip"><strong>modelo</strong> {metadata.model}</span>
      <span className="lab-meta-chip"><strong>prompt</strong> {metadata.promptVersion}</span>
      <span className="lab-meta-chip"><strong>caché</strong> {metadata.cached ? 'sí' : 'no'}</span>
    </div>
  );
}

// ── Chat response panel ────────────────────────────────────────────────────

function ChatResponsePanel({ data }: { data: AiChatResponseData }) {
  const { responseText, structuredData, safety, conversationId, metadata } = data;
  return (
    <>
      <div className="lab-section">
        <p className="lab-section-title">Respuesta</p>
        <div className="lab-response-text">{responseText}</div>
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">Safety</p>
        <SafetyBlock safety={safety} />
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">Recomendaciones</p>
        <StringList items={structuredData.recommendations} emptyText="Sin recomendaciones" />
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Avisos</p>
        <StringList items={structuredData.warnings} variant="warning" emptyText="Sin avisos" />
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Preguntas de seguimiento</p>
        <StringList items={structuredData.followUpQuestions} variant="question" emptyText="Sin preguntas" />
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">Confianza</p>
        <ConfidenceBadge level={structuredData.confidence} />
      </div>
      <div className="lab-section">
        <p className="lab-section-title">conversationId</p>
        <div className="lab-convo-id"><code>{conversationId}</code></div>
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Metadata</p>
        <MetaChips metadata={metadata} />
      </div>
    </>
  );
}

// ── Plate analysis response panel ──────────────────────────────────────────

function FoodItem({ food }: { food: DetectedFood }) {
  return (
    <div className="lab-food-item">
      <div>
        <span className="lab-food-name">{food.name}</span>
        {food.estimatedQuantity && (
          <span className="lab-food-qty"> — {food.estimatedQuantity}</span>
        )}
      </div>
      <ConfidenceBadge level={food.confidence} />
    </div>
  );
}

function PlateResponsePanel({ data }: { data: AiPlateAnalysisResponseData }) {
  const { responseText, structuredData, safety, analysisId, metadata } = data;
  const { detectedFoods, estimatedNutrition, assumptions, confidenceReason, proportions } =
    structuredData;

  return (
    <>
      <div className="lab-section">
        <p className="lab-section-title">Análisis</p>
        <div className="lab-response-text">{responseText}</div>
      </div>

      <hr className="lab-divider" />

      {/* Safety */}
      <div className="lab-section">
        <p className="lab-section-title">Safety</p>
        <SafetyBlock safety={safety} />
      </div>

      <hr className="lab-divider" />

      {/* Detected foods */}
      <div className="lab-section">
        <p className="lab-section-title">Alimentos detectados</p>
        {detectedFoods.length === 0 ? (
          <p className="lab-list-empty">Ninguno detectado</p>
        ) : (
          <div className="lab-food-list">
            {detectedFoods.map((f, i) => (
              <FoodItem key={i} food={f} />
            ))}
          </div>
        )}
      </div>

      {/* Nutrition ranges */}
      <div className="lab-section">
        <p className="lab-section-title">Estimación nutricional (rango aproximado)</p>
        <div className="lab-nutrition-grid">
          <div className="lab-nutrition-card">
            <p className="lab-nutrition-label">Calorías</p>
            <p className="lab-nutrition-range">
              {formatRange(estimatedNutrition.caloriesRange, '')}
              <span className="lab-nutrition-unit"> kcal</span>
            </p>
          </div>
          <div className="lab-nutrition-card">
            <p className="lab-nutrition-label">Proteína</p>
            <p className="lab-nutrition-range">
              {formatRange(estimatedNutrition.proteinRange, '')}
              <span className="lab-nutrition-unit"> g</span>
            </p>
          </div>
          <div className="lab-nutrition-card">
            <p className="lab-nutrition-label">Hidratos</p>
            <p className="lab-nutrition-range">
              {formatRange(estimatedNutrition.carbsRange, '')}
              <span className="lab-nutrition-unit"> g</span>
            </p>
          </div>
          <div className="lab-nutrition-card">
            <p className="lab-nutrition-label">Grasa</p>
            <p className="lab-nutrition-range">
              {formatRange(estimatedNutrition.fatRange, '')}
              <span className="lab-nutrition-unit"> g</span>
            </p>
          </div>
        </div>
      </div>

      {/* Confidence + reason */}
      <div className="lab-section">
        <p className="lab-section-title">Confianza</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ConfidenceBadge level={structuredData.confidence} />
          {confidenceReason && (
            <p style={{ fontSize: 12, color: '#8a8590', margin: 0 }}>{confidenceReason}</p>
          )}
        </div>
      </div>

      {/* Proportions */}
      <div className="lab-section">
        <p className="lab-section-title">Proporciones</p>
        <div className="lab-proportions">
          {(
            [
              ['Proteína', proportions.protein],
              ['Hidratos', proportions.carbs],
              ['Verduras', proportions.vegetables],
              ['Grasas', proportions.fats],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="lab-proportion-item">
              <span className="lab-proportion-key">{k}: </span>
              <span className="lab-proportion-val">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Assumptions */}
      {assumptions.length > 0 && (
        <div className="lab-section">
          <p className="lab-section-title">Suposiciones del modelo</p>
          <StringList items={assumptions} emptyText="" />
        </div>
      )}

      {/* Recommendations / warnings */}
      <div className="lab-section">
        <p className="lab-section-title">Recomendaciones</p>
        <StringList items={structuredData.recommendations} emptyText="Sin recomendaciones" />
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Avisos</p>
        <StringList items={structuredData.warnings} variant="warning" emptyText="Sin avisos" />
      </div>

      <hr className="lab-divider" />

      {/* analysisId */}
      <div className="lab-section">
        <p className="lab-section-title">analysisId</p>
        <div className="lab-analysis-id"><code>{analysisId}</code></div>
      </div>

      {/* Metadata */}
      <div className="lab-section">
        <p className="lab-section-title">Metadata</p>
        <MetaChips metadata={metadata} />
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function AiLabPage() {
  // ── Chat state ─────────────────────────────────────────────────────────
  const [chatForm, setChatForm] = useState<ChatFormState>(DEFAULT_CHAT_FORM);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<AiChatResponseData | null>(null);
  const [chatRawJson, setChatRawJson] = useState<string | null>(null);
  const [showChatRaw, setShowChatRaw] = useState(false);

  // ── Plate state ─────────────────────────────────────────────────────────
  const [plateFile, setPlateFile] = useState<File | null>(null);
  const [platePreviewUrl, setPlatePreviewUrl] = useState<string | null>(null);
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [plateResponse, setPlateResponse] = useState<AiPlateAnalysisResponseData | null>(null);
  const [plateRawJson, setPlateRawJson] = useState<string | null>(null);
  const [showPlateRaw, setShowPlateRaw] = useState(false);

  // ── Chat handlers ───────────────────────────────────────────────────────
  function handleChatChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setChatForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSafetyCase() {
    setChatForm((prev) => ({ ...prev, message: SAFETY_CASE_MESSAGE }));
  }

  function handleChatClear() {
    setChatForm(DEFAULT_CHAT_FORM);
    setChatError(null);
    setChatResponse(null);
    setChatRawJson(null);
    setShowChatRaw(false);
  }

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatForm.message.trim() || chatLoading) return;

    setChatLoading(true);
    setChatError(null);

    const payload: AiChatRequest = {
      userId: chatForm.userId.trim() || 'dev-user-001',
      message: chatForm.message.trim(),
      ...(chatForm.conversationId.trim() && { conversationId: chatForm.conversationId.trim() }),
      userContext: {
        ...(chatForm.objective && { objective: chatForm.objective as AiObjective }),
        ...(parsePositiveNumber(chatForm.caloriesTarget) !== undefined && {
          caloriesTarget: parsePositiveNumber(chatForm.caloriesTarget),
        }),
        ...(parsePositiveNumber(chatForm.proteinTarget) !== undefined && {
          proteinTarget: parsePositiveNumber(chatForm.proteinTarget),
        }),
      },
      plan: chatForm.plan,
    };

    try {
      const result = await sendAiChatMessage(payload);
      setChatRawJson(JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        setChatResponse(result.data);
        setChatForm((prev) => ({
          ...prev,
          conversationId: result.data!.conversationId,
          message: '',
        }));
      } else {
        setChatError(result.error?.message ?? 'El servidor devolvió un error desconocido.');
        setChatResponse(null);
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setChatLoading(false);
    }
  }

  // ── Plate handlers ──────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setPlateFile(file);
    setPlatePreviewUrl(URL.createObjectURL(file));
    setPlateError(null);
    setPlateResponse(null);
    setPlateRawJson(null);
    setShowPlateRaw(false);
  }

  function handlePlateClear() {
    setPlateFile(null);
    setPlatePreviewUrl(null);
    setPlateError(null);
    setPlateResponse(null);
    setPlateRawJson(null);
    setShowPlateRaw(false);
  }

  async function handlePlateSubmit() {
    if (!plateFile || plateLoading) return;

    setPlateLoading(true);
    setPlateError(null);

    try {
      const result = await sendAiPlateAnalysis({
        userId: chatForm.userId.trim() || 'dev-user-001',
        objective: chatForm.objective || undefined,
        caloriesTarget: parsePositiveNumber(chatForm.caloriesTarget),
        plan: chatForm.plan,
        image: plateFile,
      });
      setPlateRawJson(JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        setPlateResponse(result.data);
      } else {
        setPlateError(result.error?.message ?? 'El servidor devolvió un error desconocido.');
        setPlateResponse(null);
      }
    } catch (err) {
      setPlateError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setPlateLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="lab-root">
      <header className="lab-header">
        <h1>NutriCoach AI <span className="lab-badge">Dev Lab</span></h1>
        <p>Interfaz temporal de prueba — sin auth, sin persistencia de sesión</p>
      </header>

      <div className="lab-body">

        {/* ══ CHAT SECTION ══════════════════════════════════════════════════ */}
        <div className="lab-main">
          {/* Chat form */}
          <section className="lab-panel">
            <h2>Petición — Chat IA</h2>
            <form onSubmit={handleChatSubmit} className="lab-form">
              <div className="lab-field">
                <label htmlFor="userId">userId</label>
                <input id="userId" name="userId" value={chatForm.userId} onChange={handleChatChange} placeholder="dev-user-001" disabled={chatLoading} />
              </div>
              <div className="lab-field">
                <label htmlFor="conversationId">
                  conversationId <span className="lab-optional">(se rellena auto)</span>
                </label>
                <input id="conversationId" name="conversationId" value={chatForm.conversationId} onChange={handleChatChange} placeholder="auto-completado" disabled={chatLoading} />
              </div>
              <div className="lab-field">
                <label htmlFor="message">Mensaje *</label>
                <textarea id="message" name="message" value={chatForm.message} onChange={handleChatChange} placeholder="Escribe un mensaje…" disabled={chatLoading} required />
              </div>
              <hr className="lab-divider" />
              <div className="lab-field">
                <label htmlFor="objective">Objetivo</label>
                <select id="objective" name="objective" value={chatForm.objective} onChange={handleChatChange} disabled={chatLoading}>
                  <option value="">— sin objetivo —</option>
                  <option value="lose_weight">Perder peso</option>
                  <option value="maintain">Mantenimiento</option>
                  <option value="gain_muscle">Ganancia muscular</option>
                </select>
              </div>
              <div className="lab-field-row">
                <div className="lab-field">
                  <label htmlFor="caloriesTarget">Calorías objetivo</label>
                  <input id="caloriesTarget" name="caloriesTarget" type="number" min="1200" max="4500" value={chatForm.caloriesTarget} onChange={handleChatChange} placeholder="1800" disabled={chatLoading} />
                </div>
                <div className="lab-field">
                  <label htmlFor="proteinTarget">Proteína (g)</label>
                  <input id="proteinTarget" name="proteinTarget" type="number" min="0" value={chatForm.proteinTarget} onChange={handleChatChange} placeholder="120" disabled={chatLoading} />
                </div>
              </div>
              <div className="lab-field">
                <label htmlFor="plan">Plan</label>
                <select id="plan" name="plan" value={chatForm.plan} onChange={handleChatChange} disabled={chatLoading}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div className="lab-btn-group">
                <button type="submit" className="lab-btn lab-btn-primary" disabled={chatLoading || !chatForm.message.trim()}>
                  {chatLoading ? 'Enviando…' : 'Enviar'}
                </button>
                <button type="button" className="lab-btn lab-btn-safety" onClick={handleSafetyCase} disabled={chatLoading} title="Caso que activa derivación sanitaria">
                  Caso safety
                </button>
                <button type="button" className="lab-btn lab-btn-ghost" onClick={handleChatClear} disabled={chatLoading}>
                  Limpiar
                </button>
              </div>
            </form>
          </section>

          {/* Chat response */}
          <section className="lab-panel">
            <h2>Respuesta</h2>
            {chatLoading && <p className="lab-loading">⏳ Esperando respuesta de Gemini…</p>}
            {chatError && !chatLoading && <div className="lab-error"><span>✕</span><span>{chatError}</span></div>}
            {!chatLoading && !chatError && !chatResponse && <p className="lab-empty">Envía un mensaje para ver la respuesta aquí.</p>}
            {!chatLoading && chatResponse && <ChatResponsePanel data={chatResponse} />}
          </section>
        </div>

        {/* Chat raw JSON */}
        {chatRawJson && (
          <section className="lab-panel">
            <div className="lab-raw-toggle">
              <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>JSON crudo — Chat</h2>
              <button onClick={() => setShowChatRaw((v) => !v)}>{showChatRaw ? '▲ Ocultar' : '▼ Mostrar'}</button>
            </div>
            {showChatRaw && <pre className="lab-raw-json">{chatRawJson}</pre>}
          </section>
        )}

        {/* ══ PLATE ANALYSIS SECTION ════════════════════════════════════════ */}
        <div className="lab-section-separator">Análisis de plato por imagen</div>

        <div className="lab-main">
          {/* Plate form */}
          <section className="lab-panel">
            <h2>Subir imagen</h2>
            <div className="lab-form">
              {/* File picker */}
              <div className="lab-file-input">
                <label className="lab-file-label" htmlFor="plate-image">
                  <span className="lab-file-label-icon">📷</span>
                  <span className="lab-file-label-text">
                    {plateFile ? plateFile.name : 'Seleccionar imagen'}
                  </span>
                  <span className="lab-file-label-hint">jpeg · png · webp · máx. 5 MB</span>
                  <input
                    id="plate-image"
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={handleFileChange}
                    disabled={plateLoading}
                  />
                </label>
              </div>

              {/* Preview */}
              {platePreviewUrl && (
                <div className="lab-image-preview">
                  <img src={platePreviewUrl} alt="Preview del plato seleccionado" />
                </div>
              )}

              <hr className="lab-divider" />

              {/* Shared context — reads from chat form state */}
              <p style={{ fontSize: 12, color: '#8a8590', margin: 0 }}>
                Contexto compartido con chat: userId <strong>{chatForm.userId || 'dev-user-001'}</strong>,
                objetivo <strong>{chatForm.objective || 'sin objetivo'}</strong>,
                calorías <strong>{chatForm.caloriesTarget || '—'}</strong>,
                plan <strong>{chatForm.plan}</strong>.
                Cambia estos valores en la sección de chat de arriba.
              </p>

              <div className="lab-btn-group">
                <button
                  type="button"
                  className="lab-btn lab-btn-primary"
                  onClick={() => void handlePlateSubmit()}
                  disabled={plateLoading || !plateFile}
                >
                  {plateLoading ? 'Analizando…' : 'Analizar plato'}
                </button>
                <button type="button" className="lab-btn lab-btn-ghost" onClick={handlePlateClear} disabled={plateLoading}>
                  Limpiar
                </button>
              </div>
            </div>
          </section>

          {/* Plate response */}
          <section className="lab-panel">
            <h2>Resultado del análisis</h2>
            {plateLoading && <p className="lab-loading">⏳ Analizando imagen con Gemini Vision…</p>}
            {plateError && !plateLoading && <div className="lab-error"><span>✕</span><span>{plateError}</span></div>}
            {!plateLoading && !plateError && !plateResponse && <p className="lab-empty">Sube una imagen para ver el análisis aquí.</p>}
            {!plateLoading && plateResponse && <PlateResponsePanel data={plateResponse} />}
          </section>
        </div>

        {/* Plate raw JSON */}
        {plateRawJson && (
          <section className="lab-panel">
            <div className="lab-raw-toggle">
              <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>JSON crudo — Análisis de plato</h2>
              <button onClick={() => setShowPlateRaw((v) => !v)}>{showPlateRaw ? '▲ Ocultar' : '▼ Mostrar'}</button>
            </div>
            {showPlateRaw && <pre className="lab-raw-json">{plateRawJson}</pre>}
          </section>
        )}

      </div>
    </div>
  );
}
