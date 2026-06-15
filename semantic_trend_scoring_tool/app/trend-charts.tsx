import type { PillarId, PillarScore, TrendSnapshot } from "./trend-data";
import { PILLARS, scoreForPillar } from "./trend-data";

type RadarChartProps = {
  pillars: PillarScore[];
  selectedPillarId: PillarId;
  onSelectPillar: (pillarId: PillarId) => void;
};

type TrendLineChartProps = {
  snapshots: TrendSnapshot[];
  selectedDate: string;
  selectedPillarId: PillarId;
  onSelectDate: (date: string) => void;
};

const RADAR_SIZE = 520;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 166;

export function RadarChart({
  pillars,
  selectedPillarId,
  onSelectPillar,
}: RadarChartProps) {
  const rings = [0.25, 0.5, 0.75, 1];
  const polygonPoints = pillars
    .map((pillar, index) =>
      polarPoint(index, pillars.length, RADAR_RADIUS * pillar.score, RADAR_CENTER),
    )
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <svg
      className="radar-chart"
      viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
      role="img"
      aria-label="Radar chart comparing pillar scores"
    >
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="46%" r="64%">
          <stop offset="0%" stopColor="#2f8a88" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2f8a88" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      {rings.map((ring) => {
        const ringPoints = pillars
          .map((_, index) =>
            polarPoint(index, pillars.length, RADAR_RADIUS * ring, RADAR_CENTER),
          )
          .map((point) => `${point.x},${point.y}`)
          .join(" ");

        return (
          <polygon
            key={ring}
            points={ringPoints}
            className="radar-ring"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {pillars.map((pillar, index) => {
        const outer = polarPoint(index, pillars.length, RADAR_RADIUS, RADAR_CENTER);

        return (
          <line
            key={pillar.id}
            x1={RADAR_CENTER}
            y1={RADAR_CENTER}
            x2={outer.x}
            y2={outer.y}
            className="radar-axis"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <polygon points={polygonPoints} fill="url(#radarFill)" className="radar-area" />
      <polyline points={`${polygonPoints} ${polygonPoints.split(" ")[0]}`} className="radar-line" />
      {pillars.map((pillar, index) => {
        const point = polarPoint(
          index,
          pillars.length,
          RADAR_RADIUS * pillar.score,
          RADAR_CENTER,
        );
        const label = polarPoint(index, pillars.length, RADAR_RADIUS + 56, RADAR_CENTER);
        const selected = pillar.id === selectedPillarId;

        return (
          <g key={pillar.id}>
            <circle
              className="radar-hit-target"
              cx={point.x}
              cy={point.y}
              r={18}
              fill="transparent"
              onClick={() => onSelectPillar(pillar.id)}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={selected ? 7 : 5}
              fill={pillar.color}
              stroke="#ffffff"
              strokeWidth="3"
              onClick={() => onSelectPillar(pillar.id)}
            />
            <g
              className={selected ? "radar-label is-selected" : "radar-label"}
              onClick={() => onSelectPillar(pillar.id)}
            >
              <text
                x={label.x}
                y={label.y - 8}
                textAnchor={textAnchorFor(label.x)}
              >
                {splitPillarLabel(pillar.label).map((line, lineIndex) => (
                  <tspan key={line} x={label.x} dy={lineIndex === 0 ? 0 : 15}>
                    {line}
                  </tspan>
                ))}
              </text>
              <text
                x={label.x}
                y={label.y + 25}
                textAnchor={textAnchorFor(label.x)}
                className="radar-label-score"
              >
                {Math.round(pillar.score * 100)}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export function TrendLineChart({
  snapshots,
  selectedDate,
  selectedPillarId,
  onSelectDate,
}: TrendLineChartProps) {
  const width = 760;
  const height = 300;
  const padding = { top: 24, right: 28, bottom: 40, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xForIndex = (index: number) =>
    padding.left + (plotWidth * index) / Math.max(1, snapshots.length - 1);
  const yForScore = (score: number) => padding.top + plotHeight * (1 - score);
  const selectedIndex = Math.max(
    0,
    snapshots.findIndex((snapshot) => snapshot.date === selectedDate),
  );

  return (
    <svg
      className="timeline-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Line chart showing pillar scores over time"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((value) => {
        const y = yForScore(value);

        return (
          <g key={value}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              className="timeline-grid"
              vectorEffect="non-scaling-stroke"
            />
            <text x={16} y={y + 4} className="timeline-axis-label">
              {Math.round(value * 100)}
            </text>
          </g>
        );
      })}
      {PILLARS.map((pillar) => {
        const points = snapshots
          .map((snapshot, index) => {
            const score = scoreForPillar(snapshot, pillar.id);
            return `${xForIndex(index)},${yForScore(score)}`;
          })
          .join(" ");
        const active = pillar.id === selectedPillarId;

        return (
          <polyline
            key={pillar.id}
            points={points}
            fill="none"
            stroke={pillar.color}
            strokeWidth={active ? 3 : 1.8}
            opacity={active ? 1 : 0.46}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {snapshots.map((snapshot, index) => {
        const x = xForIndex(index);
        const selected = snapshot.date === selectedDate;

        return (
          <g key={snapshot.date}>
            <line
              x1={x}
              y1={padding.top}
              x2={x}
              y2={height - padding.bottom}
              className={selected ? "timeline-marker is-selected" : "timeline-marker"}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x}
              cy={yForScore(scoreForPillar(snapshot, selectedPillarId))}
              r={selected ? 6 : 4}
              className={selected ? "timeline-dot is-selected" : "timeline-dot"}
              style={{ color: PILLARS.find((pillar) => pillar.id === selectedPillarId)?.color }}
              onClick={() => onSelectDate(snapshot.date)}
            />
            <rect
              x={x - 18}
              y={padding.top}
              width={36}
              height={plotHeight}
              fill="transparent"
              onClick={() => onSelectDate(snapshot.date)}
            />
          </g>
        );
      })}
      <text x={padding.left} y={height - 10} className="timeline-date-label">
        {snapshots[0]?.label.replace(", 2026", "")}
      </text>
      <text
        x={xForIndex(selectedIndex)}
        y={height - 10}
        textAnchor="middle"
        className="timeline-date-label is-selected"
      >
        {snapshots[selectedIndex]?.label.replace(", 2026", "")}
      </text>
      <text
        x={width - padding.right}
        y={height - 10}
        textAnchor="end"
        className="timeline-date-label"
      >
        {snapshots[snapshots.length - 1]?.label.replace(", 2026", "")}
      </text>
    </svg>
  );
}

function polarPoint(index: number, total: number, radius: number, center: number) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;

  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function textAnchorFor(x: number) {
  if (Math.abs(x - RADAR_CENTER) < 20) {
    return "middle";
  }

  return x > RADAR_CENTER ? "start" : "end";
}

function splitPillarLabel(label: string) {
  if (label === "Entertainment & Pop Culture") {
    return ["Entertainment", "& Pop Culture"];
  }

  if (label === "Science & Technology") {
    return ["Science", "& Technology"];
  }

  if (label === "Politics & Civic Life") {
    return ["Politics", "& Civic Life"];
  }

  if (label === "Sports & Athletics") {
    return ["Sports", "& Athletics"];
  }

  if (label === "Business & Finance") {
    return ["Business", "& Finance"];
  }

  return ["Lifestyle", "& Wellness"];
}
