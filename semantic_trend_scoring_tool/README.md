# Semantic Trend Scoring Tool

Next.js dashboard and API routes for semantic trend extraction and topic-level public attention scoring.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the dashboard.

## Authentication

Both API routes support optional bearer authentication. Set `TOPIC_API_TOKEN` to require requests to include:

```http
Authorization: Bearer <token>
```

## Attention Scoring API

`POST /api/attention` scores public attention for already identified topics. It normalizes each supplied metric against its historical baseline, averages the provided volume signals, and applies default component weights.

Default weights:

```json
{
  "volume": 0.4,
  "velocity": 0.3,
  "acceleration": 0.1,
  "diversity": 0.1,
  "persistence": 0.1
}
```

Example request:

```json
{
  "topics": [
    {
      "topicId": "consumer-ai-agents",
      "metrics": {
        "mentions": { "value": 4200, "baseline": { "min": 500, "max": 5000 } },
        "searches": { "value": 81000, "baseline": { "min": 12000, "max": 90000 } },
        "views": { "value": 3200000, "baseline": { "min": 400000, "max": 4000000 } },
        "velocity": { "value": 0.62, "baseline": { "min": -0.1, "max": 0.9 } },
        "acceleration": { "value": 0.18, "baseline": { "min": -0.3, "max": 0.4 } },
        "diversity": { "value": 16, "baseline": { "min": 1, "max": 24 } },
        "persistence": { "value": 5, "baseline": { "min": 1, "max": 10 } }
      }
    }
  ],
  "options": {
    "weights": {
      "volume": 0.45,
      "velocity": 0.25
    }
  }
}
```

Custom weights are merged with defaults, validated as nonnegative finite numbers, then normalized to sum to `1`.

Example response:

```json
{
  "requestId": "4c62f7db-d830-43df-960f-b2fa19892bdf",
  "scores": [
    {
      "topicId": "consumer-ai-agents",
      "attentionScore": 0.731,
      "components": {
        "volume": 0.828,
        "velocity": 0.72,
        "acceleration": 0.686,
        "diversity": 0.652,
        "persistence": 0.444
      },
      "volumeSignals": {
        "mentions": 0.822,
        "searches": 0.885,
        "views": 0.778
      },
      "weights": {
        "volume": 0.45,
        "velocity": 0.25,
        "acceleration": 0.1,
        "diversity": 0.1,
        "persistence": 0.1
      }
    }
  ]
}
```

`GET /api/attention` returns route metadata, limits, normalization rules, and default weights.

## Topic Extraction API

`POST /api/topics` extracts source-grounded semantic topics from source documents. It uses OpenAI when `OPENAI_API_KEY` is configured and falls back to local keyword extraction otherwise.

`GET /api/topics` returns route metadata and extraction limits.
