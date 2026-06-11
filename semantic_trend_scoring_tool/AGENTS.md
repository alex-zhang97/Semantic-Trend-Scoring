<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# AGENTS.md

## Project: American Water Cooler Index

### Mission

Build a system that measures and visualizes what is dominating the American national conversation at any point in time.

The primary output is a radar chart representing the relative strength of several conversation pillars:

- Politics & Civic Life
- Sports & Athletics
- Entertainment & Pop Culture
- Science & Technology
- Business & Finance
- Lifestyle & Wellness

The system must answer:

1. What is America talking about right now?
2. Why is each pillar rated the way it is?
3. What did the conversation landscape look like at a previous point in time?

---

# System Philosophy

The system separates two independent problems:

## Problem 1: Attention

How much attention is a topic receiving?

Measured through:

- Search volume
- Social engagement
- News coverage
- Wikipedia pageviews
- Cross-source presence
- Growth rate

## Problem 2: Classification

What category does the topic belong to?

Measured through:

- Embeddings
- Topic clustering
- Semantic classification

Embeddings MUST NOT be used as the primary attention signal.

Embeddings are only used for:

- Topic deduplication
- Topic clustering
- Pillar classification

---

# Architecture

```text
Data Sources
    ↓
Ingestion
    ↓
Topic Extraction
    ↓
Attention Scoring
    ↓
Pillar Classification
    ↓
Pillar Aggregation
    ↓
Explanation Generation
    ↓
Storage
    ↓
API
    ↓
Frontend
```

---

# Agent Responsibilities

## Agent: Ingestion

Responsible for collecting data from external sources.

### Inputs

- Google Trends
- Reddit
- GDELT
- News APIs
- Wikipedia Pageviews

### Outputs

Raw signal records:

```ts
{
  source: string;
  timestamp: Date;
  title: string;
  content?: string;
  engagement?: number;
  url?: string;
}
```

### Rules

- Preserve original source metadata.
- Never mutate raw source data.
- Store ingestion timestamps.

---

## Agent: Topic Extraction

Responsible for converting raw signals into canonical topics.

### Examples

```text
"NBA Finals Game 4"
"Thunder vs Pacers"

→ NBA Finals
```

```text
"Nvidia Earnings"
"Nvidia Quarterly Results"

→ Nvidia Earnings
```

### Responsibilities

- Deduplication
- Clustering
- Topic normalization
- Entity extraction

### Output

```ts
{
  id: string;
  name: string;
  summary: string;
}
```

---

## Agent: Attention Scoring

Responsible for measuring public attention.

### Inputs

Topics and source signals.

### Signals

#### Volume

- Mentions
- Searches
- Views

#### Velocity

Rate of growth over time.

#### Acceleration

Change in velocity.

#### Diversity

Number of independent sources discussing topic.

#### Persistence

Duration of sustained attention.

### Formula

Example only:

```text
attention =
0.45 * volume +
0.35 * velocity +
0.10 * diversity +
0.10 * persistence
```

All source metrics should be normalized against historical baselines.

### Output

```ts
{
  topicId: string;
  attentionScore: number;
}
```

---

## Agent: Pillar Classification

Responsible for assigning topics to pillars.

### Example

```text
Nvidia Earnings

Technology: 0.8
Business: 0.7
```

```text
AI Regulation

Politics: 0.6
Technology: 0.8
Business: 0.3
```

### Rules

- Soft classification preferred.
- Multiple pillars allowed.
- Weights should sum to <= 1.0.

### Output

```ts
{
  topicId: string;
  pillarWeights: {
    politics: number;
    sports: number;
    entertainment: number;
    technology: number;
    business: number;
    lifestyle: number;
  };
}
```

---

## Agent: Aggregation

Responsible for generating pillar scores.

### Formula

```text
pillar_score =
Σ(topic_attention × pillar_weight)
```

### Normalization

Convert results into:

```text
0–100 scale
```

for radar visualization.

### Output

```ts
{
  timestamp: Date;
  scores: {
    politics: number;
    sports: number;
    entertainment: number;
    technology: number;
    business: number;
    lifestyle: number;
  };
}
```

---

## Agent: Explanation Engine

Responsible for explaining scores.

### Requirements

Every pillar score must be explainable.

Store:

- Top contributing topics
- Contribution percentages
- Supporting evidence
- Source breakdown

### Example

```json
{
  "pillar": "Technology",
  "score": 84,
  "drivers": [
    {
      "topic": "OpenAI Launch",
      "contribution": 31
    }
  ]
}
```

### Goal

A user should always be able to answer:

"Why is Technology 84?"

without inspecting raw data.

---

# Database

Minimum entities:

## topics

```ts
id
name
summary
createdAt
```

## topic_scores

```ts
topicId
timestamp
attentionScore
```

## topic_pillars

```ts
topicId
pillar
weight
```

## pillar_scores

```ts
timestamp
pillar
score
```

## evidence

```ts
topicId
source
title
url
capturedAt
```

---

# API Design

## Current Radar

```http
GET /api/radar/current
```

Returns latest radar state.

## Historical Radar

```http
GET /api/radar/history
```

Query params:

```text
start
end
interval
```

## Pillar Drivers

```http
GET /api/pillars/:pillar/drivers
```

Returns explanation data.

## Topic Evidence

```http
GET /api/topics/:id/evidence
```

Returns supporting source material.

---

# Frontend Requirements

## Dashboard

Display:

- Current radar chart
- Pillar rankings
- Top drivers

## Historical View

Display:

- Date selector
- Historical radar snapshots
- Time-series evolution

## Drilldown View

Display:

- Pillar explanation
- Topic contributions
- Source evidence

---

# MVP Scope

Must Have:

- Reddit ingestion
- News ingestion
- Wikipedia pageviews
- Topic clustering
- Attention scoring
- Radar visualization
- Historical snapshots
- Explanation panel

Nice To Have:

- Google Trends
- YouTube Trending
- TikTok
- X/Twitter
- Real-time streaming

Not Required:

- Kafka
- Spark
- Distributed processing
- Massive vector databases

Favor simplicity over scale.

A working explainable prototype is more valuable than a highly distributed architecture.
<!-- END:nextjs-agent-rules -->
