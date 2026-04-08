# A2A Global Reinforcement Learning Core Architecture — Version 2.0 — Incorporating Co-Founder Review

**Document Classification:** Internal — Engineering Leadership  
**Version:** 2.0  
**Date:** April 9, 2026  
**Author:** Office of the Chief Architect, A2A Global Inc.  
**Co-Founder Review:** Amir Abdalov, Co-founder, A2A Global Inc.

---

> **Version 2 Note:** This revision incorporates all comments and directives from Amir Abdalov, Co-founder of A2A Global Inc. Key additions include: text-based feedback reward signals (NLP/sentiment analysis), the A2A Operational Intelligence Flywheel (A/B testing, registration optimization, checkout recovery, dynamic pricing, Admin Panel analytics), statistical and mathematical foundations (survivorship bias, Bayesian inference, Monte Carlo simulation, Kelly criterion, Black-Scholes adaptations, Markov chains, VC/PE case studies), enhanced payment architecture (Stripe, GlomoPay, Mercury Bank), full Google Cloud Platform alignment, and comprehensive data infrastructure with disaster recovery. Every section has been reviewed for GCP consistency and operational excellence framing.

---

## Executive Summary

A2A Global Inc. operates a two-sided marketplace that connects domain Experts with Clients who need qualified second opinions on AI-generated outputs. Every interaction on the platform — every Expert correction, every Client rating, every free-text comment, every disagreement — produces a training signal. The Reinforcement Learning Core (A2A-RLC) is the intelligence layer that transforms those signals into compounding competitive advantage.

This document specifies the complete architecture of the A2A-RLC: the data pipeline, the database schema, the matching algorithm, the RL training loop, the per-domain AI models, the NLP-driven text feedback analysis, the microservices topology, the payment architecture, the operational intelligence flywheel, the statistical and mathematical foundations, the data infrastructure and disaster recovery strategy, and the implementation roadmap. It is the technical north star for all A2A Global engineering.

A2A Global masters every aspect of operational efficiency — from RL-optimized Expert-Client matching to dynamic pricing, from checkout recovery to registration funnel tuning. This document codifies the system that makes that mastery possible and continuously self-improving.

---

## 1. A2A Global Reinforcement Learning Core (A2A-RLC)

### 1.1 Core Learning Loop

The A2A-RLC treats the platform as a living laboratory. Four categories of signal drive learning:

| Signal Type | Source | Value |
|---|---|---|
| **Correction Signal** | Expert edits AI output | Supervised training pair: (AI output, corrected output) |
| **Star Rating Signal** | Client rates Expert work (1–5 stars + structured rubric) | Scalar reward for matching policy; label quality for reward model |
| **Text Feedback Signal** | Client writes free-text comment on Expert work | NLP-extracted sentiment, intent, and topic reward; weighted alongside star ratings |
| **Mismatch Signal** | Expert disagrees with AI *and/or* Client disagrees with Expert | High-entropy data point — triggers active-learning prioritization |

**Flywheel dynamics:** More tasks → more corrections → better domain models → higher Client trust → more tasks. The system gets smarter with every fault it encounters, and every fault it encounters makes the next fault cheaper to detect.

### 1.2 Text-Based Feedback Analysis (NLP Reward Extraction)

Clients rate Experts not only by stars but also by free-text comments. A star rating alone is a coarse scalar; the text comment carries rich, multidimensional signal. The A2A-RLC extracts structured reward dimensions from every Client comment using a dedicated NLP pipeline.

#### 1.2.1 Architecture

```
Client Comment (free text)
  │
  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Text Feedback Analysis Pipeline                      │
│                                                                      │
│  ① Preprocessing ──▶ ② Sentiment Analysis ──▶ ③ Aspect Extraction   │
│  (language detect,     (fine-tuned BERT on      (multi-label:         │
│   normalize, clean)     marketplace reviews)     accuracy, speed,     │
│                                                   communication,      │
│                                                   thoroughness,       │
│                                                   value-for-money)    │
│                                                                      │
│  ④ Intent Classification ──▶ ⑤ Reward Signal Generation             │
│  (praise, complaint,          (composite NLP reward                   │
│   suggestion, neutral)         merged with star rating)               │
└──────────────────────────────────────────────────────────────────────┘
```

#### 1.2.2 Sentiment-to-Reward Mapping

```python
def compute_text_reward(comment_text: str, star_rating: int) -> dict:
    """Transform free-text Client feedback into structured reward signals."""
    
    # Step 1: Overall sentiment score [-1.0, +1.0]
    sentiment = sentiment_model.predict(comment_text)  # fine-tuned on marketplace reviews
    
    # Step 2: Aspect-level sentiment extraction
    aspects = aspect_extractor.predict(comment_text)
    # Returns: {accuracy: 0.9, communication: -0.3, speed: 0.6, thoroughness: 0.8, value: 0.4}
    
    # Step 3: Intent classification
    intent = intent_classifier.predict(comment_text)
    # Returns: {praise: 0.7, complaint: 0.1, suggestion: 0.2, neutral: 0.0}
    
    # Step 4: Composite text reward (normalized to [0, 1])
    text_reward = (
        0.30 * normalize(sentiment, -1, 1)
        + 0.25 * normalize(aspects.get('accuracy', 0), -1, 1)
        + 0.15 * normalize(aspects.get('thoroughness', 0), -1, 1)
        + 0.10 * normalize(aspects.get('communication', 0), -1, 1)
        + 0.10 * normalize(aspects.get('speed', 0), -1, 1)
        + 0.10 * normalize(aspects.get('value', 0), -1, 1)
    )
    
    # Step 5: Blend text reward with star rating (weighted combination)
    star_reward = normalize(star_rating, 1, 5)
    blended_reward = ALPHA_STAR * star_reward + ALPHA_TEXT * text_reward
    # ALPHA_STAR = 0.55, ALPHA_TEXT = 0.45 — text carries substantial weight
    
    # Step 6: Confidence adjustment — longer, more specific comments get higher text weight
    specificity = min(1.0, word_count(comment_text) / 50) * aspect_coverage(aspects)
    dynamic_alpha_text = ALPHA_TEXT * specificity + (1 - specificity) * 0.15
    dynamic_alpha_star = 1.0 - dynamic_alpha_text
    
    final_reward = dynamic_alpha_star * star_reward + dynamic_alpha_text * text_reward
    
    return {
        "final_reward": final_reward,
        "star_reward": star_reward,
        "text_reward": text_reward,
        "sentiment": sentiment,
        "aspects": aspects,
        "intent": intent,
        "specificity": specificity,
        "blended_weights": {"star": dynamic_alpha_star, "text": dynamic_alpha_text}
    }
```

#### 1.2.3 Text Feedback Database Schema Extension

```sql
-- ============================================================
-- TEXT FEEDBACK ANALYSIS (v2 addition)
-- ============================================================
CREATE TABLE feedback_text_analysis (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id         UUID NOT NULL REFERENCES feedback(id),
    raw_comment         TEXT NOT NULL,
    detected_language   VARCHAR(10),
    overall_sentiment   NUMERIC(4,3),                -- [-1.000, +1.000]
    aspect_accuracy     NUMERIC(4,3),
    aspect_communication NUMERIC(4,3),
    aspect_speed        NUMERIC(4,3),
    aspect_thoroughness NUMERIC(4,3),
    aspect_value        NUMERIC(4,3),
    intent_praise       NUMERIC(4,3),
    intent_complaint    NUMERIC(4,3),
    intent_suggestion   NUMERIC(4,3),
    intent_neutral      NUMERIC(4,3),
    specificity_score   NUMERIC(4,3),                -- [0.000, 1.000]
    text_reward         NUMERIC(5,3),                -- computed text reward
    blended_reward      NUMERIC(5,3),                -- star + text combined
    nlp_model_version   VARCHAR(50),
    processed_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fta_feedback ON feedback_text_analysis(feedback_id);
CREATE INDEX idx_fta_sentiment ON feedback_text_analysis(overall_sentiment);
```

#### 1.2.4 Impact on EWR (Expertise-Weighted Reward)

The v1 EWR formula is extended to incorporate text-derived reward:

```
EWR_v2(signal) = α · tier_weight(expert) · consistency_score(expert)
               + β · client_reputation(client) · specificity(feedback)
               + γ · mismatch_indicator · information_gain(signal)
               + δ · text_reward(feedback) · specificity_score(feedback)
```

Where `δ = 0.20` initially, scaling up as the NLP models are validated against Expert consensus. The `specificity_score` ensures that vague comments ("ok", "fine") contribute minimally, while detailed critiques ("Caught the DCF terminal value error but missed the WACC calculation using wrong risk-free rate") contribute substantially.

### 1.3 Concrete Data Pipeline

```
┌─────────────┐    ┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Client       │───▶│ Task Ingestion │───▶│ Matching Engine   │───▶│ Expert Review     │
│ uploads AI   │    │ Service        │    │ (RL Policy)       │    │ Service           │
│ output       │    └───────────────┘    └──────────────────┘    └────────┬─────────┘
└─────────────┘                                                           │
                                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Post-Review Processing Pipeline                          │
│                                                                                 │
│  1. Diff Extraction ──▶ 2. Error Classification ──▶ 3. Training Signal Gen     │
│  (structured diff        (hierarchical taxonomy      (domain-model-ready        │
│   of corrections)         per domain)                 labeled pairs)            │
│                                                                                 │
│  4. Reward Computation ──▶ 5. Text Feedback    ──▶ 6. Blended Reward Gen      │
│  (Client stars +           Analysis (NLP            (star + text + EWR          │
│   Expert self-assessment)   pipeline)                composite)                 │
│                                                                                 │
│  7. Model Update Queue ──▶ 8. Matching Policy Update                           │
│  (batched retraining        (RL policy gradient                                 │
│   triggers)                  step)                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Input:** Client AI output (text, code, spreadsheet, document) + metadata (domain, complexity estimate, urgency).  
**Processing:** Error classification via the domain-specific taxonomy; pattern extraction via embedding similarity to known error clusters; training pair generation (original → corrected) with severity labels; NLP analysis of Client text comments.  
**Output:** (a) Updated domain AI models, (b) revised Expert competency scores, (c) refined matching policy weights, (d) text-derived reward signals for training.

### 1.4 Signal Quality & Weighting

Not all signals are equal. The system applies an **Expertise-Weighted Reward v2** (EWR-v2):

```
EWR_v2(signal) = α · tier_weight(expert) · consistency_score(expert)
               + β · client_reputation(client) · specificity(feedback)
               + γ · mismatch_indicator · information_gain(signal)
               + δ · text_reward(feedback) · specificity_score(feedback)
```

Where `tier_weight ∈ {1.0 (Standard), 1.5 (Pro), 2.0 (Guru)}`, `consistency_score` is the running inter-rater reliability of the Expert against peer consensus, `information_gain` is the KL-divergence the signal introduces relative to the current domain model's distribution, and `text_reward` is the NLP-extracted reward from the Client's free-text comment weighted by its `specificity_score`.

---

## 2. Proprietary AI Dataset Architecture

Each domain vertical maintains an isolated, versioned dataset. Every record follows a canonical schema:

```json
{
  "record_id": "uuid",
  "domain": "finance",
  "subdomain": "valuation",
  "original_ai_output": "<full text or structured object>",
  "expert_correction": "<full corrected output>",
  "diff": [
    {"span": [120, 145], "original": "...", "corrected": "...", "operation": "replace"}
  ],
  "error_taxonomy": {
    "primary": "ANALYTICAL_ERROR",
    "secondary": "DCF_TERMINAL_VALUE_MISCALCULATION",
    "tertiary": "GROWTH_RATE_EXCEEDS_GDP"
  },
  "severity": 4,
  "domain_context": {
    "industry": "SaaS",
    "company_stage": "Series B",
    "data_vintage": "2025-Q4"
  },
  "expert_id": "uuid",
  "expert_tier": "Guru",
  "client_satisfaction_stars": 5,
  "client_feedback_text": "Caught a critical error in terminal value.",
  "client_feedback_nlp": {
    "sentiment": 0.92,
    "aspects": {"accuracy": 0.95, "thoroughness": 0.88, "speed": 0.70},
    "intent": {"praise": 0.85, "suggestion": 0.15},
    "text_reward": 0.89,
    "blended_reward": 0.91
  },
  "timestamp": "2026-04-09T15:19:00Z",
  "model_version_at_time": "finance-v0.4.0"
}
```

### 2.1 Domain-Specific Error Taxonomies

Each taxonomy is hierarchical (3 levels) and extensible. New leaf nodes are proposed automatically by clustering novel Expert corrections that do not map cleanly to existing categories (using DBSCAN over correction embeddings). A human taxonomy steward approves promotions from candidate to canonical status quarterly.

#### Finance & Investment
| L1 Category | L2 Examples | L3 Examples |
|---|---|---|
| ANALYTICAL_ERROR | DCF Miscalculation, Comparable Misselection, Multiple Misapplication | Growth rate > GDP, Missing country risk premium, Wrong peer set SIC code |
| DATA_ERROR | Stale Financials, Misattributed Metric, Unit Mismatch | Using TTM vs. NTM inconsistently, Revenue vs. bookings confusion |
| REASONING_ERROR | Causal Fallacy, Survivorship Bias, Anchoring | Extrapolating single-quarter trend, Ignoring base rate |
| OMISSION | Missing Risk Factor, Incomplete Sensitivity, Ignored Covenant | No downside scenario, Missing currency exposure |

#### Business Strategy & Entrepreneurship
| L1 Category | L2 Examples | L3 Examples |
|---|---|---|
| STRATEGIC_LOGIC_ERROR | Flawed Porter's Analysis, SWOT Inconsistency, TAM Inflation | Missing substitute threat, Strength listed as weakness |
| MARKET_ERROR | Incorrect Segmentation, Competitor Omission, Timing Misjudgment | Adjacent entrant ignored, Market maturity misclassified |
| EXECUTION_ERROR | Unrealistic Timeline, Resource Underestimate, Dependency Gap | 6-month plan with 18-month critical path |
| OMISSION | Missing Go-to-Market, No Unit Economics, Ignored Regulation | No CAC/LTV analysis |

#### Product Strategy & Development
| L1 Category | L2 Examples | L3 Examples |
|---|---|---|
| PRIORITIZATION_ERROR | Wrong RICE Score, Misaligned with OKR, Feature Creep | Impact overestimate, Confidence without data |
| USER_RESEARCH_ERROR | Confirmation Bias, Sample Bias, Leading Questions | N < 5 interviews generalized to segment |
| ROADMAP_ERROR | Dependency Cycle, No MVP Scope, Unrealistic Velocity | Hard dependency on unplanned API |
| TECHNICAL_DEBT_BLIND_SPOT | Architecture Anti-Pattern Ignored, Scalability Gap | Monolith assumed at 100x current scale |

#### Software Development & Agile
| L1 Category | L2 Examples | L3 Examples |
|---|---|---|
| CODE_ERROR | Logic Bug, Security Vulnerability, Performance Anti-Pattern | O(n²) where O(n log n) exists, SQL injection surface |
| ARCHITECTURE_ERROR | Coupling Violation, Missing Abstraction, Wrong Pattern | God class, circular dependency, synchronous call in hot path |
| PROCESS_ERROR | Sprint Overcommit, Missing Acceptance Criteria, No Rollback Plan | Story points ≠ hours confusion |
| TESTING_GAP | Missing Edge Case, No Integration Test, Flaky Test Ignored | Null pointer path untested |

#### Fundraising
| L1 Category | L2 Examples | L3 Examples |
|---|---|---|
| NARRATIVE_ERROR | Inconsistent Metrics, Unsubstantiated Claim, Wrong Stage Framing | Seed deck with Series B metrics |
| FINANCIAL_MODEL_ERROR | Unrealistic Projections, Missing Cash Flow, Wrong Dilution Math | 10x revenue next year with no basis |
| STRUCTURAL_ERROR | Wrong Instrument, Missing Terms, Cap Table Error | SAFE vs. priced round mismatch |

#### Fintech & PayTech
| L1 Category | L2 Examples | L3 Examples |
|---|---|---|
| REGULATORY_ERROR | Licensing Gap, AML/KYC Omission, Cross-Border Non-Compliance | Missing MSB registration, PSD2 SCA not addressed |
| TECHNICAL_ERROR | API Design Flaw, Settlement Logic Bug, Reconciliation Gap | Idempotency key missing, float calculation rounding |
| BUSINESS_MODEL_ERROR | Unit Economics Flaw, Interchange Misunderstanding, FX Margin Error | Negative take rate at scale |

#### Legal
| L1 Category | L2 Examples | L3 Examples |
|---|---|---|
| CLAUSE_ERROR | Ambiguous Term, Missing Limitation, Conflicting Provisions | Indemnity without cap, termination clause contradicts renewal |
| COMPLIANCE_ERROR | Jurisdiction Mismatch, GDPR Gap, Export Control Omission | Data processing without DPA |
| DRAFTING_ERROR | Defined Term Unused, Cross-Reference Broken, Boilerplate Mismatch | Section 4.2 references deleted Section 7 |
| RISK_OMISSION | Unaddressed Liability, Missing IP Assignment, No Dispute Mechanism | No governing law clause |

---

## 3. Database Schema

The schema uses PostgreSQL (Cloud SQL for PostgreSQL on GCP) with the `uuid-ossp` and `ltree` extensions. All timestamps are UTC. Soft deletes are used throughout.

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role        AS ENUM ('expert', 'client', 'admin', 'super_admin');
CREATE TYPE expert_tier      AS ENUM ('standard', 'pro', 'guru');
CREATE TYPE task_status      AS ENUM ('draft','submitted','matching','assigned',
                                      'in_review','review_submitted','disputed',
                                      'completed','cancelled');
CREATE TYPE payment_status   AS ENUM ('pending','authorized','captured','failed',
                                      'refunded','in_escrow');
CREATE TYPE payment_direction AS ENUM ('client_to_platform','platform_to_expert');
CREATE TYPE payment_provider_type AS ENUM ('stripe','stripe_connect','glomopay',
                                           'mercury_ach','mercury_wire');
CREATE TYPE model_stage      AS ENUM ('training','validating','shadow','canary',
                                      'production','retired');
CREATE TYPE ab_test_status   AS ENUM ('draft','running','paused','completed','archived');

-- ============================================================
-- USERS & PROFILES
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(320) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    avatar_url      TEXT,
    timezone        VARCHAR(50) DEFAULT 'UTC',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expert_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id),
    tier                expert_tier DEFAULT 'standard',
    domains             TEXT[] NOT NULL,             -- e.g. {'finance','legal'}
    subdomains          TEXT[],                      -- e.g. {'valuation','m_and_a'}
    bio                 TEXT,
    years_experience    SMALLINT,
    hourly_rate_cents   INTEGER NOT NULL,            -- in USD cents
    currency            CHAR(3) DEFAULT 'USD',
    avg_rating          NUMERIC(3,2) DEFAULT 0.00,
    avg_text_sentiment  NUMERIC(4,3) DEFAULT 0.000,  -- v2: avg NLP sentiment from Client comments
    total_reviews       INTEGER DEFAULT 0,
    total_earnings_cents BIGINT DEFAULT 0,
    qualification_score NUMERIC(5,2),                -- latest test score
    consistency_score   NUMERIC(4,3) DEFAULT 1.000,  -- inter-rater reliability
    availability_hours  JSONB,                       -- weekly schedule
    is_available        BOOLEAN DEFAULT TRUE,
    payout_method       payment_provider_type,       -- v2: preferred payout method
    payout_details      JSONB,                       -- v2: {glomopay_id, mercury_account, etc.}
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id),
    company_name        VARCHAR(200),
    industry            VARCHAR(100),
    company_size        VARCHAR(50),                -- 'startup','smb','enterprise'
    total_tasks         INTEGER DEFAULT 0,
    total_spend_cents   BIGINT DEFAULT 0,
    preferred_domains   TEXT[],
    preferred_expert_ids UUID[],                     -- sticky preferences
    payment_method      payment_provider_type,       -- v2: stripe or mercury_ach
    payment_details     JSONB,                       -- v2: stripe customer id, etc.
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUALIFICATION TESTS
-- ============================================================
CREATE TABLE qualification_tests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain          VARCHAR(50) NOT NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    passing_score   NUMERIC(5,2) NOT NULL,          -- e.g. 80.00
    time_limit_min  INTEGER DEFAULT 60,
    is_active       BOOLEAN DEFAULT TRUE,
    version         INTEGER DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id         UUID NOT NULL REFERENCES qualification_tests(id),
    question_text   TEXT NOT NULL,
    question_type   VARCHAR(20) DEFAULT 'multiple_choice', -- or 'open_ended','code'
    options         JSONB,                           -- for MC: [{label, text, is_correct}]
    correct_answer  TEXT,
    points          NUMERIC(5,2) DEFAULT 1.00,
    difficulty      SMALLINT DEFAULT 3,              -- 1-5
    sort_order      INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id       UUID NOT NULL REFERENCES expert_profiles(id),
    test_id         UUID NOT NULL REFERENCES qualification_tests(id),
    answers         JSONB NOT NULL,                  -- {question_id: answer}
    score           NUMERIC(5,2),
    passed          BOOLEAN,
    started_at      TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS & ENGAGEMENTS
-- ============================================================
CREATE TABLE tasks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id           UUID NOT NULL REFERENCES client_profiles(id),
    domain              VARCHAR(50) NOT NULL,
    subdomain           VARCHAR(100),
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    ai_output_url       TEXT NOT NULL,               -- GCS path to original AI output
    ai_output_text      TEXT,                        -- extracted plain text for search
    ai_model_used       VARCHAR(100),                -- e.g. 'gpt-4o','claude-3.5'
    complexity_estimate SMALLINT DEFAULT 3,           -- 1-5 auto-estimated
    urgency             VARCHAR(20) DEFAULT 'normal', -- 'low','normal','high','urgent'
    max_budget_cents    INTEGER,
    status              task_status DEFAULT 'submitted',
    assigned_expert_id  UUID REFERENCES expert_profiles(id),
    assigned_at         TIMESTAMPTZ,
    deadline            TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    matching_model_version VARCHAR(50),              -- which RL model version matched
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_domain ON tasks(domain);
CREATE INDEX idx_tasks_client ON tasks(client_id);

-- ============================================================
-- EXPERT REVIEWS & CORRECTIONS
-- ============================================================
CREATE TABLE expert_reviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id             UUID NOT NULL REFERENCES tasks(id),
    expert_id           UUID NOT NULL REFERENCES expert_profiles(id),
    corrected_output_url TEXT NOT NULL,               -- GCS path
    corrected_output_text TEXT,
    summary             TEXT NOT NULL,                 -- Expert's summary of issues found
    time_spent_minutes  INTEGER,
    error_count         INTEGER DEFAULT 0,
    severity_avg        NUMERIC(3,2),
    submitted_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_annotations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id       UUID NOT NULL REFERENCES expert_reviews(id),
    span_start      INTEGER,                          -- character offset
    span_end        INTEGER,
    original_text   TEXT NOT NULL,
    corrected_text  TEXT NOT NULL,
    error_type_path LTREE NOT NULL,                   -- e.g. 'finance.analytical.dcf.growth_rate'
    severity        SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
    explanation     TEXT,                              -- Expert's reasoning
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_annotations_error_type ON review_annotations USING GIST (error_type_path);

-- ============================================================
-- AI ERROR TAXONOMY (hierarchical, per domain)
-- ============================================================
CREATE TABLE error_taxonomy (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain          VARCHAR(50) NOT NULL,
    path            LTREE NOT NULL UNIQUE,            -- e.g. 'finance.analytical.dcf'
    label           VARCHAR(200) NOT NULL,
    description     TEXT,
    parent_path     LTREE,
    depth           SMALLINT NOT NULL,
    is_candidate    BOOLEAN DEFAULT FALSE,            -- auto-discovered, awaiting approval
    occurrence_count INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_taxonomy_path ON error_taxonomy USING GIST (path);

-- ============================================================
-- TRAINING SIGNALS
-- ============================================================
CREATE TABLE training_signals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    annotation_id       UUID REFERENCES review_annotations(id),
    review_id           UUID NOT NULL REFERENCES expert_reviews(id),
    task_id             UUID NOT NULL REFERENCES tasks(id),
    domain              VARCHAR(50) NOT NULL,
    signal_type         VARCHAR(30) NOT NULL,          -- 'correction','mismatch','reward','text_reward'
    input_text          TEXT NOT NULL,                  -- original AI snippet
    target_text         TEXT,                           -- corrected snippet
    error_type_path     LTREE,
    severity            SMALLINT,
    expert_tier         expert_tier,
    client_satisfaction SMALLINT,                       -- 1-5 from star feedback
    client_text_reward  NUMERIC(5,3),                  -- v2: NLP-derived text reward
    blended_reward      NUMERIC(5,3),                  -- v2: star + text blended
    ewr_score           NUMERIC(6,3),                  -- computed Expertise-Weighted Reward v2
    used_in_training    BOOLEAN DEFAULT FALSE,
    model_version       VARCHAR(50),                   -- model version that consumed it
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_domain ON training_signals(domain);
CREATE INDEX idx_signals_unused ON training_signals(used_in_training) WHERE used_in_training = FALSE;

-- ============================================================
-- EXPERT-CLIENT MATCH HISTORY
-- ============================================================
CREATE TABLE match_history (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id             UUID NOT NULL REFERENCES tasks(id),
    client_id           UUID NOT NULL REFERENCES client_profiles(id),
    expert_id           UUID NOT NULL REFERENCES expert_profiles(id),
    domain              VARCHAR(50) NOT NULL,
    matching_score      NUMERIC(6,4),                  -- policy output score
    was_accepted        BOOLEAN,                       -- Expert accepted the task
    client_rating       SMALLINT,                      -- post-completion
    client_text_sentiment NUMERIC(4,3),                -- v2: NLP sentiment from comment
    expert_rating       SMALLINT,                      -- Expert rates task quality
    completion_time_min INTEGER,
    payment_success     BOOLEAN,
    exploration_flag    BOOLEAN DEFAULT FALSE,          -- was this an explore action?
    model_version       VARCHAR(50),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_match_client_expert ON match_history(client_id, expert_id);

-- ============================================================
-- FEEDBACK & RATINGS (bidirectional)
-- ============================================================
CREATE TABLE feedback (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id         UUID NOT NULL REFERENCES tasks(id),
    from_user_id    UUID NOT NULL REFERENCES users(id),
    to_user_id      UUID NOT NULL REFERENCES users(id),
    direction       VARCHAR(20) NOT NULL,              -- 'client_to_expert','expert_to_client'
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    accuracy_score  SMALLINT CHECK (accuracy_score BETWEEN 1 AND 5),
    communication_score SMALLINT CHECK (communication_score BETWEEN 1 AND 5),
    timeliness_score SMALLINT CHECK (timeliness_score BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEXT FEEDBACK ANALYSIS (v2 addition)
-- ============================================================
CREATE TABLE feedback_text_analysis (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id         UUID NOT NULL REFERENCES feedback(id),
    raw_comment         TEXT NOT NULL,
    detected_language   VARCHAR(10),
    overall_sentiment   NUMERIC(4,3),
    aspect_accuracy     NUMERIC(4,3),
    aspect_communication NUMERIC(4,3),
    aspect_speed        NUMERIC(4,3),
    aspect_thoroughness NUMERIC(4,3),
    aspect_value        NUMERIC(4,3),
    intent_praise       NUMERIC(4,3),
    intent_complaint    NUMERIC(4,3),
    intent_suggestion   NUMERIC(4,3),
    intent_neutral      NUMERIC(4,3),
    specificity_score   NUMERIC(4,3),
    text_reward         NUMERIC(5,3),
    blended_reward      NUMERIC(5,3),
    nlp_model_version   VARCHAR(50),
    processed_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fta_feedback ON feedback_text_analysis(feedback_id);
CREATE INDEX idx_fta_sentiment ON feedback_text_analysis(overall_sentiment);

-- ============================================================
-- PAYMENTS & TRANSACTIONS (v2: enhanced with GlomoPay, Mercury)
-- ============================================================
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id             UUID NOT NULL REFERENCES tasks(id),
    payer_user_id       UUID NOT NULL REFERENCES users(id),
    payee_user_id       UUID NOT NULL REFERENCES users(id),
    direction           payment_direction NOT NULL,
    amount_cents        INTEGER NOT NULL,
    currency            CHAR(3) DEFAULT 'USD',
    platform_fee_cents  INTEGER NOT NULL,
    expert_payout_cents INTEGER,                       -- v2: amount after platform fee
    status              payment_status DEFAULT 'pending',
    payment_provider    payment_provider_type,         -- v2: stripe, glomopay, mercury_ach, mercury_wire
    provider_ref        VARCHAR(200),                  -- external transaction id
    escrow_held         BOOLEAN DEFAULT FALSE,         -- v2: funds in escrow until review accepted
    escrow_released_at  TIMESTAMPTZ,
    captured_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RL MODEL VERSIONS
-- ============================================================
CREATE TABLE rl_model_versions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name          VARCHAR(100) NOT NULL,         -- e.g. 'matching-policy','finance-error-detector'
    version             VARCHAR(50) NOT NULL,
    domain              VARCHAR(50),                   -- NULL for cross-domain models
    stage               model_stage DEFAULT 'training',
    artifact_url        TEXT NOT NULL,                  -- GCS path to model weights
    training_signals_count INTEGER,
    training_started_at TIMESTAMPTZ,
    training_completed_at TIMESTAMPTZ,
    eval_metrics        JSONB,                         -- {"accuracy":0.87,"f1":0.84,...}
    promoted_at         TIMESTAMPTZ,                   -- when moved to production
    retired_at          TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_model_version ON rl_model_versions(model_name, version);

-- ============================================================
-- A/B TESTS (v2 addition: Operational Intelligence Flywheel)
-- ============================================================
CREATE TABLE ab_tests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_name       VARCHAR(300) NOT NULL,
    test_category   VARCHAR(50) NOT NULL,              -- 'ux_ui','registration','checkout','pricing','matching'
    hypothesis      TEXT NOT NULL,
    status          ab_test_status DEFAULT 'draft',
    traffic_pct     NUMERIC(4,2) DEFAULT 50.00,        -- % traffic to variant
    variant_a_desc  TEXT NOT NULL,
    variant_b_desc  TEXT NOT NULL,
    primary_metric  VARCHAR(100) NOT NULL,
    guardrail_metrics JSONB,
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    winner          VARCHAR(10),                       -- 'a','b','inconclusive'
    statistical_significance NUMERIC(5,4),
    results_summary JSONB,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ab_test_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id         UUID NOT NULL REFERENCES ab_tests(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    variant         VARCHAR(10) NOT NULL,              -- 'a' or 'b'
    assigned_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ab_assignments ON ab_test_assignments(test_id, user_id);

-- ============================================================
-- REGISTRATION FUNNEL TRACKING (v2 addition)
-- ============================================================
CREATE TABLE registration_funnel_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      VARCHAR(100) NOT NULL,
    user_type       VARCHAR(10) NOT NULL,              -- 'client' or 'expert'
    step            VARCHAR(50) NOT NULL,              -- 'landing','signup_form','email_verify','profile_setup','qualification','complete'
    completed       BOOLEAN DEFAULT FALSE,
    drop_off_reason TEXT,
    ab_test_variant VARCHAR(10),
    utm_source      VARCHAR(100),
    utm_medium      VARCHAR(100),
    utm_campaign    VARCHAR(200),
    device_type     VARCHAR(20),
    geo_country     VARCHAR(5),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_session ON registration_funnel_events(session_id);
CREATE INDEX idx_funnel_step ON registration_funnel_events(step, completed);

-- ============================================================
-- CHECKOUT EVENTS & DROP-OFF TRACKING (v2 addition)
-- ============================================================
CREATE TABLE checkout_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID REFERENCES client_profiles(id),
    session_id      VARCHAR(100) NOT NULL,
    task_id         UUID REFERENCES tasks(id),
    step            VARCHAR(50) NOT NULL,              -- 'task_created','payment_started','payment_details','confirmation','completed','abandoned'
    completed       BOOLEAN DEFAULT FALSE,
    drop_off_reason TEXT,
    recovery_action VARCHAR(50),                       -- 'email_reminder','discount_offered','simplified_flow'
    recovery_success BOOLEAN,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkout_session ON checkout_events(session_id);
CREATE INDEX idx_checkout_step ON checkout_events(step, completed);

-- ============================================================
-- DYNAMIC PRICING LOG (v2 addition)
-- ============================================================
CREATE TABLE pricing_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id       UUID REFERENCES expert_profiles(id),
    tier            expert_tier NOT NULL,
    domain          VARCHAR(50) NOT NULL,
    suggested_rate_cents INTEGER NOT NULL,
    actual_rate_cents    INTEGER,
    demand_score    NUMERIC(4,3),                      -- current demand in domain
    supply_score    NUMERIC(4,3),                      -- current Expert availability
    conversion_rate NUMERIC(4,3),                      -- historical at this price point
    model_version   VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Expert-Client Matching Algorithm

### 4.1 Problem Formulation

The matching engine is a contextual bandit that selects from a ranked shortlist of available Experts for each incoming task. The state is rich and the action space is the set of eligible Experts.

### 4.2 Scoring Function

For a given task `t` and candidate Expert `e`, the matching score is:

```
Score(t, e) = w₁ · domain_match(t, e)
            + w₂ · tier_score(e)
            + w₃ · historical_success(e, client(t))
            + w₄ · availability(e, t.deadline)
            + w₅ · price_fit(e.rate, t.budget)
            + w₆ · specialization_depth(e, t.subdomain)
            + w₇ · recency_bonus(e)
            + w₈ · text_sentiment_avg(e)
            + exploration_bonus(e, t)
```

The weights `w₁..w₈` are the **learned parameters** of the RL policy. They begin as hand-tuned priors and are updated via policy gradient optimization. The v2 addition of `w₈ · text_sentiment_avg(e)` incorporates the NLP-derived average sentiment from Client text feedback, giving the matching engine richer signal than star ratings alone.

### 4.3 Two-Phase Matching

**Phase 1 — Filtering (rule-based, <10 ms):**
1. Domain match: `t.domain ∈ e.domains`
2. Tier floor: if Client requests Pro+, exclude Standard
3. Availability: Expert has open slots within deadline window
4. Budget: `e.hourly_rate_cents ≤ t.max_budget_cents / estimated_hours`
5. Conflict check: Expert is not already reviewing Client's concurrent task

**Phase 2 — Ranking (ML-based, <50 ms):**
- Compute `Score(t, e)` for all Experts that pass Phase 1
- Apply softmax temperature τ to convert scores into a probability distribution
- Sample from the distribution (Thompson Sampling) rather than always picking argmax

### 4.4 Exploration vs. Exploitation

The system implements a **decaying ε-greedy wrapper** around Thompson Sampling:

```python
def select_expert(task, eligible_experts, episode_count):
    """Select an Expert using Thompson-Sampling with epsilon exploration."""
    epsilon = max(EPSILON_MIN, EPSILON_START * DECAY_RATE ** episode_count)
    # EPSILON_START = 0.20, EPSILON_MIN = 0.02, DECAY_RATE = 0.9995

    if random.random() < epsilon:
        # Pure exploration: pick from under-explored Expert-Client pairs
        pair_counts = get_pair_counts(task.client_id, eligible_experts)
        weights = 1.0 / (pair_counts + 1)  # inverse frequency
        chosen = random.choices(eligible_experts, weights=weights, k=1)[0]
        exploration_flag = True
    else:
        # Exploitation via Thompson Sampling
        scores = [sample_score(task, expert) for expert in eligible_experts]
        chosen = eligible_experts[argmax(scores)]
        exploration_flag = False

    log_match(task, chosen, exploration_flag)
    return chosen
```

**Why Thompson Sampling over UCB:** In a marketplace with heterogeneous reward distributions and non-stationary Expert quality, Thompson Sampling naturally concentrates exploration on uncertain Expert-Client pairs while still exploiting known-good matches. It also converges to optimal stable matchings, consistent with the theoretical properties demonstrated in bandit matching literature.

### 4.5 Feedback Loop

After every completed task, the match outcome `(client_rating, client_text_sentiment, expert_rating, completion_time, payment_success)` is fed back as the reward. The matching policy updates weights via **contextual bandit policy gradient** (LinUCB variant for cold-start, transitioning to a neural policy after 10,000 observations per domain). Text sentiment from Client comments is now a first-class component of the reward signal.

---

## 5. Reinforcement Learning Pipeline

### 5.1 MDP Formulation

| Component | Definition |
|---|---|
| **State s** | `(task_features, expert_features, client_features, match_history_embedding, text_sentiment_features, global_market_state)` — a concatenated feature vector ∈ ℝ^d where d ≈ 288 |
| **Action a** | Select Expert `e` from eligible set `E(t)` — variable-size discrete action space |
| **Reward r** | Composite: `r = 0.30·star_rating_norm + 0.15·text_reward_norm + 0.20·expert_rating_norm + 0.15·(1/completion_time_norm) + 0.10·payment_success + 0.05·repeat_booking + 0.05·text_specificity` |
| **Policy π(a\|s)** | Neural network (2-layer MLP, 288→128→\|E\|) with softmax output over eligible Experts |
| **Discount γ** | 0.95 — we care about long-term Client lifetime value, not just immediate task satisfaction |

### 5.2 Reward Decomposition

```python
def compute_reward(match_outcome):
    """Composite reward with component decomposition for diagnostics (v2: includes text reward)."""
    r_star_quality = normalize(match_outcome.client_rating, min=1, max=5)
    r_text_quality = match_outcome.text_reward if match_outcome.text_reward else r_star_quality
    r_expert       = normalize(match_outcome.expert_rating, min=1, max=5)
    r_speed        = 1.0 - clip(match_outcome.hours / match_outcome.expected_hours, 0, 2) / 2
    r_payment      = 1.0 if match_outcome.payment_success else -0.5
    r_retention    = 1.0 if match_outcome.client_rebooked_within_30d else 0.0
    r_specificity  = match_outcome.text_specificity if match_outcome.text_specificity else 0.5

    reward = (0.30 * r_star_quality
            + 0.15 * r_text_quality
            + 0.20 * r_expert
            + 0.15 * r_speed
            + 0.10 * r_payment
            + 0.05 * r_retention
            + 0.05 * r_specificity)

    return reward, {
        "star_quality": r_star_quality, "text_quality": r_text_quality,
        "expert": r_expert, "speed": r_speed, "payment": r_payment,
        "retention": r_retention, "specificity": r_specificity
    }
```

### 5.3 Training Loop

The RL pipeline operates on two cadences:

**Online (real-time):** Every completed task writes a `(state, action, reward)` tuple to a replay buffer (Memorystore for Redis Streams → Pub/Sub topic `rl-replay`). The matching policy's feature weights are updated with a lightweight online gradient step every 100 new observations.

**Offline (batch):** A full PPO retraining cycle runs weekly using the accumulated replay buffer (minimum 500 new episodes per domain). The offline loop:

1. Sample mini-batches from replay buffer
2. Compute advantage estimates (GAE with λ=0.95)
3. Run PPO clipped objective (clip ratio ε=0.2) for 4 epochs
4. Evaluate on held-out 20% of episodes
5. If `eval_reward > production_reward * 1.02` → promote to shadow mode
6. Shadow mode: new policy scores alongside production for 48 hours; if no regression → promote to canary (10% traffic) → production

**Retraining triggers:**
- Weekly scheduled
- >1,000 new episodes accumulated since last training
- Rolling 7-day average reward drops >5% from baseline (drift detection)

### 5.4 Safety Rails

- **KL constraint:** New policy must stay within KL(π_new ‖ π_old) < 0.05 to prevent catastrophic policy shifts
- **Human override:** Platform operators can pin specific Expert-Client pairs or blacklist matches
- **Fallback policy:** If the RL policy is unavailable or degraded, the system falls back to the deterministic scoring function with hand-tuned weights

---

## 6. AI Model Architecture per Domain

Each domain deploys a fine-tuned model for **error detection** — identifying likely mistakes in AI-generated outputs *before* (or in parallel with) Expert review.

### 6.1 Architecture Pattern (all domains)

**Base:** Domain-adapted encoder model (initialized from a 3B-parameter instruction-tuned LLM, e.g., Llama-class).  
**Training method:** 3-stage pipeline — Domain-Adaptive Pre-Training (DAPT) on domain corpora → Supervised Fine-Tuning (SFT) on Expert correction pairs → Direct Preference Optimization (DPO) on Client satisfaction signal (now including text-derived reward).

```
Input: AI-generated output text + domain metadata
  ↓
[Domain Encoder] → contextualized embeddings
  ↓
[Error Detection Head] → per-span probability of error + error type logits
  ↓
[Severity Regression Head] → predicted severity (1-5)
  ↓
Output: Structured Error Report
  {
    "errors_detected": [
      {"span": [120,145], "confidence": 0.92,
       "predicted_type": "finance.analytical.dcf.growth_rate",
       "predicted_severity": 4,
       "explanation": "Terminal growth rate of 8% exceeds long-run GDP..."}
    ],
    "overall_risk_score": 0.78,
    "recommended_expert_tier": "guru"
  }
```

### 6.2 Domain-Specific Configurations

| Domain | Model Does | Input Format | Output Format | Key Training Data |
|---|---|---|---|---|
| Finance | Detects valuation errors, flawed assumptions, data inconsistencies in DCF/comp models, investment memos | Structured text (markdown/HTML) + optional CSV tables | Span-level error report with taxonomy labels | Expert correction diffs on investment analyses |
| Business Strategy | Identifies logical gaps, unsupported claims, missing competitive threats, TAM/SAM errors | Strategy documents, pitch decks (text extracted) | Paragraph-level error report | Expert markups on business plans |
| Product | Flags prioritization mistakes, OKR misalignment, missing user evidence, scope creep indicators | PRDs, roadmap documents, feature specs | Section-level error report with severity | Expert reviews of product specs |
| Software | Detects code bugs, security vulnerabilities, architecture anti-patterns, missing tests | Source code + PR descriptions + architecture docs | Line-level annotations (like a linter) | Expert code reviews with inline comments |
| Legal | Identifies ambiguous clauses, compliance gaps, missing protections, cross-reference errors | Contract text (plain text extracted from PDF/DOCX) | Clause-level error report | Expert legal redlines |
| Fundraising | Catches inconsistent metrics, unrealistic projections, structural errors in deal terms | Pitch decks + financial models (text + tables) | Slide/section-level error report | Expert fundraising review annotations |
| Fintech | Detects regulatory omissions, API design flaws, settlement logic errors, unit economics mistakes | Technical specs + regulatory analysis docs | Section-level error report | Expert fintech compliance reviews |

### 6.3 Evaluation Protocol

Each domain model is evaluated against **Expert consensus** — the majority vote of 3 Guru-tier Experts on a held-out evaluation set of 200 tasks per domain. Metrics tracked:

- **Error Detection Recall@0.8precision:** fraction of real errors found while maintaining ≥80% precision
- **Taxonomy Accuracy:** top-1 and top-3 accuracy of predicted error type path
- **Severity MAE:** mean absolute error of predicted severity vs. Expert consensus severity
- **Client Proxy Score:** correlation between model's overall risk score and Client satisfaction (blended star + text reward)

### 6.4 Continuous Improvement

Every new Expert review that passes quality gates (Expert consistency_score ≥ 0.7, task not disputed) is added to the domain training set. Model retraining is triggered when:
- 500+ new training signals accumulate for a domain
- Monthly scheduled retrain regardless
- A/B evaluation shows new candidate model beats production by ≥2% on Error Detection Recall

---

## 7. Data Flow Diagram

```
                              ┌─────────────────────────────────────────────┐
                              │            A2A Global Platform               │
                              │            (Google Cloud Platform)            │
                              └─────────────────────────────────────────────┘

 ┌──────────┐   ① Upload    ┌──────────────┐  ② Create   ┌──────────────┐
 │  Client   │─────────────▶│  API Gateway  │────────────▶│  Task Service │
 └──────────┘               └──────────────┘             └──────┬───────┘
                                                                │
                    ③ Pre-screen (optional)                      │ ④ Request match
                    ┌──────────────────┐                        │
                    │ Domain AI Model   │◀───────────────────────┤
                    │ (error pre-scan)  │                        │
                    └──────────────────┘                        ▼
                                                        ┌──────────────┐
                                                        │  Matching     │
                    ⑤ Select Expert                      │  Engine (RL)  │
                    ┌──────────────────┐◀────────────────┤              │
                    │  Expert Pool      │                └──────────────┘
                    └────────┬─────────┘
                             │ ⑥ Expert accepts & reviews
                             ▼
                    ┌──────────────────┐    ⑦ Submit     ┌──────────────┐
                    │  Expert Review    │───────────────▶│  Review       │
                    │  Interface        │                │  Service      │
                    └──────────────────┘                └──────┬───────┘
                                                               │
          ┌────────────────────────────────────────────────────┤
          │                                                    │
          ▼                                                    ▼
 ┌──────────────────┐  ⑧ Classify    ┌──────────────────┐  ⑨ Extract
 │  Error Taxonomy   │◀──────────────│  Signal Pipeline  │──────────▶ training_signals
 │  Service          │               │  (Pub/Sub + DF)   │             table
 └──────────────────┘               └────────┬─────────┘
                                              │
          ┌───────────────────┬───────────────┼──────────────────┐
          │                   │               │                  │
          ▼                   ▼               ▼                  ▼
 ┌────────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────────────┐
 │ ⑩ Domain Model  │  │ ⑪ Matching │  │ ⑫ Expert   │  │ ⑬ Payment Service  │
 │   Retrain Queue │  │   Policy   │  │   Rating   │  │ (Stripe/GlomoPay/  │
 │ (Cloud Composer)│  │   Update   │  │   Update   │  │  Mercury)          │
 └────────────────┘  └────────────┘  └────────────┘  └───────────────────┘
                                                               │
          ⑭ Collect feedback (stars + text)                     │ ⑮ Pay Expert
          ┌──────────────────┐                                  ▼
 Client ──▶│  Feedback        │──▶ feedback table ──▶ NLP Text Analysis
          │  Service          │                      ──▶ RL Reward Computation
          └──────────────────┘
```

**End-to-end latency targets:**
- Steps ①–⑤ (submission to Expert assignment): <60 seconds for normal urgency; <10 seconds for urgent
- Steps ⑥–⑦ (Expert review): SLA-governed per tier (Guru: 4 hours, Pro: 8 hours, Standard: 24 hours)
- Steps ⑧–⑫ (post-review processing): <5 minutes (streaming)
- Step ⑬ (payment): <30 seconds for authorization; settlement per provider SLA
- Step ⑭ (NLP text analysis): <10 seconds per comment

---

## 8. Payment Architecture

### 8.1 Payment Flow Overview

A2A Global processes two payment directions — Client-to-Platform (collection) and Platform-to-Expert (payout) — with the platform retaining a fee on every transaction.

```
┌──────────┐                 ┌──────────────────┐                 ┌──────────────┐
│  Client   │  ──── Pay ───▶ │  A2A Global       │  ──── Pay ───▶ │   Expert      │
│           │                │  (Platform Fee    │                │              │
│           │                │   Retained)       │                │              │
└──────────┘                └──────────────────┘                └──────────────┘

Collection Methods:                               Payout Methods:
 • Stripe (primary, cards)                         • GlomoPay API (international,
 • Stripe ACH (US bank)                              India-optimized)
 • Mercury Bank ACH                                • Mercury Bank wire (US Experts)
   (enterprise clients)
```

### 8.2 Client → A2A (Collection)

| Method | Use Case | Details |
|---|---|---|
| **Stripe** (primary) | All Clients — credit/debit cards, Apple Pay, Google Pay | Stripe Checkout or Stripe Elements embedded in A2A UI. Supports 135+ currencies. |
| **Stripe ACH** | US Clients preferring bank transfer | Lower processing fees (~0.8% vs. 2.9%+30¢ for cards). Suitable for recurring/high-value tasks. |
| **Mercury Bank ACH** | Enterprise Clients with invoiced billing | Direct ACH from Client's bank to A2A's Mercury Bank account. For Clients on net-30 terms or prepaid credit balances. |

### 8.3 A2A → Expert (Payout)

| Method | Use Case | Details |
|---|---|---|
| **GlomoPay API** | International Experts, India-optimized | Low-cost cross-border payouts. API-driven batch or real-time. Supports INR, PHP, BRL, and 40+ currencies. |
| **Mercury Bank Wire** | US-based Experts | Domestic wire or ACH from A2A's Mercury account. Same-day or next-day settlement. |

### 8.4 Escrow & Fee Structure

```python
def process_payment(task, client, expert):
    """Payment flow with escrow and platform fee."""
    
    gross_amount = task.agreed_price_cents
    platform_fee = compute_platform_fee(gross_amount, expert.tier)
    # Fee schedule: Standard 20%, Pro 18%, Guru 15%
    
    expert_payout = gross_amount - platform_fee
    
    # Step 1: Collect from Client (escrow hold)
    if client.payment_method == 'stripe':
        charge = stripe.PaymentIntent.create(
            amount=gross_amount,
            currency='usd',
            customer=client.stripe_customer_id,
            transfer_group=task.id,
            capture_method='manual'  # authorize only → escrow
        )
    elif client.payment_method == 'mercury_ach':
        charge = mercury_api.create_ach_debit(
            account_id=A2A_MERCURY_ACCOUNT,
            amount_cents=gross_amount,
            counterparty=client.mercury_counterparty_id,
            memo=f"A2A Task {task.id}"
        )
    
    # Step 2: Hold in escrow until Expert review is accepted by Client
    create_escrow_record(task, charge, gross_amount, platform_fee, expert_payout)
    
    # Step 3: On Client acceptance → release payout to Expert
    if expert.payout_method == 'glomopay':
        glomopay_api.create_payout(
            recipient_id=expert.glomopay_id,
            amount_cents=expert_payout,
            currency=expert.currency,
            reference=f"A2A-{task.id}"
        )
    elif expert.payout_method == 'mercury_wire':
        mercury_api.create_wire(
            account_id=A2A_MERCURY_ACCOUNT,
            amount_cents=expert_payout,
            counterparty=expert.mercury_counterparty_id,
            memo=f"A2A Expert Payout {task.id}"
        )
    
    # Step 4: Platform retains fee in Mercury account
    record_revenue(task, platform_fee)
```

### 8.5 Payment Provider Selection Logic

```python
def select_payout_provider(expert):
    """Auto-select optimal payout method based on Expert location and preferences."""
    if expert.country == 'US':
        return 'mercury_wire'  # lowest cost for domestic
    elif expert.country == 'IN':
        return 'glomopay'      # India-optimized, best FX rates
    elif expert.currency in GLOMOPAY_SUPPORTED_CURRENCIES:
        return 'glomopay'      # international, competitive rates
    else:
        return 'mercury_wire'  # fallback: international wire via Mercury
```

---

## 9. A2A Operational Intelligence Flywheel

> *"I want the same Flywheel dynamics logic applied to A/B tests of our Interfaces UX/UI, Client Registration Optimization, Expert Registration Correction, Dropped Checkout suggestions, Commercial rates for Pro, Standard, and Guru Expert Suggestions."* — Amir Abdalov, Co-founder

A2A Global masters every aspect of operational efficiency. The same RL-driven flywheel that optimizes Expert-Client matching is applied across every operational surface of the platform. Each optimization loop generates data that feeds into the next, creating a compounding advantage that no point-solution competitor can replicate.

### 9.1 A/B Testing Framework for UX/UI

The platform runs continuous A/B tests on every user-facing interface, with RL-driven variant selection replacing static 50/50 splits.

**Multi-Armed Bandit A/B Testing:**

```python
def assign_ab_variant(user, test):
    """Thompson Sampling for A/B test traffic allocation."""
    # Instead of fixed 50/50, use Bayesian updating
    alpha_a, beta_a = test.variant_a_successes + 1, test.variant_a_failures + 1
    alpha_b, beta_b = test.variant_b_successes + 1, test.variant_b_failures + 1
    
    # Sample from Beta posterior
    theta_a = np.random.beta(alpha_a, beta_a)
    theta_b = np.random.beta(alpha_b, beta_b)
    
    variant = 'a' if theta_a > theta_b else 'b'
    
    log_assignment(user, test, variant)
    return variant
```

**Surfaces under continuous A/B optimization:**
- Landing page copy, layout, and CTAs
- Expert profile card design (which information drives Client selection)
- Task submission wizard (step count, field ordering, progressive disclosure)
- Review delivery format (summary first vs. diff first vs. risk score first)
- Notification templates (email subject lines, push notification copy)
- Pricing page layout and plan comparison presentation

### 9.2 Client Registration Funnel Optimization

```
Landing Page → Sign-Up Form → Email Verification → Profile Setup → First Task → Activated Client
     │              │               │                    │              │
     ▼              ▼               ▼                    ▼              ▼
 Drop-off      Drop-off        Drop-off             Drop-off       Drop-off
 Analysis      Analysis        Analysis              Analysis       Analysis
```

**RL-Driven Registration Optimization:**
- Track every step with `registration_funnel_events` table
- Identify highest-drop-off steps per traffic source, device type, and geography
- Auto-generate recovery actions: simplified forms, social login options, progressive profiling
- Thompson Sampling selects which registration flow variant to show each new visitor
- Optimization metric: 7-day activation rate (Client submits first task within 7 days of signup)

### 9.3 Expert Registration Correction

Expert registration has unique challenges: qualification tests create friction. The flywheel optimizes:

- **Test difficulty calibration:** If pass rates drop below 40%, the system flags overly difficult questions for review
- **Onboarding flow A/B tests:** Video walkthrough vs. text guide, single long test vs. modular mini-tests
- **Drop-off recovery:** Experts who abandon mid-qualification receive targeted re-engagement (email with tips, simplified re-entry)
- **Domain-specific funnels:** Finance Experts see finance-relevant social proof; Legal Experts see legal-relevant testimonials
- Optimization metric: 14-day qualified rate (Expert passes qualification and completes first review within 14 days)

### 9.4 Checkout Drop-Off Analysis with Automatic Recovery

```python
def analyze_checkout_dropout(session):
    """Identify dropout point and trigger recovery action."""
    
    dropout_step = get_last_completed_step(session)
    
    recovery_actions = {
        'task_created': {
            'action': 'email_reminder',
            'delay_hours': 2,
            'message': 'Your task draft is waiting. Complete it in 2 minutes.',
        },
        'payment_started': {
            'action': 'simplified_payment',
            'delay_hours': 1,
            'message': 'Having trouble with payment? Try our simplified checkout.',
            'offer': 'saved_card_shortcut'
        },
        'payment_details': {
            'action': 'discount_offer',
            'delay_hours': 4,
            'message': '10% off your first Expert review — complete your order now.',
            'offer': 'FIRST10'
        },
        'confirmation': {
            'action': 'instant_match_preview',
            'delay_hours': 0.5,
            'message': 'We found 3 top Experts for your task. Confirm to get started.',
        }
    }
    
    recovery = recovery_actions.get(dropout_step)
    if recovery:
        # RL selects which recovery action to try based on historical success
        selected_action = bandit_select_recovery(session.user, dropout_step)
        execute_recovery(session, selected_action)
```

**Recovery metrics tracked:**
- Recovery attempt rate (% of dropouts receiving a recovery action)
- Recovery success rate (% of recovery attempts leading to completed checkout)
- Revenue recovered ($ attributed to recovery actions)
- Time-to-recovery (hours from dropout to completion)

### 9.5 Dynamic Pricing Engine for Expert Tiers

The platform dynamically suggests optimal commercial rates for Standard, Pro, and Guru Experts based on real-time supply-demand signals.

```python
def compute_suggested_rate(expert, domain):
    """Dynamic pricing based on supply-demand equilibrium and conversion optimization."""
    
    # Supply signal: how many Experts of this tier are available in this domain?
    supply = count_available_experts(domain, expert.tier)
    
    # Demand signal: how many pending tasks match this domain and tier?
    demand = count_pending_tasks(domain, min_tier=expert.tier)
    
    # Historical conversion: at what price points do Clients accept and Experts deliver?
    price_conversion_curve = get_conversion_curve(domain, expert.tier)
    
    # Revenue optimization: maximize platform_fee * conversion_rate
    optimal_price = optimize_revenue(
        supply=supply,
        demand=demand,
        conversion_curve=price_conversion_curve,
        expert_floor_rate=expert.hourly_rate_cents,
        market_ceiling=get_market_ceiling(domain, expert.tier)
    )
    
    # Tier-specific adjustments
    tier_multipliers = {'standard': 1.0, 'pro': 1.8, 'guru': 3.2}
    base_rate = domain_base_rates[domain]
    suggested = int(base_rate * tier_multipliers[expert.tier] * demand_supply_ratio(demand, supply))
    
    return max(suggested, expert.hourly_rate_cents)  # never suggest below Expert's floor
```

### 9.6 Admin Panel Analytics (Super Admin Dashboard)

The Admin Panel provides super admins with a unified intelligence dashboard covering all operational dimensions:

#### 9.6.1 Core Business Metrics

| Metric | Definition | Computation |
|---|---|---|
| **CAC (Client Acquisition Cost)** | Total marketing spend / new activated Clients | Tracked per channel (organic, paid, referral) |
| **LTV (Lifetime Value)** | Predicted total revenue from a Client over their lifetime | Bayesian survival model with purchase frequency and average order value |
| **LTV:CAC Ratio** | LTV / CAC per cohort | Target: ≥3.0 |
| **Conversion Rate** | Visitors → Signups → Activated → Repeat | Funnel by stage, traffic source, and device |
| **Churn Prediction** | Probability a Client will not return within 60 days | Gradient-boosted model on recency, frequency, monetary, and task satisfaction features |
| **Expert Utilization Rate** | Hours worked / Hours available per Expert | Target: 60–80% (too high = burnout risk, too low = churn risk) |
| **Net Revenue Retention** | Revenue from existing Clients this month / Revenue from same Clients last month | Target: ≥110% (expansion > churn) |

#### 9.6.2 Additional Optimization Surfaces for Super Admins

| Optimization | Method | Expected Impact |
|---|---|---|
| **Traffic Source ROI** | Attribution modeling (multi-touch) across paid, organic, referral channels. RL optimizes budget allocation across sources. | 20–30% improvement in CAC through budget rebalancing |
| **Expert Utilization Rate Optimization** | Predict under-utilized Experts and proactively suggest domain expansion or upskilling. | 15% increase in Expert retention; 10% increase in task throughput |
| **Client Satisfaction Prediction** | Pre-task prediction of likely Client satisfaction based on task complexity, assigned Expert, and historical patterns. Flag at-risk tasks for proactive intervention. | 25% reduction in disputes |
| **Seasonal Demand Forecasting** | Time-series forecasting (Prophet + LSTM ensemble) of task volume by domain and geography. Pre-position Expert capacity. | Reduce Expert idle time by 20%; reduce matching latency by 30% during peaks |
| **Expert Churn Early Warning** | Predict Expert churn risk based on earnings trajectory, rating trends, response time patterns, and text sentiment of Client feedback about the Expert. | 30% improvement in high-value Expert retention |
| **Pricing Elasticity Analysis** | Measure Client price sensitivity per domain and tier through controlled experiments. | Optimize platform take rate without reducing demand |
| **Cross-Domain Expansion Recommendations** | Identify Experts whose skills suggest competency in adjacent domains. Recommend qualification tests. | 15% increase in multi-domain Experts; better matching pool |
| **Fraud & Abuse Detection** | Detect coordinated rating manipulation, fake reviews, and payment fraud using graph analysis and anomaly detection. | Protect marketplace integrity |

#### 9.6.3 Admin Panel Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Admin Panel (Super Admin Dashboard)                                 │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │ Business KPIs │  │ Funnel       │  │ A/B Test Management        │ │
│  │ (CAC, LTV,   │  │ Analytics    │  │ (create, monitor, promote) │ │
│  │  NRR, churn) │  │ (reg, ckout) │  │                           │ │
│  └──────────────┘  └──────────────┘  └───────────────────────────┘ │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │ Dynamic      │  │ Expert       │  │ Demand Forecasting         │ │
│  │ Pricing      │  │ Utilization  │  │ & Capacity Planning        │ │
│  │ Control      │  │ & Health     │  │                           │ │
│  └──────────────┘  └──────────────┘  └───────────────────────────┘ │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │ Traffic ROI  │  │ Payment &    │  │ Model Performance          │ │
│  │ Attribution  │  │ Revenue      │  │ & RL Policy Monitoring     │ │
│  │              │  │ Dashboard    │  │                           │ │
│  └──────────────┘  └──────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Statistical & Mathematical Foundations

> *"Add and apply all well-known extremes in academic Statistics, Probability, Advanced and Base level Mathematics, History use cases bias, and case studies in Financial Modelling, Venture Capital, Company Valuation, Private Equity."* — Amir Abdalov, Co-founder

The A2A-RLC is grounded in rigorous statistical and mathematical principles. This section documents the foundational methods, historical precedents, and financial modeling case studies that inform every algorithmic decision on the platform.

### 10.1 Survivorship Bias — Abraham Wald's WWII Aircraft Armor Analysis

**Historical case:** During World War II, the US military examined returning bombers for bullet holes and planned to armor the most-hit areas. Statistician Abraham Wald recognized the critical error: the planes that *didn't return* were the ones hit in the unarmored areas. The data showed where planes could survive damage, not where they were vulnerable.

**Application to A2A Global:**
- **Expert evaluation:** We must not evaluate Experts solely on completed tasks (survivors). Experts who decline tasks, receive low initial ratings and stop getting matched, or churn early carry equally important signal. The RL system tracks *non-events* — tasks not accepted, matches not completed, feedback not given — as informative absences.
- **Error taxonomy:** AI errors caught by Experts represent the "returning planes." The system must also model errors that Experts *miss* (detected via multi-Expert cross-validation on overlapping tasks) and errors that Clients never submit for review (detected via pre-screening model flagging issues in un-submitted drafts).
- **Metric design:** All aggregate metrics include dropout cohorts. Client satisfaction is measured inclusive of Clients who churned (imputed as low satisfaction), not just active repeat Clients.

### 10.2 Bayesian Inference for Expert Reliability Estimation

New Experts have no track record. Classical frequentist scoring (average rating) is unreliable with small samples. The A2A-RLC uses Bayesian updating:

```
Prior:          P(θ_expert) = Beta(α₀, β₀)     where α₀ = 3, β₀ = 1 (optimistic prior)
Likelihood:     P(data | θ) = Binomial(n_good, n_total, θ)
Posterior:      P(θ | data) = Beta(α₀ + n_good, β₀ + n_total - n_good)
```

**Practical effect:** A new Expert with 2 five-star ratings is not ranked above a veteran Expert with 100 reviews averaging 4.6 stars. The posterior distribution is wider for the new Expert, and the system samples from the posterior (Thompson Sampling), naturally favoring proven Experts while still exploring new ones.

**Hierarchical Bayesian model for domain transfer:** If an Expert is new to the Legal domain but has a strong track record in Finance, the system uses a hierarchical prior that shrinks the Legal estimate toward the Expert's cross-domain performance.

### 10.3 Monte Carlo Simulation for Task Outcome Prediction

Before assigning an Expert, the system runs Monte Carlo simulations to estimate the probability distribution of outcomes:

```python
def simulate_match_outcomes(task, expert, n_simulations=10000):
    """Monte Carlo simulation of match quality."""
    outcomes = []
    for _ in range(n_simulations):
        # Sample Expert performance from posterior
        expert_quality = np.random.beta(expert.alpha, expert.beta)
        
        # Sample task difficulty from domain distribution
        task_difficulty = np.random.lognormal(
            mu=domain_difficulty_mu[task.domain],
            sigma=domain_difficulty_sigma[task.domain]
        )
        
        # Sample Client satisfaction given Expert quality and task difficulty
        expected_satisfaction = expert_quality * (1 - 0.3 * task_difficulty)
        satisfaction = np.random.normal(expected_satisfaction, 0.15)
        
        # Sample completion time
        base_time = domain_avg_time[task.domain]
        completion_time = np.random.gamma(
            shape=base_time / expert.avg_speed_ratio,
            scale=expert.avg_speed_ratio
        )
        
        outcomes.append({
            'satisfaction': np.clip(satisfaction, 0, 1),
            'completion_time': completion_time,
            'success_prob': 1 if satisfaction > 0.6 else 0
        })
    
    return {
        'expected_satisfaction': np.mean([o['satisfaction'] for o in outcomes]),
        'satisfaction_p10': np.percentile([o['satisfaction'] for o in outcomes], 10),
        'expected_time_hours': np.mean([o['completion_time'] for o in outcomes]),
        'success_probability': np.mean([o['success_prob'] for o in outcomes]),
        'risk_score': np.std([o['satisfaction'] for o in outcomes])
    }
```

### 10.4 Kelly Criterion for Optimal Resource Allocation

The Kelly criterion, originally developed for gambling and later adopted in portfolio theory, determines the optimal fraction of resources to allocate to a bet with positive expected value.

**Application to A2A Global — Exploration budget allocation:**

```
f* = (p · b - q) / b

where:
  p = probability that exploring a new Expert-Client pair yields above-average reward
  q = 1 - p
  b = ratio of gain from a successful exploration to loss from an unsuccessful one
  f* = fraction of total matching traffic allocated to exploration
```

The system dynamically adjusts the exploration rate (ε in the ε-greedy policy) using Kelly-criterion logic: when the expected information gain from exploration is high (new domain, new Expert cohort), more traffic is allocated to exploration. When the system is well-calibrated, exploration shrinks toward the minimum.

**Application to marketing budget:** The Admin Panel uses Kelly-criterion-based allocation to distribute marketing spend across acquisition channels proportional to their expected ROI, avoiding over-concentration in a single channel.

### 10.5 Black-Scholes Adaptations for Expert Time Pricing

Expert time is a perishable asset (unused availability expires). The platform adapts option pricing concepts to value Expert availability:

```
C = S · N(d₁) - K · e^(-rT) · N(d₂)

Adapted:
  S = current market rate for Expert's tier + domain
  K = Expert's minimum acceptable rate
  T = time until Expert's availability window closes
  σ = volatility of demand in the Expert's domain
  r = platform's opportunity cost of capital
```

**Practical use:**
- When demand volatility is high (e.g., end-of-quarter for Finance domain), the model recommends Experts set higher rates — their time has higher "option value."
- The dynamic pricing engine (Section 9.5) uses this model to set surge pricing signals during peak demand, similar to how options markets price time premium.
- Client-facing: urgent tasks are priced with a premium that reflects the option value of Expert availability.

### 10.6 Markov Chains for User Journey Modeling

User behavior on the platform is modeled as a Markov chain, where each state represents a user engagement level:

```
States: {Visitor, Registered, Activated, Regular, Power_User, Churned, Reactivated}

Transition matrix P (estimated from observed data):

            Vis    Reg    Act    Reg*   Power  Churn  React
Visitor   [ 0.70   0.25   0.00   0.00   0.00   0.05   0.00 ]
Registered[ 0.00   0.40   0.35   0.00   0.00   0.25   0.00 ]
Activated [ 0.00   0.00   0.30   0.45   0.10   0.15   0.00 ]
Regular   [ 0.00   0.00   0.00   0.60   0.25   0.15   0.00 ]
Power     [ 0.00   0.00   0.00   0.10   0.80   0.10   0.00 ]
Churned   [ 0.00   0.00   0.00   0.00   0.00   0.85   0.15 ]
Reactivat [ 0.00   0.00   0.20   0.40   0.10   0.30   0.00 ]
```

**Applications:**
- **LTV calculation:** Compute expected lifetime value as the sum of discounted expected revenues across the absorbing Markov chain (Churned is the absorbing state).
- **Intervention targeting:** Identify the highest-leverage transitions (e.g., Activated → Regular has the highest revenue impact per transition probability improvement).
- **Registration funnel modeling:** Each registration step is a state; transition probabilities reveal bottlenecks.

### 10.7 Central Limit Theorem Applications for Quality Assurance

The CLT ensures that aggregate Expert quality metrics converge to normal distributions as sample size grows, enabling:

- **Confidence intervals on Expert ratings:** With n reviews, the 95% CI on true quality is `x̄ ± 1.96 · s/√n`. Experts with fewer than 30 reviews have wider CIs and are not ranked with high confidence.
- **Batch quality control:** If a batch of N tasks in a domain has average satisfaction below `μ - 2σ/√N`, the system flags a domain-level quality degradation alert.
- **A/B test significance:** Sample size calculations for A/B tests use CLT-based power analysis: `n = (z_α/2 + z_β)² · 2σ² / δ²` where δ is the minimum detectable effect.

### 10.8 Simpson's Paradox Awareness in Aggregated Metrics

Simpson's paradox occurs when a trend present in disaggregated data reverses when the data is combined.

**A2A-specific risk:** An Expert might have higher ratings than another Expert in *every* individual domain, yet have a lower *overall* average because they take on more tasks in harder domains.

**Mitigation:**
- All Expert comparisons in the matching engine are domain-stratified.
- Admin Panel dashboards always show both aggregate and domain-level metrics side by side.
- Automated alerts fire when aggregate metrics and stratified metrics tell conflicting stories.
- The RL reward function stratifies by domain complexity to prevent the policy from learning to avoid hard tasks.

### 10.9 Regression to the Mean in Expert Performance Evaluation

An Expert who receives an unusually high (or low) rating on a single task is likely to regress toward their true mean on subsequent tasks. Naively reacting to extreme observations leads to:
- Over-promoting Experts after a lucky streak
- Under-matching Experts after an unlucky task

**Mitigation:**
- Expert scores use exponential moving averages with a decay factor (λ = 0.95) rather than simple means.
- Tier promotion decisions require sustained performance over ≥20 tasks, not single-task spikes.
- The Bayesian posterior (Section 10.2) naturally regresses extreme observations toward the prior.

### 10.10 Financial Modeling Case Studies

#### 10.10.1 Venture Capital Portfolio Theory — Power Law Returns

VC returns follow a power law: a small number of investments generate the majority of returns. The Pareto principle applies.

**Application to A2A Global:**
- **Expert portfolio:** A small fraction of Guru-tier Experts will generate disproportionate value (highest Client satisfaction, most training signals, strongest retention effect). The platform should invest disproportionately in retaining these "power law" Experts.
- **Domain investment:** Not all domains will contribute equally to revenue. The RL system should allocate engineering resources (model training, taxonomy refinement) following a power-law-aware strategy — focus on the 2–3 domains with the highest growth potential first.
- **Client LTV distribution:** A2A should expect that ~20% of Clients will generate ~80% of revenue. Churn prevention for top-quintile Clients has asymmetric ROI.

#### 10.10.2 DCF Sensitivity Analysis Errors

A common error in DCF (Discounted Cash Flow) valuation is over-sensitivity to terminal value assumptions. Small changes in terminal growth rate or WACC can swing valuations by 50%+.

**Application to A2A Global:**
- **Financial projections:** A2A's own financial model must include Monte Carlo sensitivity analysis on key assumptions (task volume growth rate, take rate, Expert supply elasticity).
- **Expert detection:** The Finance domain error detection model is specifically trained to flag DCF sensitivity failures — one of the most common errors in AI-generated financial analysis.
- **Admin Panel:** The revenue forecasting dashboard shows sensitivity tornado charts, not single-point projections.

#### 10.10.3 Private Equity Valuation Multiples Bias

PE firms often anchor on comparable transaction multiples, ignoring differences in growth rates, margins, and capital structure between the target and comparables.

**Application to A2A Global:**
- **Expert marketplace valuation:** When evaluating A2A Global's own valuation (for fundraising), the platform must compare against marketplaces with similar unit economics (two-sided, service-based, recurring), not all tech platforms indiscriminately.
- **Error taxonomy:** The Finance domain taxonomy includes "Comparable Misselection" and "Multiple Misapplication" as L2 categories — directly informed by PE valuation pitfalls.
- **Training data quality:** The system weights training signals from Experts who catch subtle valuation errors (not just obvious arithmetic mistakes) more heavily, following the power-law insight that rare, high-severity errors are more valuable for model training.

#### 10.10.4 Company Valuation — The Narrative-Numbers Bridge

Per Aswath Damodaran's framework, valuation is the bridge between qualitative narrative and quantitative numbers. AI models often generate numbers disconnected from narrative (e.g., projecting 40% growth while describing a mature market).

**Application to A2A Global:**
- The error detection models are trained to identify **narrative-number inconsistencies** — flagging when quantitative projections contradict qualitative descriptions in the same document.
- This is a cross-head architecture feature: the error detection head looks for span-level errors while a global consistency head checks for document-level contradictions.

---

## 11. Data Infrastructure & Disaster Recovery

> *"Create a backup (completely separate mirror) of all Kubernetes clusters in Google Cloud, of all data we collect about our business, Experts, Clients, finance and machine data. Let's keep all in Google Cloud Platform."* — Amir Abdalov, Co-founder

### 11.1 Primary Infrastructure (Google Cloud Platform)

All A2A Global infrastructure runs on Google Cloud Platform. The primary deployment:

| Component | GCP Service | Configuration |
|---|---|---|
| **Container Orchestration** | Google Kubernetes Engine (GKE) | Regional cluster, auto-scaling node pools (standard + GPU) |
| **Primary Database** | Cloud SQL for PostgreSQL 16 | High-availability, automatic failover, `uuid-ossp` + `ltree` extensions |
| **Cache / Replay Buffer** | Memorystore for Redis | 16 GB instance, Redis 7.x |
| **Event Streaming** | Pub/Sub + Dataflow | Durable, ordered event processing for signal pipeline |
| **Stream Processing** | Cloud Dataflow (Apache Beam) | Real-time signal extraction and error classification |
| **Batch Orchestration** | Cloud Composer (managed Airflow) | Model training DAGs with dependency management |
| **Object Storage** | Google Cloud Storage (GCS) | AI outputs, corrected outputs, model artifacts |
| **Model Training** | Vertex AI + GKE GPU Node Pools | A100/H100 GPU instances for domain model training |
| **Model Serving** | Vertex AI Prediction / GKE with vLLM | High-throughput inference for error detection |
| **Observability** | Cloud Monitoring + Cloud Trace + Cloud Logging | Metrics, distributed tracing, alerting |
| **API Gateway** | Cloud Endpoints / Apigee | Rate limiting, authentication, API management |
| **DNS & CDN** | Cloud DNS + Cloud CDN | Global edge caching for static assets |
| **Secrets Management** | Secret Manager | API keys, database credentials, payment provider secrets |
| **Identity** | Identity Platform | JWT + OAuth for user authentication |

### 11.2 Disaster Recovery Mirror (Separate GCP Project)

A completely separate mirror of all infrastructure exists in a distinct GCP project and region for disaster recovery.

```
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│  PRIMARY: GCP Project "a2a-prod"     │     │  MIRROR: GCP Project "a2a-dr"        │
│  Region: us-central1                 │     │  Region: us-east4                    │
│                                     │     │                                     │
│  ┌─────────────────────────────┐    │     │  ┌─────────────────────────────┐    │
│  │ GKE Cluster (production)    │    │     │  │ GKE Cluster (standby)       │    │
│  │ - All microservices         │    │     │  │ - All microservices (scaled  │    │
│  │ - GPU node pools            │    │     │  │   to minimum, auto-scale    │    │
│  │ - Istio service mesh        │    │     │  │   on failover)              │    │
│  └─────────────────────────────┘    │     │  └─────────────────────────────┘    │
│                                     │     │                                     │
│  ┌─────────────────────────────┐    │     │  ┌─────────────────────────────┐    │
│  │ Cloud SQL (Primary)         │───────────▶│ Cloud SQL (Read Replica +    │    │
│  │ PostgreSQL 16               │  realtime │ │ Cross-Region Replica)       │    │
│  │ High Availability           │  replica  │ │ Promotable to primary       │    │
│  └─────────────────────────────┘    │     │  └─────────────────────────────┘    │
│                                     │     │                                     │
│  ┌─────────────────────────────┐    │     │  ┌─────────────────────────────┐    │
│  │ GCS Buckets                 │───────────▶│ GCS Buckets (dual-region     │    │
│  │ - ai-outputs/               │  realtime │ │ or multi-region replication) │    │
│  │ - corrected-outputs/        │  sync     │ │                             │    │
│  │ - model-artifacts/          │    │     │  │                             │    │
│  │ - training-data/            │    │     │  │                             │    │
│  └─────────────────────────────┘    │     │  └─────────────────────────────┘    │
│                                     │     │                                     │
│  ┌─────────────────────────────┐    │     │  ┌─────────────────────────────┐    │
│  │ Memorystore (Redis)         │    │     │  │ Memorystore (Redis)          │    │
│  │ Primary                     │    │     │  │ Standby (warm)               │    │
│  └─────────────────────────────┘    │     │  └─────────────────────────────┘    │
│                                     │     │                                     │
│  ┌─────────────────────────────┐    │     │  ┌─────────────────────────────┐    │
│  │ Pub/Sub Topics              │───────────▶│ Pub/Sub Subscriptions        │    │
│  │ (all event topics)          │    │     │  │ (mirror consumers, replay)  │    │
│  └─────────────────────────────┘    │     │  └─────────────────────────────┘    │
└─────────────────────────────────────┘     └─────────────────────────────────────┘
```

### 11.3 Data Categories & Backup Strategy

| Data Category | Storage | Backup Method | RPO | Retention |
|---|---|---|---|---|
| **User Data** (profiles, auth, preferences) | Cloud SQL | Real-time cross-region replica + daily automated snapshots | < 1 minute | 365 days (snapshots), real-time (replica) |
| **Financial Data** (payments, invoices, payouts) | Cloud SQL | Real-time cross-region replica + daily snapshots + weekly cold export to GCS archive | < 1 minute | 7 years (regulatory compliance) |
| **Task & Review Data** | Cloud SQL + GCS | Real-time replica (SQL), multi-region GCS | < 1 minute | Indefinite (training value) |
| **ML Training Data** | GCS (Nearline) | Multi-region GCS replication | < 5 minutes | Indefinite |
| **Model Artifacts** | GCS + Vertex AI Model Registry | Multi-region GCS, model registry versioning | < 5 minutes | All versions retained |
| **Operational Logs** | Cloud Logging | Log Router to BigQuery + GCS archive | < 1 minute | 90 days (hot), 2 years (cold) |
| **Event Streams** | Pub/Sub | Dual-subscription (primary + mirror project) | 0 (synchronous) | 7 days (Pub/Sub retention) + BigQuery sink (indefinite) |
| **Kubernetes Config** | GKE + GitOps (Config Sync) | Git repository (source of truth), Config Sync to both clusters | 0 (git push) | Indefinite (git history) |

### 11.4 Recovery Objectives & Procedures

| Objective | Target | Method |
|---|---|---|
| **RPO (Recovery Point Objective)** | < 1 minute | Real-time Cloud SQL replication + synchronous Pub/Sub dual-subscription |
| **RTO (Recovery Time Objective)** | < 15 minutes | GKE standby cluster auto-scales; Cloud SQL replica promotes to primary; DNS failover via Cloud DNS health checks |
| **Backup Verification** | Weekly automated | Cloud Scheduler triggers a job that restores the latest snapshot to an ephemeral Cloud SQL instance, runs integrity checks (row counts, checksum validation, referential integrity), and reports results to the #ops-alerts channel |
| **Full DR Drill** | Monthly | Simulated primary region failure; traffic routed to mirror; all services validated end-to-end; drill results documented |

### 11.5 Automated Restore Testing

```python
# Cloud Composer DAG: weekly backup verification
def verify_backup():
    """Automated backup integrity verification (runs weekly)."""
    
    # 1. Restore latest Cloud SQL snapshot to ephemeral instance
    ephemeral_instance = cloud_sql_admin.restore_snapshot(
        project='a2a-dr',
        snapshot=get_latest_snapshot('a2a-prod'),
        instance_name=f'backup-verify-{date.today().isoformat()}'
    )
    
    # 2. Run integrity checks
    checks = {
        'row_count_users': "SELECT COUNT(*) FROM users",
        'row_count_tasks': "SELECT COUNT(*) FROM tasks",
        'row_count_payments': "SELECT COUNT(*) FROM payments",
        'referential_integrity': "SELECT COUNT(*) FROM tasks t LEFT JOIN users u ON t.client_id = u.id WHERE u.id IS NULL",
        'financial_checksum': "SELECT SUM(amount_cents) FROM payments WHERE status = 'captured'",
    }
    
    results = run_checks(ephemeral_instance, checks)
    
    # 3. Compare against production
    prod_results = run_checks('a2a-prod-primary', checks)
    drift = compute_drift(results, prod_results)
    
    # 4. Report & cleanup
    if drift > ACCEPTABLE_DRIFT_THRESHOLD:
        alert_ops_team(f"Backup drift detected: {drift}")
    
    cloud_sql_admin.delete_instance(ephemeral_instance)
    
    return {'status': 'pass' if drift <= ACCEPTABLE_DRIFT_THRESHOLD else 'fail', 'drift': drift}
```

---

## 12. Docker & Microservices Architecture

### 12.1 Service Topology

```
┌────────────────────────────────────────────────────────────────────┐
│  GKE Cluster (Google Kubernetes Engine) — us-central1              │
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐        │
│  │ API Gateway  │  │ Auth Service│  │ Notification Service│        │
│  │ (Envoy/Istio)│  │ (JWT+OAuth) │  │ (email, push, ws)  │        │
│  │ Port: 8000   │  │ Port: 8001  │  │ Port: 8006          │        │
│  └─────────────┘  └─────────────┘  └─────────────────────┘        │
│                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐       │
│  │ Task Service │  │ Review       │  │ Matching Engine      │       │
│  │ (CRUD+files) │  │ Service      │  │ Service              │       │
│  │ Port: 8002   │  │ Port: 8003   │  │ Port: 8004           │       │
│  └─────────────┘  └──────────────┘  └─────────────────────┘       │
│                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐       │
│  │ Payment     │  │ Feedback     │  │ Qualification Test   │       │
│  │ Service     │  │ Service      │  │ Service              │       │
│  │ Port: 8005  │  │ Port: 8007   │  │ Port: 8008           │       │
│  └─────────────┘  └──────────────┘  └─────────────────────┘       │
│                                                                    │
│  ┌─────────────────────────────┐  ┌───────────────────────┐       │
│  │ NLP Text Feedback Service   │  │ Operational Intelligence│      │
│  │ (sentiment, aspect, intent) │  │ Service (A/B, pricing, │      │
│  │ Port: 8011                  │  │ funnel analytics)      │      │
│  └─────────────────────────────┘  │ Port: 8012             │      │
│                                    └───────────────────────┘       │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │ RL Training Pipeline (batch — Cloud Composer + Vertex AI)│      │
│  │  - Signal extraction jobs                                │       │
│  │  - Model training jobs (GPU nodes)                       │       │
│  │  - Model evaluation & promotion jobs                     │       │
│  │  Port: 8009 (Composer UI)                                │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                    │
│  ┌──────────────────────────────────────┐                          │
│  │ Domain AI Model Serving (vLLM/Triton)│                          │
│  │  - finance-error-detector             │                          │
│  │  - legal-error-detector               │                          │
│  │  - ... (one model per domain)         │                          │
│  │  Port: 8010                           │                          │
│  └──────────────────────────────────────┘                          │
│                                                                    │
│  Infrastructure (GCP Managed Services):                            │
│  ┌──────────┐ ┌────────┐ ┌───────┐ ┌──────────┐ ┌──────────────┐ │
│  │Cloud SQL │ │Memory- │ │Pub/Sub│ │   GCS    │ │Cloud Monit.  │ │
│  │(Postgres)│ │store   │ │(event │ │(files+  │ │+ Cloud Trace │ │
│  │          │ │(Redis) │ │ bus)  │ │ models) │ │+ Grafana     │ │
│  └──────────┘ └────────┘ └───────┘ └──────────┘ └──────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### 12.2 Key Dockerfile Patterns

Each service follows a multi-stage build:

```dockerfile
# --- Example: Matching Engine Service ---
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS runtime
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY src/ ./src/
COPY models/ ./models/           # Lightweight policy weights (<50 MB)
ENV PYTHONUNBUFFERED=1
EXPOSE 8004
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8004/health || exit 1
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8004", "--workers", "4"]
```

**RL Training Pipeline** uses a GPU-capable base image:

```dockerfile
FROM nvidia/cuda:12.4-runtime-ubuntu22.04 AS runtime
RUN apt-get update && apt-get install -y python3.12 python3-pip
COPY requirements-training.txt .
RUN pip install --no-cache-dir -r requirements-training.txt
COPY training/ ./training/
CMD ["python3", "training/run_pipeline.py"]
```

### 12.3 Inter-Service Communication

| Pattern | Used For | Technology |
|---|---|---|
| Synchronous REST/gRPC | User-facing CRUD, matching requests | FastAPI (REST) + gRPC for internal hot paths |
| Async event streaming | Post-review signal extraction, model retraining triggers | Pub/Sub (topics: `task-events`, `review-events`, `rl-replay`, `model-lifecycle`, `feedback-text`) |
| WebSocket | Real-time task status updates, Expert notifications | Memorystore Pub/Sub → WebSocket gateway |
| Batch orchestration | Model training, evaluation, promotion | Cloud Composer (managed Airflow) DAGs |

---

## 13. Competitive Moat Analysis

### 13.1 Data Flywheel Effect

Every task produces structured, domain-labeled, Expert-validated training data. No public dataset captures this: the specific mistakes that frontier AI models make, annotated by domain Experts with severity scores and taxonomic classifications. This data cannot be purchased or collected externally — it can only be generated through the marketplace interaction itself.

**Compounding dynamics:**
- More tasks → more training signals → better domain models → higher Client value → more tasks
- Better models → higher pre-screening accuracy → lower Expert burden → lower cost → more competitive pricing → more Clients
- More text feedback → richer NLP reward signals → better matching → higher satisfaction → more detailed text feedback

At 10,000 completed tasks per domain, A2A Global's error detection models will have been trained on a proprietary corpus of AI failure modes that no competitor can replicate without building an equivalent marketplace from scratch.

### 13.2 Domain-Specific Error Taxonomies (Proprietary IP)

The hierarchical error taxonomies are the ontological backbone of the platform. They are:
- **Curated from real-world AI failures**, not theoretical categorizations
- **Continuously refined** by Expert consensus and automated clustering
- **Deeply domain-specific** — distinguishing between a DCF terminal value error and a comparable company misselection is not generic NLP

These taxonomies have standalone commercial value (licensable to AI companies for evaluation benchmarks) and are a prerequisite for training effective domain models.

### 13.3 Expert Network Effects

As the Expert pool grows:
- Matching quality improves (more candidates per task → better fit)
- Qualification tests become harder (calibrated against a larger baseline)
- Inter-rater reliability metrics become more robust → higher signal quality for training
- Guru-tier Experts become de facto domain authorities whose corrections carry outsized training weight

Expert switching costs are real: their reputation, qualification history, earnings history, and preferred Client relationships are platform-locked.

### 13.4 RL-Optimized Matching

The matching engine improves monotonically with scale. Every completed task is a training episode. Early-stage competitors using rule-based matching will systematically under-perform A2A Global's RL policy on:
- Client satisfaction (the policy learns subtle Client preferences, including those expressed only in text feedback)
- Expert utilization (the policy learns optimal load balancing)
- First-time resolution rate (the policy learns which Expert specializations map to which error types)

This advantage is self-reinforcing: better matches → higher ratings → better reward signal → even better matches.

### 13.5 Operational Excellence as Competitive Moat

> *"Since we master every aspect of operational efficiency."* — Amir Abdalov, Co-founder

A2A Global's competitive advantage extends far beyond the core RL matching engine. The Operational Intelligence Flywheel (Section 9) applies the same RL-driven optimization to every operational surface:

| Operational Surface | Competitor Approach | A2A Approach | Advantage |
|---|---|---|---|
| **Registration funnels** | Static forms, manual optimization | RL-driven variant selection, auto-recovery | 2–3x higher activation rates |
| **Checkout flow** | Standard e-commerce checkout | Drop-off analysis with automated recovery suggestions | 20–40% abandoned checkout recovery |
| **Pricing** | Fixed tiers | Dynamic pricing engine responding to supply-demand signals | 15–25% higher revenue per Expert-hour |
| **A/B testing** | Manual 50/50 splits, slow iteration | Thompson Sampling multi-armed bandit, continuous learning | 3–5x faster experiment velocity |
| **Admin analytics** | Basic dashboards | Predictive models (churn, satisfaction, demand), Kelly-criterion budget allocation | Proactive instead of reactive management |
| **Expert retention** | Manual outreach | Predictive churn models, utilization optimization, dynamic rate suggestions | 30%+ improvement in Expert retention |

This operational mastery is a **systems-level moat**: no individual feature can be copied; the compounding effect of optimizing every surface simultaneously creates an exponentially growing advantage. A competitor would need to replicate not just the matching engine but the entire operational intelligence infrastructure.

### 13.6 Client Switching Costs

Over time, A2A Global's domain models learn **Client-specific patterns** — the types of AI outputs a Client submits, the recurring error patterns in their domain, the quality threshold they expect. This creates:
- **Personalized pre-screening:** The model flags errors before the Expert even starts, reducing turnaround time
- **Institutional memory:** The platform "remembers" past corrections and can warn when the same mistake recurs
- **Benchmarking:** Clients can see how their AI error rate trends over time, creating analytical lock-in

### 13.7 Quantified Moat Timeline

| Milestone | Tasks Completed | Estimated Moat Depth |
|---|---|---|
| Launch | 0 | None — rule-based matching, no models |
| 1,000 tasks | 1,000 | Taxonomy v1 validated; early signal advantage; NLP feedback pipeline calibrated |
| 10,000 tasks | 10,000 | First domain models outperform zero-shot LLMs on error detection; Operational Flywheel generating measurable conversion lifts |
| 50,000 tasks | 50,000 | RL matching measurably superior; taxonomy depth unreplicable; dynamic pricing and funnel optimization at scale |
| 100,000 tasks | 100,000 | Full flywheel: domain models, matching, operational intelligence, and Expert scoring are mutually reinforcing; 18+ month replication barrier |

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Pre-Launch → Launch)
- [ ] Cloud SQL PostgreSQL schema deployed on GCP; user registration (Expert + Client)
- [ ] Qualification test engine (per domain, auto-graded MC + manually graded open-ended)
- [ ] Task submission pipeline (file upload to GCS, text extraction, metadata tagging)
- [ ] **Rule-based matching** (Phase 1 scoring function with hand-tuned weights)
- [ ] Expert review interface (rich text diff editor with annotation support)
- [ ] Payment integration: Stripe (Client collection), Mercury Bank (US Expert payouts), GlomoPay (international Expert payouts)
- [ ] Escrow logic: funds held until Client accepts Expert review
- [ ] Feedback collection (bidirectional: stars + free-text comments)
- [ ] NLP text feedback pipeline v1 (sentiment analysis on Client comments)
- [ ] GKE cluster deployment (primary region: us-central1)
- [ ] DR mirror project setup (us-east4) with Cloud SQL cross-region replica
- **Key metric:** First 100 completed tasks across ≥3 domains

### Phase 2: Instrumentation (Month 1–3)
- [ ] Error taxonomy v1 deployed for all 7 domains (L1 + L2 levels)
- [ ] Annotation interface updated to enforce taxonomy tagging on every correction
- [ ] Training signal extraction pipeline (Pub/Sub → Dataflow → signal table) operational
- [ ] Expert scoring algorithm live (consistency_score computed from inter-rater agreement on overlapping tasks)
- [ ] Match history logging with full feature vectors for future RL training
- [ ] Text feedback NLP pipeline v2: aspect extraction + intent classification
- [ ] Registration funnel tracking deployed (both Client and Expert funnels)
- [ ] Checkout event tracking deployed
- [ ] Basic Admin Panel dashboard (task volume, domain breakdown, Expert utilization, avg ratings, CAC, LTV)
- [ ] Automated backup verification (weekly Cloud Composer DAG)
- **Key metric:** 1,000+ classified training signals; taxonomy coverage ≥90% of observed errors

### Phase 3: First Models & Operational Intelligence (Month 3–6)
- [ ] First domain-specific error detection model trained (start with Finance — highest expected volume)
- [ ] Model deployed in **shadow mode** — runs on every task, outputs logged but not shown to users
- [ ] Contextual bandit matching policy trained on accumulated match history (LinUCB)
- [ ] A/B test: RL matching vs. rule-based matching (primary metric: Client rating; guardrail: Expert acceptance rate)
- [ ] Taxonomy auto-expansion: DBSCAN clustering of uncategorized corrections surfaces candidate L3 nodes
- [ ] A/B testing framework launched (Thompson Sampling for UX/UI variants)
- [ ] Dynamic pricing engine v1 (supply-demand based rate suggestions for Experts)
- [ ] Checkout drop-off recovery system v1 (email reminders, simplified re-entry)
- [ ] Registration funnel optimization v1 (RL-driven variant selection for signup flows)
- [ ] Admin Panel: churn prediction model, traffic source ROI attribution
- **Key metric:** Finance error detection model achieves ≥0.60 Recall@0.8precision on held-out set; checkout recovery rate ≥15%

### Phase 4: Full RL Pipeline & Flywheel (Month 6–12)
- [ ] Neural matching policy (MLP) replaces LinUCB; PPO training loop operational
- [ ] Domain models deployed for all 7 verticals; pre-screening enabled (Clients see AI risk score before Expert review)
- [ ] DPO alignment stage added: models fine-tuned on Client satisfaction preference pairs (star + text reward)
- [ ] Automated retraining pipeline (Cloud Composer DAG) with shadow → canary → production promotion
- [ ] Expert tier auto-promotion recommendations based on qualification scores + platform performance
- [ ] Cross-domain transfer learning experiments (shared error embedding space)
- [ ] Full Operational Intelligence Flywheel: dynamic pricing, registration optimization, checkout recovery, A/B testing all running simultaneously
- [ ] Seasonal demand forecasting model deployed (Prophet + LSTM ensemble)
- [ ] Admin Panel: full suite — CAC/LTV/NRR dashboards, Expert utilization optimization, satisfaction prediction, fraud detection
- [ ] Monthly DR drill process established and documented
- **Key metric:** RL matching outperforms rule-based by ≥15% on composite reward; ≥3 domain models in production with Recall ≥0.70; operational flywheel contributing ≥10% incremental revenue through optimization

---

## Appendix A: Key Metrics Dashboard

| Metric | Definition | Target (Phase 4) |
|---|---|---|
| Task Completion Rate | % of submitted tasks reaching "completed" status | ≥92% |
| Avg. Client Rating (Stars) | Mean star rating across all completed tasks | ≥4.3 / 5.0 |
| Avg. Client Text Sentiment | Mean NLP sentiment score from Client comments | ≥0.70 |
| Expert Acceptance Rate | % of match offers accepted by first-choice Expert | ≥75% |
| Matching Latency (P95) | Time from task submission to Expert assignment | <120 seconds |
| Error Detection Recall | Domain model recall at 80% precision | ≥0.70 |
| RL vs. Baseline Lift | Composite reward improvement of RL policy over rule-based | ≥15% |
| Training Signal Throughput | New classified training signals per week | ≥2,000 |
| Expert Retention (90-day) | % of active Experts still active after 90 days | ≥70% |
| Client Repeat Rate (30-day) | % of Clients who submit ≥2 tasks within 30 days | ≥40% |
| Registration Conversion (Client) | Visitor → Activated Client rate | ≥8% |
| Registration Conversion (Expert) | Visitor → Qualified Expert rate | ≥12% |
| Checkout Recovery Rate | % of abandoned checkouts recovered via automated actions | ≥20% |
| LTV:CAC Ratio | Lifetime Value / Customer Acquisition Cost | ≥3.0 |
| Net Revenue Retention | Month-over-month revenue from existing Clients | ≥110% |
| Backup Verification Pass Rate | % of weekly backup integrity checks passing | 100% |
| DR Drill Success Rate | % of monthly DR drills completing within RTO | 100% |

---

## Appendix B: Technology Stack Summary (Google Cloud Platform)

| Layer | Technology | Rationale |
|---|---|---|
| Primary Database | Cloud SQL for PostgreSQL 16 with ltree, uuid-ossp | Hierarchical taxonomy queries; ACID compliance; managed HA |
| Cache / Replay Buffer | Memorystore for Redis 7 | Sub-ms matching feature lookups; RL replay buffer |
| Event Streaming | Google Cloud Pub/Sub | Durable, ordered event log for signal pipeline; global availability |
| Stream Processing | Cloud Dataflow (Apache Beam) | Real-time signal extraction and error classification |
| Batch Orchestration | Cloud Composer (managed Airflow) | Model training DAGs with dependency management |
| Model Training | PyTorch + Hugging Face Transformers + TRL on Vertex AI | SFT/DPO/PPO training loops with managed GPU infrastructure |
| Model Serving | Vertex AI Prediction + vLLM on GKE GPU pools | High-throughput inference for error detection |
| NLP Feedback Analysis | Fine-tuned BERT on Vertex AI | Sentiment, aspect, and intent extraction from Client comments |
| API Framework | FastAPI (Python) | Async-first, OpenAPI spec generation |
| Container Orchestration | Google Kubernetes Engine (GKE) | Auto-scaling, rolling deployments, GPU node pools |
| Object Storage | Google Cloud Storage (GCS) | AI outputs, corrected outputs, model artifacts |
| Observability | Cloud Monitoring + Cloud Trace + Cloud Logging + Grafana | Metrics, distributed tracing, alerting |
| Client Payment Collection | Stripe + Mercury Bank ACH | Cards, digital wallets + enterprise bank transfers |
| Expert Payouts | GlomoPay API + Mercury Bank Wire | International (India-optimized) + US domestic payouts |
| Secrets Management | Google Secret Manager | API keys, credentials, payment provider tokens |
| DNS & CDN | Cloud DNS + Cloud CDN | Global edge caching, DNS-based failover for DR |
| Disaster Recovery | Separate GCP project (us-east4), Cloud SQL cross-region replica, multi-region GCS | RPO < 1 min, RTO < 15 min |
| Data Warehouse | BigQuery | Long-term analytics, Admin Panel queries, financial reporting |

---

## Appendix C: Version History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | April 8, 2026 | Office of the Chief Architect | Initial architecture document: core learning loop, data pipeline, schema, matching algorithm, RL pipeline, domain models, microservices, competitive moat, implementation roadmap |
| 2.0 | April 9, 2026 | Office of the Chief Architect, incorporating review by **Amir Abdalov, Co-founder, A2A Global Inc.** | **8 co-founder directives incorporated:** (1) Version 2 attribution; (2) NLP text feedback analysis — sentiment/aspect/intent extraction from Client comments, blended star+text reward signals, new `feedback_text_analysis` schema table; (3) A2A Operational Intelligence Flywheel — A/B testing framework (Thompson Sampling), Client registration funnel optimization, Expert registration correction, checkout drop-off recovery, dynamic pricing engine for Expert tiers, Admin Panel analytics (CAC, LTV, churn prediction, traffic ROI, Expert utilization, seasonal demand forecasting); (4) Statistical & Mathematical Foundations — survivorship bias (Abraham Wald WWII), Bayesian inference, Monte Carlo simulation, Kelly criterion, Black-Scholes adaptations, Markov chains, CLT, Simpson's paradox, regression to the mean, VC portfolio theory, DCF sensitivity analysis, PE valuation multiples bias; (5) Operational excellence positioned as core competitive moat; (6) Complete data infrastructure & disaster recovery with separate GCP project mirror, RPO < 1 min, RTO < 15 min, automated backup verification; (7) All infrastructure consolidated to Google Cloud Platform (GKE, Cloud SQL, GCS, Pub/Sub, Dataflow, Composer, Vertex AI, Memorystore, Cloud Monitoring); (8) Payment architecture — Client collection via Stripe + Mercury ACH, Expert payouts via GlomoPay API + Mercury Wire, escrow logic, fee structure |

---

*This document is a living artifact. It will be updated as the platform evolves from Phase 1 data collection through Phase 4 full RL and operational flywheel deployment. All architectural decisions are reversible except two invariants: (1) every interaction is a training signal, and (2) every operational surface is an optimization surface.*

**— Office of the Chief Architect, A2A Global Inc.**  
**Reviewed and directed by: Amir Abdalov, Co-founder, A2A Global Inc.**
