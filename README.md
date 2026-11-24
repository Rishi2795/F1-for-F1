# F1^4
🏎️ F1 for F1

Intelligent race strategy & performance analysis for Formula 1 (2020–2025)

F1 for F1 is a full-stack analytics platform built for Formula 1 — to help fans, analysts, and engineers understand what truly decides race outcomes in the modern era.

Instead of focusing only on results, F1 for F1 decodes race strategy, driver behaviour, tyre usage, track characteristics, and team execution using real historical data and explainable logic.

The mission is simple:

Make Formula 1 easier to understand, analyze, and compare — through data.

⚠️ This project is not affiliated with Formula 1, the FIA, or any official teams.

⸻

✨ Core Capabilities

🧠 Strategy Intelligence
	•	Winning strategy patterns per circuit
	•	Typical pit stop counts & tyre sequences
	•	Average longest stints
	•	Strategy diversity & pit payoff analysis

🏁 Driver Performance Analysis
	•	Grid → finish position delta
	•	Tyre degradation index
	•	Pit efficiency classification
	•	Consistency index
	•	Strategy risk scoring
	•	Strategy outcome simulation (rule-based)

🏎️ Driver Attributes (Explainable)

Each driver is tagged using derived metrics:
	•	Aggressive
	•	Defensive
	•	Tyre Saver
	•	Consistent
	•	High-Risk Strategist

All attributes are explainable and traceable — no black-box logic.

🗺️ Track Intelligence & History
	•	Overtaking difficulty
	•	Strategy sensitivity
	•	Pit stop payoff
	•	Track personality tags
	•	Contextual track history notes

👥 Team-Level Insights
	•	Average team finishing positions
	•	Net positions gained
	•	Strategy effectiveness across teams
	•	Visual team-color encoding for fast reading

🔎 Driver Comparison
	•	User-selected driver vs driver analysis
	•	Side-by-side metrics
	•	Strategy verdict comparison
	•	Clear visual hierarchy (desktop & mobile)

⸻

🧱 Architecture Overview

Data Flow

Free public sources → pipeline (validate, derive metrics) → static JSON → read-only FastAPI → React UI

	•	Sources: Jolpica-F1 (results, pit stops), TracingInsights (per-lap tyres, stints, weather), OpenF1 (fallback). No account, API key or subscription is needed anywhere.
	•	The pipeline (pipeline/) runs offline: python -m f1data ingest. It never invents data: a missing value is null and the race is flagged partial.
	•	The API (backend/) only serves precomputed files. It never calls an upstream service while a user waits.
	•	Every pipeline run is recorded in a tamper-evident audit log (audit/). Application logs are structured JSON; nothing prints.

Key Design Decisions
	•	Precompute everything; the API is read-only and stateless
	•	Honest data: gaps are shown as gaps, with a public coverage report (/api/coverage)
	•	Explainable metrics only (rule-based ones are labelled rule_based_v1)
	•	Credential-free by design: no F1TV/F1 account dependency

Run locally: see docs/deploy.md. Performance measurements: docs/perf-baseline.md. Roadmap and ML plan: plan.md.

⸻

🛠️ Tech Stack

Frontend
	•	React + TypeScript, Vite, Tailwind CSS
	•	Route-level code splitting, cached API client, skeleton and error states

Backend
	•	Python 3.11, FastAPI (read-only), structured logging, rate limiting, strict CORS

Pipeline
	•	Python, pydantic-validated published schema, hash-chained audit log

Deployment
	•	Frontend: Vercel · API: Render · No database

⸻

📊 Data Coverage
	•	Seasons: 2020 → 2026
	•	Race sessions only (by design)
	•	All data precomputed & cached
	•	Safe for deployment & sharing


🧭 Phase-Wise Roadmap

✅ Phase 1 — Foundation (Completed)
	•	Multi-season race ingestion
	•	Strategy intelligence
	•	Driver & team analysis
	•	Track intelligence
	•	Cloud database
	•	Full UI + comparison tools
	•	Deployed architecture

🔄 Phase 2 — Depth & Usability (In Progress)
	•	Richer driver attribute tagging
	•	Improved track history context
	•	Better metric explanations
	•	UI polish & accessibility
	•	Shareable race views

🧠 Phase 3 — ML-Assisted Insights (Planned)
	•	Strategy success probability
	•	Driver behaviour clustering
	•	Scenario-based simulations
	•	Hybrid rule-based + ML logic
	•	Offline-trained, online-served models

🚀 Phase 4 — Productization (Future)
	•	User accounts (optional)
	•	Saved comparisons
	•	Public API access
	•	Mobile app wrapper
	•	Extended historical archive


🎯 Why This Project Matters
	•	Demonstrates full-stack engineering
	•	Shows data modeling & analytics
	•	Emphasizes explainability over hype
	•	Designed like a real production system
	•	Built with scalability and clarity in mind

This is a product-grade analytics platform.

🚧 Disclaimer

This project uses publicly available race data for educational and analytical purposes.
It is not endorsed by Formula 1, the FIA, or any teams.


👤 Author

Built by Rishi
Computer Science Engineer | Full-Stack | Data & Systems Enthusiast
