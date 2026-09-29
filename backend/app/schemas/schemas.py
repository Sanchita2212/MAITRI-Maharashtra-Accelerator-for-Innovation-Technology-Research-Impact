"""
Pydantic schemas mirroring the SQLAlchemy models, plus request/response
shapes for the matching, eligibility, evaluation, and RAG endpoints.
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# ---------------------------------------------------------------------------
# Department / Problem / Challenge
# ---------------------------------------------------------------------------
class DepartmentOut(BaseModel):
    department_id: str
    name: str
    description: Optional[str] = None
    sector: Optional[str] = None
    contact_region: Optional[str] = None
    synthetic: bool = True

    class Config:
        from_attributes = True


class ProblemCreate(BaseModel):
    department_id: str
    title: str
    description: str
    sector: Optional[str] = None
    priority: str = "MEDIUM"


class ProblemOut(BaseModel):
    problem_id: str
    department_id: str
    title: str
    description: Optional[str] = None
    sector: Optional[str] = None
    priority: str
    status: str
    created_at: datetime
    synthetic: bool = True

    class Config:
        from_attributes = True


class ChallengeGenerateRequest(BaseModel):
    problem_id: str


class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_technologies: Optional[List[str]] = None
    budget_range_inr: Optional[str] = None
    timeline_months: Optional[int] = None


class ChallengeOut(BaseModel):
    challenge_id: str
    problem_id: Optional[str] = None
    department_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    sector: Optional[str] = None
    required_technologies: List[str] = []
    budget_range_inr: Optional[str] = None
    timeline_months: Optional[int] = None
    status: str
    ai_generated: bool = False
    created_at: datetime
    synthetic: bool = True

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
class StartupOut(BaseModel):
    startup_id: str
    company_name: str
    description: Optional[str] = None
    sectors: List[str] = []
    technologies: List[str] = []
    capabilities: List[str] = []
    products: List[str] = []
    trl_level: Optional[int] = None
    headquarters: Optional[str] = None
    operating_regions: List[str] = []
    team_size: Optional[int] = None
    previous_pilots: int = 0
    government_experience: bool = False
    certifications: List[str] = []
    deployment_capacity: Optional[str] = None
    funding_stage: Optional[str] = None
    founded_year: Optional[int] = None
    synthetic: bool = True

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------
class MatchResult(BaseModel):
    startup: StartupOut
    match_score: float
    matching_capabilities: List[str]
    matching_technologies: List[str]
    relevant_experience: str
    missing_requirements: List[str]


class MatchResponse(BaseModel):
    challenge_id: str
    results: List[MatchResult]


# ---------------------------------------------------------------------------
# Eligibility
# ---------------------------------------------------------------------------
class EligibilityCheckRequest(BaseModel):
    challenge_id: str
    startup_id: str


class EligibilityResult(BaseModel):
    verdict: str  # ELIGIBLE, BORDERLINE, NOT_ELIGIBLE
    explanations: List[str]
    rule_results: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Application / Evaluation
# ---------------------------------------------------------------------------
class ApplicationOut(BaseModel):
    application_id: str
    challenge_id: str
    startup_id: str
    status: str
    match_score: float
    submitted_at: datetime
    synthetic: bool = True

    class Config:
        from_attributes = True


class ClarificationRequestCreate(BaseModel):
    application_id: str
    question: str
    additional_context: Optional[str] = None
    required_information: str
    deadline: Optional[str] = None


class ClarificationResponseCreate(BaseModel):
    response: str
    supporting_document: Optional[Dict[str, Any]] = None


class ClarificationRequestOut(BaseModel):
    clarification_id: str
    application_id: str
    question: str
    additional_context: Optional[str] = None
    required_information: Optional[str] = None
    deadline: Optional[str] = None
    startup_response: Optional[str] = None
    supporting_document: Optional[Dict[str, Any]] = None
    responded_at: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class EvaluationRequest(BaseModel):
    application_id: str


class EvaluationOut(BaseModel):
    evaluation_id: str
    application_id: str
    scores: Dict[str, int]
    total_score: float
    recommendation: str
    reasoning: Optional[str] = None
    evaluated_at: datetime
    synthetic: bool = True

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Pilot / KPI
# ---------------------------------------------------------------------------
class PilotCreate(BaseModel):
    application_id: str
    location: str
    duration_months: int = 6


class PilotStatusUpdate(BaseModel):
    status: str


class PilotOut(BaseModel):
    pilot_id: str
    application_id: str
    startup_id: str
    challenge_id: str
    department_id: str
    location: str
    duration_months: int
    milestones: List[Dict[str, Any]] = []
    status: str
    start_date: datetime
    scale_recommendation: Optional[str] = None
    scale_reasoning: Optional[str] = None
    synthetic: bool = True

    class Config:
        from_attributes = True


class KPIOut(BaseModel):
    kpi_id: str
    pilot_id: str
    metric: str
    metric_description: Optional[str] = None
    baseline: float
    target: float
    actual: float
    unit: str
    achievement_percentage: float
    status: str
    synthetic: bool = True

    class Config:
        from_attributes = True


class ScaleRecommendationOut(BaseModel):
    pilot_id: str
    recommendation: str  # SCALE / ITERATE / STOP
    reasoning: str
    average_achievement: float


# ---------------------------------------------------------------------------
# RAG
# ---------------------------------------------------------------------------
class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 4


class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[str]


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------
class GraphQueryResponse(BaseModel):
    query_description: str
    results: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class DashboardSummary(BaseModel):
    active_challenges: int
    submitted_problems: int
    startup_applications: int
    pilots_active: int
    pilots_completed: int
    overall_impact_avg_achievement: float
