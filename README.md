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

FastF1 (offline) → Precompute scripts → MongoDB Atlas → FastAPI → React UI

Key Design Decisions
	•	No live telemetry scraping
	•	All race data is precomputed
	•	API is read-only at runtime
	•	Stateless backend
	•	Explainable metrics only

This makes the system:
	•	Stable
	•	Scalable
	•	Production-safe
	•	Interview-ready

⸻

🛠️ Tech Stack

Frontend
	•	React + TypeScript
	•	Vite
	•	Tailwind CSS
	•	Responsive, mobile-first UI
	•	Pitch-black F1-inspired design
	•	Hover-driven micro-interactions

Backend
	•	Python 3.11
	•	FastAPI
	•	Modular strategy & analysis engine
	•	Clean REST APIs
	•	No blocking operations

Database
	•	MongoDB Atlas (Cloud)
	•	Precomputed multi-season race documents
	•	Indexed for fast retrieval
	•	Shared access for collaboration

Data & Analytics
	•	FastF1 (offline only)
	•	Pandas / NumPy
	•	Rule-based strategy & behaviour models
	•	ML-ready architecture (future)

Deployment
	•	Frontend: Vercel
	•	Backend: Render (Free Tier)
	•	Database: MongoDB Atlas (Free Tier)


📊 Data Coverage
	•	Seasons: 2020 → 2025
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
