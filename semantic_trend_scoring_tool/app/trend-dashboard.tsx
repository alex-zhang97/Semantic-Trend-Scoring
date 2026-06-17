"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RadarChart, TrendLineChart } from "./trend-charts";
import {
  DEFAULT_OPTIONS,
  PILLARS,
  SEED_SNAPSHOTS,
  STORAGE_KEY,
  buildSnapshotFromResponse,
  getCompactSnapshotLabel,
  getOpportunityScore,
  mergeSnapshotsWithSeedSnapshots,
  sortSnapshots,
  type ExtractionOptions,
  type PillarId,
  type TopicExtractionResponse,
  type TopicRequestDocument,
  type TrendSnapshot,
} from "./trend-data";

const MAX_TOTAL_CHARACTERS = 120_000;

export function TrendDashboard() {
  const [snapshots, setSnapshots] = useState<TrendSnapshot[]>(() => SEED_SNAPSHOTS);
  const [selectedDate, setSelectedDate] = useState(() =>
    SEED_SNAPSHOTS[SEED_SNAPSHOTS.length - 1]?.date ?? DEFAULT_OPTIONS.snapshotDate,
  );
  const [selectedPillarId, setSelectedPillarId] = useState<PillarId>("science");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ExtractionOptions>(DEFAULT_OPTIONS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) {
        return;
      }

      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        if (stored) {
          const parsed = JSON.parse(stored) as TrendSnapshot[];

          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = mergeSnapshotsWithSeedSnapshots(parsed);
            setSnapshots(merged);
            setSelectedDate(merged[merged.length - 1].date);
          }
        }
      } catch {
        setError("Stored snapshots could not be read; showing generated seed history.");
      } finally {
        setIsLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  }, [isLoaded, snapshots]);

  const sortedSnapshots = useMemo(() => sortSnapshots(snapshots), [snapshots]);
  const selectedIndex = Math.max(
    0,
    sortedSnapshots.findIndex((snapshot) => snapshot.date === selectedDate),
  );
  const selectedSnapshot = sortedSnapshots[selectedIndex] ?? sortedSnapshots[0];
  const selectedPillar =
    selectedSnapshot?.pillars.find((pillar) => pillar.id === selectedPillarId) ??
    selectedSnapshot?.pillars[0];
  const totalCharacters = settings.documents.reduce(
    (sum, document) => sum + document.text.length,
    0,
  );
  const documentLimitReached = totalCharacters > MAX_TOTAL_CHARACTERS;
  const activeWarnings = [
    ...(selectedSnapshot?.warnings ?? []),
    ...(error ? [error] : []),
  ];

  async function runExtraction() {
    setError(null);

    if (documentLimitReached) {
      setError("Document text exceeds the 120,000 character API limit.");
      return;
    }

    if (settings.documents.length === 0) {
      setError("Add at least one source document before extracting topics.");
      return;
    }

    setIsExtracting(true);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (settings.bearerToken.trim()) {
        headers.Authorization = `Bearer ${settings.bearerToken.trim()}`;
      }

      const response = await fetch("/api/topics", {
        method: "POST",
        headers,
        body: JSON.stringify({
          documents: settings.documents,
          options: {
            maxTopicsPerDocument: settings.maxTopicsPerDocument,
            maxCorpusTopics: settings.maxCorpusTopics,
          },
        }),
      });
      const payload = (await response.json()) as TopicExtractionResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Topic extraction failed.");
      }

      const snapshot = buildSnapshotFromResponse({
        date: settings.snapshotDate,
        response: payload,
        documents: settings.documents,
      });

      setSnapshots((current) =>
        sortSnapshots([
          ...current.filter((candidate) => candidate.date !== snapshot.date),
          snapshot,
        ]),
      );
      setSelectedDate(snapshot.date);
      setSettingsOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Topic extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  }

  function updateDocument(
    documentId: string,
    key: keyof TopicRequestDocument,
    value: string,
  ) {
    setSettings((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === documentId
          ? {
              ...document,
              [key]: value,
            }
          : document,
      ),
    }));
  }

  function addDocument() {
    setSettings((current) => {
      const nextIndex = current.documents.length + 1;

      return {
        ...current,
        documents: [
          ...current.documents,
          {
            id: `doc-${nextIndex}`,
            source: "Manual source",
            timestamp: `${current.snapshotDate}T12:00:00.000Z`,
            text: "",
          },
        ],
      };
    });
  }

  function removeDocument(documentId: string) {
    setSettings((current) => ({
      ...current,
      documents: current.documents.filter((document) => document.id !== documentId),
    }));
  }

  function exportSnapshots() {
    const blob = new Blob([JSON.stringify(sortedSnapshots, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "semantic-trend-snapshots.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            ST
          </div>
          <div>
            <h1>Semantic Trend Scoring</h1>
            <p>{selectedSnapshot?.label ?? "No snapshot selected"}</p>
          </div>
        </div>

        <div className="topbar-actions" aria-label="Dashboard actions">
          <StatusPill snapshot={selectedSnapshot} />
          <IconButton label="Import and extraction settings" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
          <IconButton label="Export snapshots" onClick={exportSnapshots}>
            <DownloadIcon />
          </IconButton>
        </div>
      </header>

      {activeWarnings.length > 0 ? (
        <section className="warning-strip" aria-live="polite">
          <WarningIcon />
          <span>{activeWarnings[0]}</span>
        </section>
      ) : null}

      <section className="analytics-grid" aria-label="Trend analytics">
        <div className="chart-stage">
          <div className="stage-header">
            <div>
              <p className="section-kicker">Selected date</p>
              <h2>{selectedSnapshot?.label}</h2>
            </div>
            <div className="legend-row" aria-label="Pillar legend">
              {PILLARS.map((pillar) => (
                <button
                  key={pillar.id}
                  type="button"
                  className={
                    pillar.id === selectedPillarId ? "legend-item is-active" : "legend-item"
                  }
                  onClick={() => setSelectedPillarId(pillar.id)}
                >
                  <span style={{ background: pillar.color }} />
                  {pillar.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="radar-frame">
            {selectedSnapshot ? (
              <RadarChart
                pillars={selectedSnapshot.pillars}
                selectedPillarId={selectedPillarId}
                onSelectPillar={setSelectedPillarId}
              />
            ) : null}
          </div>

          <SnapshotDatePicker
            snapshots={sortedSnapshots}
            selectedIndex={selectedIndex}
            selectedDate={selectedSnapshot?.date ?? selectedDate}
            onSelectDate={setSelectedDate}
          />

          <div className="timeline-frame">
            <div className="timeline-title-row">
              <div>
                <p className="section-kicker">Score trajectory</p>
                <h3>Daily pillar movement</h3>
              </div>
              <span className="focus-pill">
                Focus: {selectedPillar?.shortLabel ?? "Pillar"}
              </span>
            </div>
            <TrendLineChart
              snapshots={sortedSnapshots}
              selectedDate={selectedDate}
              selectedPillarId={selectedPillarId}
              onSelectDate={setSelectedDate}
            />
          </div>
        </div>

        <aside className="inspector-panel" aria-label="Pillar breakdown">
          {selectedPillar ? (
            <>
              <PillarInspector snapshot={selectedSnapshot} pillar={selectedPillar} />
              <ChatbotCard
                key={`${selectedSnapshot?.date}-${selectedPillar.id}`}
                snapshot={selectedSnapshot}
                pillar={selectedPillar}
              />
            </>
          ) : null}
        </aside>
      </section>

      {settingsOpen ? (
        <SettingsDrawer
          settings={settings}
          totalCharacters={totalCharacters}
          documentLimitReached={documentLimitReached}
          isExtracting={isExtracting}
          onClose={() => setSettingsOpen(false)}
          onRun={runExtraction}
          onChange={setSettings}
          onAddDocument={addDocument}
          onRemoveDocument={removeDocument}
          onUpdateDocument={updateDocument}
        />
      ) : null}
    </main>
  );
}

function SnapshotDatePicker({
  snapshots,
  selectedIndex,
  selectedDate,
  onSelectDate,
}: {
  snapshots: TrendSnapshot[];
  selectedIndex: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const selectedSnapshot = snapshots[selectedIndex];
  const firstDate = snapshots[0]?.date ?? selectedDate;
  const lastDate = snapshots[snapshots.length - 1]?.date ?? selectedDate;
  const selectNearestDate = (date: string) =>
    onSelectDate(nearestSnapshotDate(snapshots, date));

  return (
    <div className="date-picker-card">
      <div className="date-picker-meta">
        <span>Date</span>
        <strong>{selectedSnapshot?.label}</strong>
      </div>
      <div className="date-picker-row">
        <input
          aria-label="Select trend snapshot date"
          type="date"
          min={firstDate}
          max={lastDate}
          value={selectedDate}
          onChange={(event) => selectNearestDate(event.target.value)}
          onInput={(event) => selectNearestDate(event.currentTarget.value)}
        />
        <span>
          {getCompactSnapshotLabel(firstDate, true)} to {getCompactSnapshotLabel(lastDate, true)}
        </span>
      </div>
    </div>
  );
}

function PillarInspector({
  snapshot,
  pillar,
}: {
  snapshot?: TrendSnapshot;
  pillar: NonNullable<TrendSnapshot["pillars"][number]>;
}) {
  const topContribution = pillar.contributions[0];
  const opportunity = getOpportunityScore(pillar);

  return (
    <>
      <div className="inspector-head">
        <p className="section-kicker">Pillar breakdown</p>
        <h2>{pillar.label}</h2>
        <div className="score-lockup">
          <strong>{Math.round(pillar.score * 100)}</strong>
          <span>water-cooler dominance</span>
        </div>
      </div>

      <section className="opportunity-card" aria-label={`Opportunity for ${opportunity.companyName}`}>
        <div className="opportunity-head">
          <div>
            <p className="section-kicker">Opportunity for {opportunity.companyName}</p>
            <h3>{opportunity.industry}</h3>
          </div>
          <div className="opportunity-score">
            <strong>{opportunity.scoreOutOf10.toFixed(1)}</strong>
            <span>/10</span>
          </div>
        </div>
        <div className="opportunity-recommendation">
          <span className={`recommendation-pill is-${opportunity.tier.toLowerCase()}`}>
            {opportunity.tier}
          </span>
          <p>{opportunity.recommendation}</p>
        </div>
        <div className="opportunity-metrics">
          <div>
            <span>Industry fit</span>
            <strong>{Math.round(opportunity.industryFit * 100)}</strong>
          </div>
          <div>
            <span>Water-cooler</span>
            <strong>{Math.round(opportunity.waterCoolerDominance * 100)}</strong>
          </div>
        </div>
      </section>

      <div className="contribution-summary">
        <span style={{ background: pillar.color }} />
        <p>
          {topContribution
            ? `${topContribution.label} is the strongest contributor for ${snapshot?.label}.`
            : "No matched corpus topics contributed to this pillar on the selected date."}
        </p>
      </div>

      <div className="contribution-list">
        {pillar.contributions.length > 0 ? (
          pillar.contributions.map((topicValue) => (
            <article key={topicValue.label} className="contribution-row">
              <div className="contribution-row-head">
                <div>
                  <h3>{topicValue.label}</h3>
                  <p>
                    {topicValue.documentCount} docs · confidence{" "}
                    {Math.round(topicValue.confidence * 100)} · relevance{" "}
                    {Math.round(topicValue.relevance * 100)}
                  </p>
                </div>
                <strong>{Math.round(topicValue.weight * 100)}%</strong>
              </div>
              <div className="contribution-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.max(5, topicValue.weight * 100)}%`,
                    background: pillar.color,
                  }}
                />
              </div>
              <p className="evidence-copy">{topicValue.evidence[0]}</p>
              <div className="document-links">
                {topicValue.documentIds.map((documentId) => (
                  <span key={documentId}>{documentId}</span>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h3>No topic matches yet</h3>
            <p>Run extraction with more source documents to populate this pillar.</p>
          </div>
        )}
      </div>

    </>
  );
}

function ChatbotCard({
  snapshot,
  pillar,
}: {
  snapshot?: TrendSnapshot;
  pillar: NonNullable<TrendSnapshot["pillars"][number]>;
}) {
  const opportunity = getOpportunityScore(pillar);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: `${pillar.shortLabel} is at ${Math.round(
        pillar.score * 100,
      )} water-cooler dominance on ${snapshot?.label ?? "this date"}. Best Western is in ${opportunity.tier.toLowerCase()} range at ${opportunity.scoreOutOf10.toFixed(1)}/10.`,
    },
  ]);

  function submitMessage() {
    const question = draft.trim();

    if (!question) {
      return;
    }

    const topTopic = pillar.contributions[0]?.label ?? pillar.shortLabel;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: question,
      },
      {
        role: "assistant",
        text: `${topTopic} is the leading signal. ${opportunity.recommendation}`,
      },
    ]);
    setDraft("");
  }

  return (
    <section className="chatbot-card" aria-label="Trend analyst chatbot">
      <div className="chatbot-head">
        <div>
          <p className="section-kicker">Trend analyst</p>
          <h3>Best Western chat</h3>
        </div>
        <ChatIcon />
      </div>
      <div className="chatbot-thread">
        {messages.map((message, index) => (
          <p key={`${message.role}-${index}`} className={`chat-message is-${message.role}`}>
            {message.text}
          </p>
        ))}
      </div>
      <form
        className="chatbot-input-row"
        onSubmit={(event) => {
          event.preventDefault();
          submitMessage();
        }}
      >
        <input
          aria-label="Ask the trend analyst"
          value={draft}
          placeholder="Ask about timing, offers, or operations"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" aria-label="Send chat message" disabled={!draft.trim()}>
          <SendIcon />
        </button>
      </form>
    </section>
  );
}

function SettingsDrawer({
  settings,
  totalCharacters,
  documentLimitReached,
  isExtracting,
  onClose,
  onRun,
  onChange,
  onAddDocument,
  onRemoveDocument,
  onUpdateDocument,
}: {
  settings: ExtractionOptions;
  totalCharacters: number;
  documentLimitReached: boolean;
  isExtracting: boolean;
  onClose: () => void;
  onRun: () => void;
  onChange: (settings: ExtractionOptions) => void;
  onAddDocument: () => void;
  onRemoveDocument: (documentId: string) => void;
  onUpdateDocument: (
    documentId: string,
    key: keyof TopicRequestDocument,
    value: string,
  ) => void;
}) {
  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="Extraction settings">
      <button className="drawer-scrim" type="button" aria-label="Close settings" onClick={onClose} />
      <section className="settings-drawer">
        <div className="drawer-header">
          <div>
            <p className="section-kicker">Import & extraction</p>
            <h2>Source settings</h2>
          </div>
          <IconButton label="Close settings" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        <div className="settings-grid">
          <label>
            Snapshot date
            <input
              type="date"
              value={settings.snapshotDate}
              onChange={(event) =>
                onChange({
                  ...settings,
                  snapshotDate: event.target.value,
                })
              }
            />
          </label>
          <label>
            Bearer token
            <input
              type="password"
              placeholder="Optional"
              value={settings.bearerToken}
              onChange={(event) =>
                onChange({
                  ...settings,
                  bearerToken: event.target.value,
                })
              }
            />
          </label>
          <label>
            Topics per document
            <input
              type="number"
              min={1}
              max={10}
              value={settings.maxTopicsPerDocument}
              onChange={(event) =>
                onChange({
                  ...settings,
                  maxTopicsPerDocument: clamp(Number(event.target.value), 1, 10),
                })
              }
            />
          </label>
          <label>
            Corpus topics
            <input
              type="number"
              min={1}
              max={25}
              value={settings.maxCorpusTopics}
              onChange={(event) =>
                onChange({
                  ...settings,
                  maxCorpusTopics: clamp(Number(event.target.value), 1, 25),
                })
              }
            />
          </label>
        </div>

        <div className={documentLimitReached ? "limit-meter is-over" : "limit-meter"}>
          <span>Characters</span>
          <strong>
            {totalCharacters.toLocaleString()} / {MAX_TOTAL_CHARACTERS.toLocaleString()}
          </strong>
        </div>

        <div className="document-editor-list">
          <div className="drawer-subhead">
            <h3>Source documents</h3>
            <IconButton label="Add document" onClick={onAddDocument}>
              <PlusIcon />
            </IconButton>
          </div>

          {settings.documents.map((document) => (
            <article key={document.id} className="document-editor">
              <div className="document-editor-head">
                <input
                  aria-label="Document ID"
                  value={document.id}
                  onChange={(event) => onUpdateDocument(document.id, "id", event.target.value)}
                />
                <IconButton label={`Remove ${document.id}`} onClick={() => onRemoveDocument(document.id)}>
                  <TrashIcon />
                </IconButton>
              </div>
              <input
                aria-label="Document source"
                placeholder="Source"
                value={document.source ?? ""}
                onChange={(event) => onUpdateDocument(document.id, "source", event.target.value)}
              />
              <textarea
                aria-label={`${document.id} text`}
                placeholder="Paste source text..."
                value={document.text}
                onChange={(event) => onUpdateDocument(document.id, "text", event.target.value)}
              />
            </article>
          ))}
        </div>

        <div className="drawer-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onRun}
            disabled={isExtracting || documentLimitReached}
          >
            {isExtracting ? "Extracting..." : "Extract topics"}
          </button>
        </div>
      </section>
    </div>
  );
}

function StatusPill({ snapshot }: { snapshot?: TrendSnapshot }) {
  const degraded = snapshot?.degraded;
  const seed = isYearSeedSnapshot(snapshot);

  return (
    <div className={degraded ? "status-pill is-warning" : "status-pill"}>
      <span />
      {seed ? "Seed data" : degraded ? "Local fallback" : "OpenAI"}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="icon-button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
      <path d="M19.2 13.3c.1-.4.1-.9.1-1.3s0-.9-.1-1.3l2-1.5-2-3.5-2.4 1a8.6 8.6 0 0 0-2.2-1.3L14.3 3h-4.6l-.4 2.4c-.8.3-1.5.7-2.2 1.3l-2.4-1-2 3.5 2 1.5c-.1.4-.1.9-.1 1.3s0 .9.1 1.3l-2 1.5 2 3.5 2.4-1c.7.6 1.4 1 2.2 1.3l.4 2.4h4.6l.4-2.4c.8-.3 1.5-.7 2.2-1.3l2.4 1 2-3.5-2.1-1.5Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
      <path d="M5 17v2h14v-2" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 4 9 16H3L12 4Z" />
      <path d="M12 9v5m0 3h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7l1-3h4l1 3" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5h16v10.8H9.5L5.2 20v-3.7H4V5.5Z" />
      <path d="M8 9h8M8 12.5h5" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 12 16-8-4.5 16-3.2-6.3L4 12Z" />
      <path d="m12.3 13.7 3.2-3.2" />
    </svg>
  );
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function isYearSeedSnapshot(snapshot?: TrendSnapshot) {
  return Boolean(snapshot?.requestId.startsWith("year-seed-"));
}

function nearestSnapshotDate(snapshots: TrendSnapshot[], requestedDate: string) {
  if (snapshots.some((snapshot) => snapshot.date === requestedDate)) {
    return requestedDate;
  }

  const requestedTime = Date.parse(`${requestedDate}T00:00:00.000Z`);

  if (Number.isNaN(requestedTime)) {
    return snapshots[0]?.date ?? requestedDate;
  }

  let nearest = snapshots[0]?.date ?? requestedDate;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const snapshot of snapshots) {
    const distance = Math.abs(Date.parse(`${snapshot.date}T00:00:00.000Z`) - requestedTime);

    if (distance < nearestDistance) {
      nearest = snapshot.date;
      nearestDistance = distance;
    }
  }

  return nearest;
}
