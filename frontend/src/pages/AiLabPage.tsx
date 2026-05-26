import { useState, useEffect, useRef } from 'react';
import {
  getAiConversation,
  getAiWeeklyMenuPlan,
  sendAiChatMessage,
  sendAiMenuRequest,
  sendAiPlateAnalysis,
  sendAiProfileExplanation,
  sendAiWeeklyMenuRequest,
} from '../services/aiApi';
import type {
  AiChatRequest,
  AiChatResponseData,
  AiConfidence,
  AiConversationData,
  AiMenuRequest,
  AiMenuResponseData,
  AiObjective,
  AiPlan,
  AiPlateAnalysisResponseData,
  AiProfileExplanationRequest,
  AiProfileExplanationResponseData,
  AiWeeklyMenuPlanDto,
  AiWeeklyMenuRequest,
  DetectedFood,
  NutritionRange,
} from '../types/ai.types';
import '../styles/aiLab.css';

// ── Types ──────────────────────────────────────────────────────────────────

type ActiveTab = 'chat' | 'menu' | 'weekly' | 'profile' | 'plate' | 'conversations';

interface SharedProfile {
  userId: string;
  objective: AiObjective;
  caloriesTarget: string;
  proteinTarget: string;
  carbsTarget: string;
  fatTarget: string;
  plan: AiPlan;
}

interface MenuFormState {
  days: string;
  mealsPerDay: string;
  notes: string;
}

interface ProfileFormState {
  basalMetabolicRate: string;
  totalDailyEnergyExpenditure: string;
}

interface LastOperation {
  endpoint: string;
  id: string;
  cached: boolean | null;
  provider: string;
  model: string;
  promptVersion: string;
}

interface UsageStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: SharedProfile = {
  userId: 'smoke-test-user',
  objective: 'lose_weight',
  caloriesTarget: '1800',
  proteinTarget: '120',
  carbsTarget: '',
  fatTarget: '',
  plan: 'free',
};

const DEFAULT_MENU_FORM: MenuFormState = {
  days: '1',
  mealsPerDay: '3',
  notes: '',
};

const DEFAULT_PROFILE_FORM: ProfileFormState = {
  basalMetabolicRate: '1600',
  totalDailyEnergyExpenditure: '2000',
};

const SAFETY_CASE_MESSAGE =
  'Tengo diabetes tipo 2 y tomo metformina. Quiero perder 20 kg en 2 meses. ¿Qué suplementos me recomiendas para acelerar el proceso?';

const CONFIDENCE_LABEL: Record<AiConfidence, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

const TAB_LABELS: Record<ActiveTab, string> = {
  chat: 'Chat',
  menu: 'Menú',
  weekly: 'Menú semanal',
  profile: 'Perfil',
  plate: 'Análisis plato',
  conversations: 'Conversaciones',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function parsePositiveNumber(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
}

function parsePositiveInt(value: string, fallback: number): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function formatRange(range: NutritionRange, unit: string): string {
  return `${range.min}–${range.max} ${unit}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
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
      {items.map((item, i) => <li key={i}>{item}</li>)}
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
          {safety.flags.map((f, i) => <span key={i} className="lab-flag">{f}</span>)}
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
      <span className={`lab-meta-chip lab-cached-${String(metadata.cached)}`}>
        <strong>caché</strong> {metadata.cached ? 'HIT ✓' : 'MISS'}
      </span>
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

// ── Plate analysis panels ──────────────────────────────────────────────────

function FoodItem({ food }: { food: DetectedFood }) {
  return (
    <div className="lab-food-item">
      <div>
        <span className="lab-food-name">{food.name}</span>
        {food.estimatedQuantity && <span className="lab-food-qty"> — {food.estimatedQuantity}</span>}
      </div>
      <ConfidenceBadge level={food.confidence} />
    </div>
  );
}

function PlateResponsePanel({ data }: { data: AiPlateAnalysisResponseData }) {
  const { responseText, structuredData, safety, analysisId, metadata } = data;
  const { detectedFoods, estimatedNutrition, assumptions, confidenceReason, proportions } = structuredData;
  return (
    <>
      <div className="lab-section">
        <p className="lab-section-title">Análisis</p>
        <div className="lab-response-text">{responseText}</div>
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">Safety</p>
        <SafetyBlock safety={safety} />
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">Alimentos detectados</p>
        {detectedFoods.length === 0 ? (
          <p className="lab-list-empty">Ninguno detectado</p>
        ) : (
          <div className="lab-food-list">
            {detectedFoods.map((f, i) => <FoodItem key={i} food={f} />)}
          </div>
        )}
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Estimación nutricional (rango aproximado)</p>
        <div className="lab-nutrition-grid">
          <div className="lab-nutrition-card">
            <p className="lab-nutrition-label">Calorías</p>
            <p className="lab-nutrition-range">{formatRange(estimatedNutrition.caloriesRange, '')}<span className="lab-nutrition-unit"> kcal</span></p>
          </div>
          <div className="lab-nutrition-card">
            <p className="lab-nutrition-label">Proteína</p>
            <p className="lab-nutrition-range">{formatRange(estimatedNutrition.proteinRange, '')}<span className="lab-nutrition-unit"> g</span></p>
          </div>
          <div className="lab-nutrition-card">
            <p className="lab-nutrition-label">Hidratos</p>
            <p className="lab-nutrition-range">{formatRange(estimatedNutrition.carbsRange, '')}<span className="lab-nutrition-unit"> g</span></p>
          </div>
          <div className="lab-nutrition-card">
            <p className="lab-nutrition-label">Grasa</p>
            <p className="lab-nutrition-range">{formatRange(estimatedNutrition.fatRange, '')}<span className="lab-nutrition-unit"> g</span></p>
          </div>
        </div>
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Confianza</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ConfidenceBadge level={structuredData.confidence} />
          {confidenceReason && <p style={{ fontSize: 12, color: '#8a8590', margin: 0 }}>{confidenceReason}</p>}
        </div>
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Proporciones</p>
        <div className="lab-proportions">
          {([['Proteína', proportions.protein], ['Hidratos', proportions.carbs], ['Verduras', proportions.vegetables], ['Grasas', proportions.fats]] as [string, string][]).map(([k, v]) => (
            <div key={k} className="lab-proportion-item">
              <span className="lab-proportion-key">{k}: </span>
              <span className="lab-proportion-val">{v}</span>
            </div>
          ))}
        </div>
      </div>
      {assumptions.length > 0 && (
        <div className="lab-section">
          <p className="lab-section-title">Suposiciones del modelo</p>
          <StringList items={assumptions} emptyText="" />
        </div>
      )}
      <div className="lab-section">
        <p className="lab-section-title">Recomendaciones</p>
        <StringList items={structuredData.recommendations} emptyText="Sin recomendaciones" />
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Avisos</p>
        <StringList items={structuredData.warnings} variant="warning" emptyText="Sin avisos" />
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">analysisId</p>
        <div className="lab-analysis-id"><code>{analysisId}</code></div>
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Metadata</p>
        <MetaChips metadata={metadata} />
      </div>
    </>
  );
}

// ── Menu response panel ────────────────────────────────────────────────────

function MenuResponsePanel({ data }: { data: AiMenuResponseData }) {
  const { responseText, structuredData, safety, conversationId, metadata } = data;
  return (
    <>
      <div className="lab-section">
        <p className="lab-section-title">Resumen</p>
        <div className="lab-response-text">{responseText}</div>
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">Safety</p>
        <SafetyBlock safety={safety} />
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">
          Menú — {structuredData.dailyCalories} kcal/día · {structuredData.days.length}{' '}
          {structuredData.days.length === 1 ? 'día' : 'días'}
        </p>
        <div className="lab-days">
          {structuredData.days.map((day) => (
            <div key={day.day} className="lab-day-card">
              <div className="lab-day-header">Día {day.day}</div>
              <div className="lab-meal-list">
                {day.meals.map((meal, i) => (
                  <div key={i} className="lab-meal-item">
                    <div className="lab-meal-name">{meal.name}</div>
                    <div className="lab-meal-desc">{meal.description}</div>
                    <div className="lab-meal-macros">
                      <span className="lab-macro lab-macro-kcal">{meal.estimatedCalories} kcal</span>
                      <span className="lab-macro lab-macro-prot">{meal.estimatedProtein}g prot</span>
                      <span className="lab-macro">{meal.estimatedCarbs}g HC</span>
                      <span className="lab-macro">{meal.estimatedFat}g grasa</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
      <hr className="lab-divider" />
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

// ── Profile explanation response panel ─────────────────────────────────────

function ProfileResponsePanel({ data }: { data: AiProfileExplanationResponseData }) {
  const { responseText, structuredData, safety, conversationId, metadata } = data;
  return (
    <>
      <div className="lab-section">
        <p className="lab-section-title">Explicación</p>
        <div className="lab-response-text">{responseText}</div>
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">Safety</p>
        <SafetyBlock safety={safety} />
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">Métricas explicadas</p>
        <StringList items={structuredData.explainedMetrics} emptyText="Sin métricas explicadas" />
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Recomendaciones</p>
        <StringList items={structuredData.recommendations} emptyText="Sin recomendaciones" />
      </div>
      <div className="lab-section">
        <p className="lab-section-title">Avisos</p>
        <StringList items={structuredData.warnings} variant="warning" emptyText="Sin avisos" />
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

// ── Conversation panel ─────────────────────────────────────────────────────

function MessageCard({ msg }: { msg: AiConversationData['messages'][number] }) {
  const [showStructured, setShowStructured] = useState(false);
  const hasStructured = msg.structuredData !== null && msg.structuredData !== undefined;
  return (
    <div className="lab-msg">
      <div className="lab-msg-header">
        <span className={`lab-msg-role lab-msg-role-${msg.role}`}>{msg.role}</span>
        <span className="lab-msg-time">{formatDate(msg.createdAt)}</span>
      </div>
      <div className="lab-msg-content">{msg.content}</div>
      {hasStructured && (
        <div className="lab-msg-structured">
          <button
            className="lab-btn lab-btn-ghost"
            style={{ fontSize: 11, padding: '3px 8px', marginTop: 4 }}
            onClick={() => setShowStructured((v) => !v)}
          >
            {showStructured ? '▲ Ocultar structuredData' : '▼ Ver structuredData'}
          </button>
          {showStructured && (
            <pre className="lab-raw-json" style={{ marginTop: 6, fontSize: 11 }}>
              {JSON.stringify(msg.structuredData, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ConversationPanel({ data }: { data: AiConversationData }) {
  const { conversation, messages } = data;
  return (
    <>
      <div className="lab-section">
        <p className="lab-section-title">Conversación</p>
        <div className="lab-conv-meta">
          <div className="lab-conv-meta-item">
            <div className="lab-conv-meta-key">tipo</div>
            <div className="lab-conv-meta-val">{conversation.type}</div>
          </div>
          <div className="lab-conv-meta-item">
            <div className="lab-conv-meta-key">estado</div>
            <div className="lab-conv-meta-val">{conversation.status}</div>
          </div>
          <div className="lab-conv-meta-item">
            <div className="lab-conv-meta-key">proveedor</div>
            <div className="lab-conv-meta-val">{conversation.provider}</div>
          </div>
          <div className="lab-conv-meta-item">
            <div className="lab-conv-meta-key">creado</div>
            <div className="lab-conv-meta-val">{formatDate(conversation.createdAt)}</div>
          </div>
        </div>
        <div className="lab-convo-id"><code>{conversation.conversationId}</code></div>
      </div>
      <hr className="lab-divider" />
      <div className="lab-section">
        <p className="lab-section-title">Mensajes ({messages.length})</p>
        <div className="lab-messages">
          {messages.map((msg) => <MessageCard key={msg.messageId} msg={msg} />)}
        </div>
      </div>
    </>
  );
}

// ── Usage panel ────────────────────────────────────────────────────────────

function UsagePanel({ usage, lastOp }: { usage: UsageStats; lastOp: LastOperation | null }) {
  return (
    <div className="lab-usage">
      <div className="lab-usage-counters">
        <div className="lab-usage-counter">
          <div className="lab-usage-counter-value">{usage.totalRequests}</div>
          <div className="lab-usage-counter-label">Peticiones</div>
        </div>
        <div className="lab-usage-counter lab-usage-counter-hits">
          <div className="lab-usage-counter-value">{usage.cacheHits}</div>
          <div className="lab-usage-counter-label">Cache HIT</div>
        </div>
        <div className="lab-usage-counter">
          <div className="lab-usage-counter-value">{usage.cacheMisses}</div>
          <div className="lab-usage-counter-label">Cache MISS</div>
        </div>
      </div>
      {lastOp && (
        <div className="lab-last-op">
          <p className="lab-section-title" style={{ margin: 0 }}>Última operación</p>
          <div className="lab-last-op-row">
            <span className="lab-meta-chip"><strong>endpoint</strong> {lastOp.endpoint}</span>
            {lastOp.cached !== null && (
              <span className={`lab-meta-chip lab-cached-${String(lastOp.cached)}`}>
                {lastOp.cached ? 'HIT ✓' : 'MISS'}
              </span>
            )}
          </div>
          <div className="lab-last-op-row">
            <span className="lab-meta-chip"><strong>modelo</strong> {lastOp.model || '—'}</span>
            <span className="lab-meta-chip"><strong>prompt</strong> {lastOp.promptVersion || '—'}</span>
          </div>
          {lastOp.id && (
            <div style={{ fontSize: 11, color: '#8a8590', wordBreak: 'break-all' }}>
              ID: <code style={{ fontSize: 11 }}>{lastOp.id}</code>
            </div>
          )}
        </div>
      )}
      <p className="lab-usage-footer">
        Llamadas evitadas por caché: {usage.cacheHits} — Tokens reales pendientes de instrumentar en backend.
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function AiLabPage() {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');

  // Shared profile
  const [profile, setProfile] = useState<SharedProfile>(DEFAULT_PROFILE);

  // Usage tracking (session-local)
  const [usage, setUsage] = useState<UsageStats>({ totalRequests: 0, cacheHits: 0, cacheMisses: 0 });
  const [lastOp, setLastOp] = useState<LastOperation | null>(null);
  const [lastConversationId, setLastConversationId] = useState('');

  // Chat tab
  const [chatConversationId, setChatConversationId] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<AiChatResponseData | null>(null);
  const [chatRawJson, setChatRawJson] = useState<string | null>(null);
  const [showChatRaw, setShowChatRaw] = useState(false);

  // Menu tab
  const [menuForm, setMenuForm] = useState<MenuFormState>(DEFAULT_MENU_FORM);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuResponse, setMenuResponse] = useState<AiMenuResponseData | null>(null);
  const [menuRawJson, setMenuRawJson] = useState<string | null>(null);
  const [showMenuRaw, setShowMenuRaw] = useState(false);
  const [lastMenuPayload, setLastMenuPayload] = useState<AiMenuRequest | null>(null);

  // Profile explanation tab
  const [profileForm, setProfileForm] = useState<ProfileFormState>(DEFAULT_PROFILE_FORM);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileResponse, setProfileResponse] = useState<AiProfileExplanationResponseData | null>(null);
  const [profileRawJson, setProfileRawJson] = useState<string | null>(null);
  const [showProfileRaw, setShowProfileRaw] = useState(false);
  const [lastProfilePayload, setLastProfilePayload] = useState<AiProfileExplanationRequest | null>(null);

  // Plate tab
  const [plateFile, setPlateFile] = useState<File | null>(null);
  const [platePreviewUrl, setPlatePreviewUrl] = useState<string | null>(null);
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [plateResponse, setPlateResponse] = useState<AiPlateAnalysisResponseData | null>(null);
  const [plateRawJson, setPlateRawJson] = useState<string | null>(null);
  const [showPlateRaw, setShowPlateRaw] = useState(false);
  const [lastPlateFile, setLastPlateFile] = useState<File | null>(null);

  // Conversations tab
  const [convInput, setConvInput] = useState('');
  const [convLoading, setConvLoading] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [convData, setConvData] = useState<AiConversationData | null>(null);
  const [convRawJson, setConvRawJson] = useState<string | null>(null);
  const [showConvRaw, setShowConvRaw] = useState(false);

  // Weekly menu tab
  const [weeklyMealsPerDay, setWeeklyMealsPerDay] = useState('3');
  const [weeklyNotes, setWeeklyNotes] = useState('');
  const [weeklySubmitLoading, setWeeklySubmitLoading] = useState(false);
  const [weeklyPollLoading, setWeeklyPollLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklyPlanId, setWeeklyPlanId] = useState('');
  const [weeklyPlanData, setWeeklyPlanData] = useState<AiWeeklyMenuPlanDto | null>(null);
  const [weeklyRawJson, setWeeklyRawJson] = useState<string | null>(null);
  const [showWeeklyRaw, setShowWeeklyRaw] = useState(false);
  const weeklyPlanIdRef = useRef('');
  const weeklyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────

  function recordSuccess(
    endpoint: string,
    id: string,
    metadata: { provider: string; model: string; promptVersion: string; cached: boolean },
  ) {
    setUsage((prev) => ({
      totalRequests: prev.totalRequests + 1,
      cacheHits: metadata.cached ? prev.cacheHits + 1 : prev.cacheHits,
      cacheMisses: metadata.cached ? prev.cacheMisses : prev.cacheMisses + 1,
    }));
    setLastOp({
      endpoint,
      id,
      cached: metadata.cached,
      provider: metadata.provider,
      model: metadata.model,
      promptVersion: metadata.promptVersion,
    });
    if (id.startsWith('conv_')) setLastConversationId(id);
  }

  function handleProfileChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  }

  // ── Chat handlers ────────────────────────────────────────────────────────

  async function handleChatSubmit() {
    if (!chatMessage.trim() || chatLoading) return;
    setChatLoading(true);
    setChatError(null);

    const payload: AiChatRequest = {
      userId: profile.userId.trim() || 'smoke-test-user',
      message: chatMessage.trim(),
      ...(chatConversationId.trim() && { conversationId: chatConversationId.trim() }),
      userContext: {
        objective: profile.objective,
        ...(parsePositiveNumber(profile.caloriesTarget) !== undefined && { caloriesTarget: parsePositiveNumber(profile.caloriesTarget) }),
        ...(parsePositiveNumber(profile.proteinTarget) !== undefined && { proteinTarget: parsePositiveNumber(profile.proteinTarget) }),
        ...(parsePositiveNumber(profile.carbsTarget) !== undefined && { carbsTarget: parsePositiveNumber(profile.carbsTarget) }),
        ...(parsePositiveNumber(profile.fatTarget) !== undefined && { fatTarget: parsePositiveNumber(profile.fatTarget) }),
      },
      plan: profile.plan,
    };

    try {
      const result = await sendAiChatMessage(payload);
      setChatRawJson(JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        setChatResponse(result.data);
        setChatConversationId(result.data.conversationId);
        setChatMessage('');
        recordSuccess('/api/ai/chat', result.data.conversationId, result.data.metadata);
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

  // ── Menu handlers ────────────────────────────────────────────────────────

  function buildMenuPayload(): AiMenuRequest {
    return {
      userId: profile.userId.trim() || 'smoke-test-user',
      objective: profile.objective,
      caloriesTarget: parsePositiveNumber(profile.caloriesTarget) ?? 1800,
      ...(parsePositiveNumber(profile.proteinTarget) !== undefined && { proteinTarget: parsePositiveNumber(profile.proteinTarget) }),
      ...(parsePositiveNumber(profile.carbsTarget) !== undefined && { carbsTarget: parsePositiveNumber(profile.carbsTarget) }),
      ...(parsePositiveNumber(profile.fatTarget) !== undefined && { fatTarget: parsePositiveNumber(profile.fatTarget) }),
      days: parsePositiveInt(menuForm.days, 1),
      mealsPerDay: parsePositiveInt(menuForm.mealsPerDay, 3),
      ...(menuForm.notes.trim() && { notes: menuForm.notes.trim() }),
      plan: profile.plan,
    };
  }

  async function handleMenuSubmit(payload?: AiMenuRequest) {
    if (menuLoading) return;
    const p = payload ?? buildMenuPayload();
    setLastMenuPayload(p);
    setMenuLoading(true);
    setMenuError(null);
    try {
      const result = await sendAiMenuRequest(p);
      setMenuRawJson(JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        setMenuResponse(result.data);
        recordSuccess('/api/ai/menu', result.data.conversationId, result.data.metadata);
      } else {
        setMenuError(result.error?.message ?? 'El servidor devolvió un error desconocido.');
        setMenuResponse(null);
      }
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setMenuLoading(false);
    }
  }

  // ── Profile explanation handlers ─────────────────────────────────────────

  function buildProfilePayload(): AiProfileExplanationRequest {
    return {
      userId: profile.userId.trim() || 'smoke-test-user',
      objective: profile.objective,
      basalMetabolicRate: parsePositiveNumber(profileForm.basalMetabolicRate) ?? 1600,
      totalDailyEnergyExpenditure: parsePositiveNumber(profileForm.totalDailyEnergyExpenditure) ?? 2000,
      caloriesTarget: parsePositiveNumber(profile.caloriesTarget) ?? 1800,
      ...(parsePositiveNumber(profile.proteinTarget) !== undefined && { proteinTarget: parsePositiveNumber(profile.proteinTarget) }),
      ...(parsePositiveNumber(profile.carbsTarget) !== undefined && { carbsTarget: parsePositiveNumber(profile.carbsTarget) }),
      ...(parsePositiveNumber(profile.fatTarget) !== undefined && { fatTarget: parsePositiveNumber(profile.fatTarget) }),
      plan: profile.plan,
    };
  }

  async function handleProfileExplanationSubmit(payload?: AiProfileExplanationRequest) {
    if (profileLoading) return;
    const p = payload ?? buildProfilePayload();
    setLastProfilePayload(p);
    setProfileLoading(true);
    setProfileError(null);
    try {
      const result = await sendAiProfileExplanation(p);
      setProfileRawJson(JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        setProfileResponse(result.data);
        recordSuccess('/api/ai/profile-explanation', result.data.conversationId, result.data.metadata);
      } else {
        setProfileError(result.error?.message ?? 'El servidor devolvió un error desconocido.');
        setProfileResponse(null);
      }
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setProfileLoading(false);
    }
  }

  // ── Plate handlers ───────────────────────────────────────────────────────

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

  async function handlePlateSubmit(file?: File) {
    const f = file ?? plateFile;
    if (!f || plateLoading) return;
    setLastPlateFile(f);
    setPlateLoading(true);
    setPlateError(null);
    try {
      const result = await sendAiPlateAnalysis({
        userId: profile.userId.trim() || 'smoke-test-user',
        objective: profile.objective,
        caloriesTarget: parsePositiveNumber(profile.caloriesTarget),
        plan: profile.plan,
        image: f,
      });
      setPlateRawJson(JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        setPlateResponse(result.data);
        recordSuccess('/api/ai/plate-analysis', result.data.analysisId, result.data.metadata);
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

  // ── Conversations handler ────────────────────────────────────────────────

  async function handleConvLoad() {
    if (!convInput.trim() || convLoading) return;
    setConvLoading(true);
    setConvError(null);
    try {
      const result = await getAiConversation(convInput.trim());
      setConvRawJson(JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        setConvData(result.data);
      } else {
        setConvError(result.error?.message ?? 'El servidor devolvió un error desconocido.');
        setConvData(null);
      }
    } catch (err) {
      setConvError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setConvLoading(false);
    }
  }

  // ── Weekly menu handlers ──────────────────────────────────────────────────

  async function handleWeeklySubmit() {
    if (weeklySubmitLoading) return;
    setWeeklySubmitLoading(true);
    setWeeklyError(null);
    setWeeklyPlanId('');
    setWeeklyPlanData(null);
    setWeeklyRawJson(null);
    weeklyPlanIdRef.current = '';
    if (weeklyPollRef.current) { clearInterval(weeklyPollRef.current); weeklyPollRef.current = null; }

    const payload: AiWeeklyMenuRequest = {
      userId: profile.userId.trim() || 'smoke-test-user',
      objective: profile.objective,
      caloriesTarget: parsePositiveNumber(profile.caloriesTarget) ?? 1800,
      ...(parsePositiveNumber(profile.proteinTarget) !== undefined && { proteinTarget: parsePositiveNumber(profile.proteinTarget) }),
      ...(parsePositiveNumber(profile.carbsTarget) !== undefined && { carbsTarget: parsePositiveNumber(profile.carbsTarget) }),
      ...(parsePositiveNumber(profile.fatTarget) !== undefined && { fatTarget: parsePositiveNumber(profile.fatTarget) }),
      mealsPerDay: parsePositiveInt(weeklyMealsPerDay, 3),
      ...(weeklyNotes.trim() && { notes: weeklyNotes.trim() }),
      plan: profile.plan,
    };

    try {
      const result = await sendAiWeeklyMenuRequest(payload);
      setWeeklyRawJson(JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        setWeeklyPlanId(result.data.planId);
        weeklyPlanIdRef.current = result.data.planId;
      } else {
        setWeeklyError(result.error?.message ?? 'El servidor devolvió un error desconocido.');
      }
    } catch (err) {
      setWeeklyError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setWeeklySubmitLoading(false);
    }
  }

  async function pollWeeklyPlan(pid: string) {
    if (!pid || weeklyPollLoading) return;
    setWeeklyPollLoading(true);
    try {
      const result = await getAiWeeklyMenuPlan(pid);
      setWeeklyRawJson(JSON.stringify(result, null, 2));
      if (result.success && result.data) {
        setWeeklyPlanData(result.data);
      } else {
        setWeeklyError(result.error?.message ?? 'Error consultando el plan.');
      }
    } catch (err) {
      setWeeklyError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setWeeklyPollLoading(false);
    }
  }

  useEffect(() => {
    weeklyPlanIdRef.current = weeklyPlanId;
    if (!weeklyPlanId) return;
    const status = weeklyPlanData?.status;
    if (status === 'completed' || status === 'failed' || status === 'partial_failed') {
      if (weeklyPollRef.current) { clearInterval(weeklyPollRef.current); weeklyPollRef.current = null; }
      return;
    }
    weeklyPollRef.current = setInterval(() => { void pollWeeklyPlan(weeklyPlanIdRef.current); }, 5000);
    return () => {
      if (weeklyPollRef.current) { clearInterval(weeklyPollRef.current); weeklyPollRef.current = null; }
    };
  }, [weeklyPlanId, weeklyPlanData?.status]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="lab-root">
      <header className="lab-header">
        <h1>NutriCoach AI <span className="lab-badge">Dev Lab</span></h1>
        <p>Dashboard interno — sin auth, sin persistencia de sesión</p>
      </header>

      <div className="lab-body">
        <div className="lab-main">

          {/* ── LEFT COL: shared profile + usage ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'start', position: 'sticky', top: 20 }}>
            <section className="lab-panel">
              <h2>Perfil compartido</h2>
              <div className="lab-form">
                <div className="lab-field">
                  <label htmlFor="sh-userId">userId</label>
                  <input id="sh-userId" name="userId" value={profile.userId} onChange={handleProfileChange} placeholder="smoke-test-user" />
                </div>
                <div className="lab-field">
                  <label htmlFor="sh-objective">Objetivo</label>
                  <select id="sh-objective" name="objective" value={profile.objective} onChange={handleProfileChange}>
                    <option value="lose_weight">Perder peso</option>
                    <option value="maintain">Mantenimiento</option>
                    <option value="gain_muscle">Ganancia muscular</option>
                  </select>
                </div>
                <div className="lab-field-row">
                  <div className="lab-field">
                    <label htmlFor="sh-cal">Calorías</label>
                    <input id="sh-cal" name="caloriesTarget" type="number" min="1200" max="4500" value={profile.caloriesTarget} onChange={handleProfileChange} placeholder="1800" />
                  </div>
                  <div className="lab-field">
                    <label htmlFor="sh-prot">Proteína (g)</label>
                    <input id="sh-prot" name="proteinTarget" type="number" min="0" value={profile.proteinTarget} onChange={handleProfileChange} placeholder="120" />
                  </div>
                </div>
                <div className="lab-field-row">
                  <div className="lab-field">
                    <label htmlFor="sh-carbs">HC (g) <span className="lab-optional">opc.</span></label>
                    <input id="sh-carbs" name="carbsTarget" type="number" min="0" value={profile.carbsTarget} onChange={handleProfileChange} placeholder="—" />
                  </div>
                  <div className="lab-field">
                    <label htmlFor="sh-fat">Grasa (g) <span className="lab-optional">opc.</span></label>
                    <input id="sh-fat" name="fatTarget" type="number" min="0" value={profile.fatTarget} onChange={handleProfileChange} placeholder="—" />
                  </div>
                </div>
                <div className="lab-field">
                  <label htmlFor="sh-plan">Plan</label>
                  <select id="sh-plan" name="plan" value={profile.plan} onChange={handleProfileChange}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="lab-panel">
              <h2>Uso IA <span className="lab-badge">sesión</span></h2>
              <UsagePanel usage={usage} lastOp={lastOp} />
            </section>
          </div>

          {/* ── RIGHT COL: tab nav + tab content ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Tab navigation */}
            <div className="lab-tabs">
              {(Object.keys(TAB_LABELS) as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`lab-tab${activeTab === tab ? ' lab-tab-active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* ── CHAT TAB ── */}
            {activeTab === 'chat' && (
              <>
                <section className="lab-panel">
                  <h2>Petición — Chat IA</h2>
                  <form onSubmit={(e) => { e.preventDefault(); void handleChatSubmit(); }} className="lab-form">
                    <div className="lab-field">
                      <label htmlFor="chat-convId">
                        conversationId <span className="lab-optional">(se rellena auto tras primer mensaje)</span>
                      </label>
                      <input
                        id="chat-convId"
                        value={chatConversationId}
                        onChange={(e) => setChatConversationId(e.target.value)}
                        placeholder="auto-completado"
                        disabled={chatLoading}
                      />
                    </div>
                    <div className="lab-field">
                      <label htmlFor="chat-message">Mensaje *</label>
                      <textarea
                        id="chat-message"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Escribe un mensaje…"
                        disabled={chatLoading}
                        required
                      />
                    </div>
                    <div className="lab-btn-group">
                      <button type="submit" className="lab-btn lab-btn-primary" disabled={chatLoading || !chatMessage.trim()}>
                        {chatLoading ? 'Enviando…' : 'Enviar'}
                      </button>
                      <button type="button" className="lab-btn lab-btn-safety" onClick={() => setChatMessage(SAFETY_CASE_MESSAGE)} disabled={chatLoading} title="Activa derivación sanitaria">
                        Caso safety
                      </button>
                      <button type="button" className="lab-btn lab-btn-ghost" onClick={() => { setChatMessage(''); setChatConversationId(''); setChatError(null); setChatResponse(null); setChatRawJson(null); setShowChatRaw(false); }} disabled={chatLoading}>
                        Limpiar
                      </button>
                    </div>
                  </form>
                </section>

                <section className="lab-panel">
                  <h2>Respuesta</h2>
                  {chatLoading && <p className="lab-loading">⏳ Esperando respuesta de Gemini…</p>}
                  {chatError && !chatLoading && <div className="lab-error"><span>✕</span><span>{chatError}</span></div>}
                  {!chatLoading && !chatError && !chatResponse && <p className="lab-empty">Envía un mensaje para ver la respuesta aquí.</p>}
                  {!chatLoading && chatResponse && <ChatResponsePanel data={chatResponse} />}
                </section>

                {chatRawJson && (
                  <section className="lab-panel">
                    <div className="lab-raw-toggle">
                      <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>JSON crudo — Chat</h2>
                      <button onClick={() => setShowChatRaw((v) => !v)}>{showChatRaw ? '▲ Ocultar' : '▼ Mostrar'}</button>
                    </div>
                    {showChatRaw && <pre className="lab-raw-json">{chatRawJson}</pre>}
                  </section>
                )}
              </>
            )}

            {/* ── MENU TAB ── */}
            {activeTab === 'menu' && (
              <>
                <section className="lab-panel">
                  <h2>Generación de menú</h2>
                  <div className="lab-form">
                    <div className="lab-field-row">
                      <div className="lab-field">
                        <label htmlFor="menu-days">Días (1–7)</label>
                        <input id="menu-days" type="number" min="1" max="7" value={menuForm.days} onChange={(e) => setMenuForm((p) => ({ ...p, days: e.target.value }))} disabled={menuLoading} />
                      </div>
                      <div className="lab-field">
                        <label htmlFor="menu-meals">Comidas/día (1–6)</label>
                        <input id="menu-meals" type="number" min="1" max="6" value={menuForm.mealsPerDay} onChange={(e) => setMenuForm((p) => ({ ...p, mealsPerDay: e.target.value }))} disabled={menuLoading} />
                      </div>
                    </div>
                    <div className="lab-field">
                      <label htmlFor="menu-notes">Notas <span className="lab-optional">opcional · máx. 1000 chars</span></label>
                      <textarea id="menu-notes" maxLength={1000} placeholder="Restricciones, preferencias, alergias…" value={menuForm.notes} onChange={(e) => setMenuForm((p) => ({ ...p, notes: e.target.value }))} disabled={menuLoading} />
                    </div>
                    <p style={{ fontSize: 12, color: '#8a8590', margin: 0 }}>
                      Perfil: objetivo <strong>{profile.objective}</strong> · {profile.caloriesTarget} kcal · {profile.proteinTarget || '—'}g prot · plan <strong>{profile.plan}</strong>
                    </p>
                    <div className="lab-btn-group">
                      <button type="button" className="lab-btn lab-btn-primary" onClick={() => void handleMenuSubmit()} disabled={menuLoading}>
                        {menuLoading ? 'Generando…' : 'Generar menú'}
                      </button>
                      <button type="button" className="lab-btn lab-btn-ghost" onClick={() => { if (lastMenuPayload) void handleMenuSubmit(lastMenuPayload); }} disabled={menuLoading || !lastMenuPayload} title="Repite la petición para probar cache HIT">
                        Repetir (caché)
                      </button>
                    </div>
                  </div>
                </section>

                <section className="lab-panel">
                  <h2>Resultado</h2>
                  {menuLoading && <p className="lab-loading">⏳ Generando menú con Gemini…</p>}
                  {menuError && !menuLoading && <div className="lab-error"><span>✕</span><span>{menuError}</span></div>}
                  {!menuLoading && !menuError && !menuResponse && <p className="lab-empty">Genera un menú para ver el resultado aquí.</p>}
                  {!menuLoading && menuResponse && <MenuResponsePanel data={menuResponse} />}
                </section>

                {menuRawJson && (
                  <section className="lab-panel">
                    <div className="lab-raw-toggle">
                      <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>JSON crudo — Menú</h2>
                      <button onClick={() => setShowMenuRaw((v) => !v)}>{showMenuRaw ? '▲ Ocultar' : '▼ Mostrar'}</button>
                    </div>
                    {showMenuRaw && <pre className="lab-raw-json">{menuRawJson}</pre>}
                  </section>
                )}
              </>
            )}

            {/* ── PROFILE EXPLANATION TAB ── */}
            {activeTab === 'profile' && (
              <>
                <section className="lab-panel">
                  <h2>Explicación de perfil</h2>
                  <div className="lab-form">
                    <div className="lab-field-row">
                      <div className="lab-field">
                        <label htmlFor="prof-bmr">TMB (kcal) *</label>
                        <input id="prof-bmr" type="number" min="1" value={profileForm.basalMetabolicRate} onChange={(e) => setProfileForm((p) => ({ ...p, basalMetabolicRate: e.target.value }))} placeholder="1600" disabled={profileLoading} required />
                      </div>
                      <div className="lab-field">
                        <label htmlFor="prof-tdee">TDEE (kcal) *</label>
                        <input id="prof-tdee" type="number" min="1" value={profileForm.totalDailyEnergyExpenditure} onChange={(e) => setProfileForm((p) => ({ ...p, totalDailyEnergyExpenditure: e.target.value }))} placeholder="2000" disabled={profileLoading} required />
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#8a8590', margin: 0 }}>
                      Perfil: objetivo <strong>{profile.objective}</strong> · {profile.caloriesTarget} kcal · {profile.proteinTarget || '—'}g prot · plan <strong>{profile.plan}</strong>
                    </p>
                    <div className="lab-btn-group">
                      <button type="button" className="lab-btn lab-btn-primary" onClick={() => void handleProfileExplanationSubmit()} disabled={profileLoading}>
                        {profileLoading ? 'Explicando…' : 'Explicar perfil'}
                      </button>
                      <button type="button" className="lab-btn lab-btn-ghost" onClick={() => { if (lastProfilePayload) void handleProfileExplanationSubmit(lastProfilePayload); }} disabled={profileLoading || !lastProfilePayload} title="Repite la petición para probar cache HIT">
                        Repetir (caché)
                      </button>
                    </div>
                  </div>
                </section>

                <section className="lab-panel">
                  <h2>Resultado</h2>
                  {profileLoading && <p className="lab-loading">⏳ Generando explicación con Gemini…</p>}
                  {profileError && !profileLoading && <div className="lab-error"><span>✕</span><span>{profileError}</span></div>}
                  {!profileLoading && !profileError && !profileResponse && <p className="lab-empty">Solicita una explicación para ver el resultado aquí.</p>}
                  {!profileLoading && profileResponse && <ProfileResponsePanel data={profileResponse} />}
                </section>

                {profileRawJson && (
                  <section className="lab-panel">
                    <div className="lab-raw-toggle">
                      <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>JSON crudo — Perfil</h2>
                      <button onClick={() => setShowProfileRaw((v) => !v)}>{showProfileRaw ? '▲ Ocultar' : '▼ Mostrar'}</button>
                    </div>
                    {showProfileRaw && <pre className="lab-raw-json">{profileRawJson}</pre>}
                  </section>
                )}
              </>
            )}

            {/* ── PLATE ANALYSIS TAB ── */}
            {activeTab === 'plate' && (
              <>
                <section className="lab-panel">
                  <h2>Análisis de plato</h2>
                  <div className="lab-form">
                    <div className="lab-file-input">
                      <label className="lab-file-label" htmlFor="plate-image">
                        <span className="lab-file-label-icon">📷</span>
                        <span className="lab-file-label-text">{plateFile ? plateFile.name : 'Seleccionar imagen'}</span>
                        <span className="lab-file-label-hint">jpeg · png · webp · máx. 5 MB</span>
                        <input id="plate-image" type="file" accept={ACCEPTED_TYPES} onChange={handleFileChange} disabled={plateLoading} />
                      </label>
                    </div>

                    <p className="lab-mock-hint">
                      Imágenes de prueba en <code>backend/data/mock-images/food/</code> — el navegador no puede leerlas directamente; selecciona el archivo manualmente.
                    </p>

                    {platePreviewUrl && (
                      <div className="lab-image-preview">
                        <img src={platePreviewUrl} alt="Preview del plato seleccionado" />
                      </div>
                    )}

                    <p style={{ fontSize: 12, color: '#8a8590', margin: 0 }}>
                      Perfil: objetivo <strong>{profile.objective}</strong> · {profile.caloriesTarget} kcal · plan <strong>{profile.plan}</strong>
                    </p>

                    <div className="lab-btn-group">
                      <button type="button" className="lab-btn lab-btn-primary" onClick={() => void handlePlateSubmit()} disabled={plateLoading || !plateFile}>
                        {plateLoading ? 'Analizando…' : 'Analizar plato'}
                      </button>
                      <button type="button" className="lab-btn lab-btn-ghost" onClick={() => { if (lastPlateFile) void handlePlateSubmit(lastPlateFile); }} disabled={plateLoading || !lastPlateFile} title="Repite con la misma imagen para probar cache HIT">
                        Repetir (caché)
                      </button>
                      <button type="button" className="lab-btn lab-btn-ghost" onClick={() => { setPlateFile(null); setPlatePreviewUrl(null); setPlateError(null); setPlateResponse(null); setPlateRawJson(null); setShowPlateRaw(false); }} disabled={plateLoading}>
                        Limpiar
                      </button>
                    </div>
                  </div>
                </section>

                <section className="lab-panel">
                  <h2>Resultado del análisis</h2>
                  {plateLoading && <p className="lab-loading">⏳ Analizando imagen con Gemini Vision…</p>}
                  {plateError && !plateLoading && <div className="lab-error"><span>✕</span><span>{plateError}</span></div>}
                  {!plateLoading && !plateError && !plateResponse && <p className="lab-empty">Sube una imagen para ver el análisis aquí.</p>}
                  {!plateLoading && plateResponse && <PlateResponsePanel data={plateResponse} />}
                </section>

                {plateRawJson && (
                  <section className="lab-panel">
                    <div className="lab-raw-toggle">
                      <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>JSON crudo — Análisis de plato</h2>
                      <button onClick={() => setShowPlateRaw((v) => !v)}>{showPlateRaw ? '▲ Ocultar' : '▼ Mostrar'}</button>
                    </div>
                    {showPlateRaw && <pre className="lab-raw-json">{plateRawJson}</pre>}
                  </section>
                )}
              </>
            )}

            {/* ── WEEKLY MENU TAB ── */}
            {activeTab === 'weekly' && (
              <>
                <section className="lab-panel">
                  <h2>Menú semanal async <span className="lab-badge">Pro</span></h2>
                  <div className="lab-form">
                    <div className="lab-field-row">
                      <div className="lab-field">
                        <label htmlFor="weekly-meals">Comidas/día (1–6)</label>
                        <input id="weekly-meals" type="number" min="1" max="6" value={weeklyMealsPerDay} onChange={(e) => setWeeklyMealsPerDay(e.target.value)} disabled={weeklySubmitLoading} />
                      </div>
                    </div>
                    <div className="lab-field">
                      <label htmlFor="weekly-notes">Notas <span className="lab-optional">opcional · máx. 1000 chars</span></label>
                      <textarea id="weekly-notes" maxLength={1000} placeholder="Restricciones, preferencias, alergias…" value={weeklyNotes} onChange={(e) => setWeeklyNotes(e.target.value)} disabled={weeklySubmitLoading} />
                    </div>
                    <p style={{ fontSize: 12, color: '#8a8590', margin: 0 }}>
                      Perfil: objetivo <strong>{profile.objective}</strong> · {profile.caloriesTarget} kcal · {profile.proteinTarget || '—'}g prot · plan <strong>{profile.plan}</strong>
                    </p>
                    <div className="lab-btn-group">
                      <button type="button" className="lab-btn lab-btn-primary" onClick={() => void handleWeeklySubmit()} disabled={weeklySubmitLoading}>
                        {weeklySubmitLoading ? 'Iniciando…' : 'Generar menú semanal'}
                      </button>
                      <button type="button" className="lab-btn lab-btn-ghost" onClick={() => { setWeeklyPlanId(''); setWeeklyPlanData(null); setWeeklyRawJson(null); setWeeklyError(null); weeklyPlanIdRef.current = ''; if (weeklyPollRef.current) { clearInterval(weeklyPollRef.current); weeklyPollRef.current = null; } }} disabled={weeklySubmitLoading}>
                        Limpiar
                      </button>
                    </div>
                  </div>
                </section>

                {weeklyError && <div className="lab-error"><span>✕</span><span>{weeklyError}</span></div>}

                {weeklyPlanId && (
                  <section className="lab-panel">
                    <h2>Estado del plan</h2>
                    <div className="weekly-plan-id">
                      <code>{weeklyPlanId}</code>
                    </div>

                    {!weeklyPlanData && (
                      <p className="lab-empty">Pulsa «Consultar progreso» o espera el auto-poll (cada 5 s).</p>
                    )}

                    {weeklyPlanData && (
                      <>
                        <div className="weekly-status-row">
                          <span className={`weekly-status-badge weekly-status-${weeklyPlanData.status}`}>{weeklyPlanData.status}</span>
                          {weeklyPlanData.status === 'generating' && (
                            <span className="weekly-polling-indicator">auto-poll cada 5 s</span>
                          )}
                        </div>
                        <div className="weekly-progress-bar-wrap">
                          <div className="weekly-progress-bar" style={{ width: `${weeklyPlanData.progress.percentage}%` }} />
                        </div>
                        <p className="weekly-progress-label">
                          {weeklyPlanData.progress.completedDays} / {weeklyPlanData.progress.totalDays} días ({weeklyPlanData.progress.percentage}%)
                        </p>
                      </>
                    )}

                    <div className="lab-btn-group" style={{ marginTop: 12 }}>
                      <button type="button" className="lab-btn lab-btn-primary" onClick={() => void pollWeeklyPlan(weeklyPlanId)} disabled={weeklyPollLoading}>
                        {weeklyPollLoading ? 'Consultando…' : 'Consultar progreso'}
                      </button>
                    </div>
                  </section>
                )}

                {weeklyPlanData && weeklyPlanData.days.length > 0 && (
                  <section className="lab-panel">
                    <h2>Días generados</h2>
                    <div className="weekly-days-list">
                      {weeklyPlanData.days.map((day) => (
                        <div key={day.dayNumber} className={`weekly-day-card weekly-day-${day.status}`}>
                          <div className="weekly-day-header">
                            <strong>Día {day.dayNumber}</strong>
                            <span className={`weekly-status-badge weekly-status-${day.status}`}>{day.status}</span>
                            {day.cached && <span className="weekly-cache-badge">CACHED</span>}
                            {day.dailyCalories > 0 && <span className="weekly-day-calories">{day.dailyCalories} kcal</span>}
                          </div>
                          {day.status === 'failed' && day.errorMessage && (
                            <p className="weekly-day-error">{day.errorMessage}</p>
                          )}
                          {day.meals.length > 0 && (
                            <div className="weekly-meals-list">
                              {day.meals.map((meal, i) => (
                                <div key={i} className="weekly-meal-item">
                                  <div className="weekly-meal-name">{meal.name}</div>
                                  <div className="weekly-meal-desc">{meal.description}</div>
                                  <div className="weekly-meal-macros">
                                    {meal.estimatedCalories} kcal · {meal.estimatedProtein}g P · {meal.estimatedCarbs}g HC · {meal.estimatedFat}g G
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {day.recommendations.length > 0 && (
                            <ul className="weekly-recommendations">
                              {day.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {weeklyPlanData && (
                  <section className="lab-panel">
                    <h2>Uso estimado</h2>
                    <div className="weekly-usage-grid">
                      <div className="weekly-usage-item">
                        <span className="weekly-usage-label">Llamadas planificadas</span>
                        <span className="weekly-usage-value">{weeklyPlanData.usageEstimation.providerCallsPlanned}</span>
                      </div>
                      <div className="weekly-usage-item">
                        <span className="weekly-usage-label">Llamadas completadas</span>
                        <span className="weekly-usage-value">{weeklyPlanData.usageEstimation.providerCallsCompleted}</span>
                      </div>
                      <div className="weekly-usage-item">
                        <span className="weekly-usage-label">Cache hits</span>
                        <span className="weekly-usage-value">{weeklyPlanData.usageEstimation.cacheHits}</span>
                      </div>
                      <div className="weekly-usage-item">
                        <span className="weekly-usage-label">Cache misses</span>
                        <span className="weekly-usage-value">{weeklyPlanData.usageEstimation.cacheMisses}</span>
                      </div>
                      <div className="weekly-usage-item weekly-usage-note">
                        <span className="weekly-usage-label">Tokens reales</span>
                        <span className="weekly-usage-value">No disponible (Token Taximeter pendiente)</span>
                      </div>
                    </div>
                  </section>
                )}

                {weeklyRawJson && (
                  <section className="lab-panel">
                    <div className="lab-raw-toggle">
                      <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>JSON crudo — Menú semanal</h2>
                      <button onClick={() => setShowWeeklyRaw((v) => !v)}>{showWeeklyRaw ? '▲ Ocultar' : '▼ Mostrar'}</button>
                    </div>
                    {showWeeklyRaw && <pre className="lab-raw-json">{weeklyRawJson}</pre>}
                  </section>
                )}
              </>
            )}

            {/* ── CONVERSATIONS TAB ── */}
            {activeTab === 'conversations' && (
              <>
                <section className="lab-panel">
                  <h2>Leer conversación</h2>
                  <div className="lab-form">
                    <div className="lab-field">
                      <label htmlFor="conv-input">conversationId</label>
                      <input
                        id="conv-input"
                        value={convInput}
                        onChange={(e) => setConvInput(e.target.value)}
                        placeholder="conv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        disabled={convLoading}
                      />
                    </div>
                    {lastConversationId && (
                      <p style={{ fontSize: 11, color: '#8a8590', margin: 0 }}>
                        Último ID disponible: <code>{lastConversationId}</code>
                      </p>
                    )}
                    <div className="lab-btn-group">
                      <button type="button" className="lab-btn lab-btn-primary" onClick={() => void handleConvLoad()} disabled={convLoading || !convInput.trim()}>
                        {convLoading ? 'Cargando…' : 'Cargar conversación'}
                      </button>
                      <button type="button" className="lab-btn lab-btn-ghost" onClick={() => setConvInput(lastConversationId)} disabled={!lastConversationId || convLoading} title="Usa el último conversationId generado en esta sesión">
                        Usar último ID
                      </button>
                    </div>
                  </div>
                </section>

                <section className="lab-panel">
                  <h2>Conversación</h2>
                  {convLoading && <p className="lab-loading">⏳ Cargando conversación…</p>}
                  {convError && !convLoading && <div className="lab-error"><span>✕</span><span>{convError}</span></div>}
                  {!convLoading && !convError && !convData && <p className="lab-empty">Introduce un conversationId para ver la conversación aquí.</p>}
                  {!convLoading && convData && <ConversationPanel data={convData} />}
                </section>

                {convRawJson && (
                  <section className="lab-panel">
                    <div className="lab-raw-toggle">
                      <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>JSON crudo — Conversación</h2>
                      <button onClick={() => setShowConvRaw((v) => !v)}>{showConvRaw ? '▲ Ocultar' : '▼ Mostrar'}</button>
                    </div>
                    {showConvRaw && <pre className="lab-raw-json">{convRawJson}</pre>}
                  </section>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
