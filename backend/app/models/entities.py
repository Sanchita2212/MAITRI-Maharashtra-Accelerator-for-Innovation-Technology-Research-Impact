"""
SQLAlchemy models. SQLite is the source of truth for transactional data.
JSON columns are used for list/dict fields (lists of strings, milestone objects, etc.)
so this maps cleanly to PostgreSQL's JSONB later with minimal changes.
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Department(Base):
    __tablename__ = "departments"
    department_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    sector = Column(String)
    contact_region = Column(String)
    synthetic = Column(Boolean, default=True)

    problems = relationship("Problem", back_populates="department")


class Problem(Base):
    __tablename__ = "problems"
    problem_id = Column(String, primary_key=True)
    department_id = Column(String, ForeignKey("departments.department_id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    sector = Column(String)
    priority = Column(String, default="MEDIUM")
    status = Column(String, default="SUBMITTED")  # SUBMITTED, CHALLENGE_GENERATED
    created_at = Column(DateTime, default=datetime.utcnow)
    synthetic = Column(Boolean, default=True)

    department = relationship("Department", back_populates="problems")
    challenges = relationship("Challenge", back_populates="problem")


class Challenge(Base):
    __tablename__ = "challenges"
    challenge_id = Column(String, primary_key=True)
    problem_id = Column(String, ForeignKey("problems.problem_id"))
    department_id = Column(String, ForeignKey("departments.department_id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    sector = Column(String)
    required_technologies = Column(JSON, default=list)
    budget_range_inr = Column(String)
    timeline_months = Column(Integer)
    status = Column(String, default="DRAFT")  # DRAFT, PUBLISHED
    ai_generated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    synthetic = Column(Boolean, default=True)

    problem = relationship("Problem", back_populates="challenges")
    eligibility_rules = relationship("EligibilityRule", back_populates="challenge")
    applications = relationship("Application", back_populates="challenge")


class Startup(Base):
    __tablename__ = "startups"
    startup_id = Column(String, primary_key=True)
    company_name = Column(String, nullable=False)
    description = Column(Text)
    sectors = Column(JSON, default=list)
    technologies = Column(JSON, default=list)
    capabilities = Column(JSON, default=list)
    products = Column(JSON, default=list)
    trl_level = Column(Integer)
    headquarters = Column(String)
    operating_regions = Column(JSON, default=list)
    team_size = Column(Integer)
    previous_pilots = Column(Integer, default=0)
    government_experience = Column(Boolean, default=False)
    certifications = Column(JSON, default=list)
    deployment_capacity = Column(String)
    funding_stage = Column(String)
    founded_year = Column(Integer)
    synthetic = Column(Boolean, default=True)

    applications = relationship("Application", back_populates="startup")


class Policy(Base):
    __tablename__ = "policies"
    policy_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String)
    applies_to_sectors = Column(JSON, default=list)
    synthetic = Column(Boolean, default=True)
    note = Column(Text)


class EligibilityRule(Base):
    __tablename__ = "eligibility_rules"
    rule_id = Column(String, primary_key=True)
    challenge_id = Column(String, ForeignKey("challenges.challenge_id"))
    rule_type = Column(String)  # min_trl, certification_required, government_experience, ...
    label = Column(String)
    required_value = Column(JSON)
    synthetic = Column(Boolean, default=True)

    challenge = relationship("Challenge", back_populates="eligibility_rules")


class Application(Base):
    __tablename__ = "applications"
    application_id = Column(String, primary_key=True)
    challenge_id = Column(String, ForeignKey("challenges.challenge_id"))
    startup_id = Column(String, ForeignKey("startups.startup_id"))
    status = Column(String, default="SUBMITTED")  # SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
    match_score = Column(Float, default=0.0)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    synthetic = Column(Boolean, default=True)

    challenge = relationship("Challenge", back_populates="applications")
    startup = relationship("Startup", back_populates="applications")
    evaluation = relationship("Evaluation", back_populates="application", uselist=False)
    pilot = relationship("Pilot", back_populates="application", uselist=False)


class ClarificationRequest(Base):
    __tablename__ = "clarification_requests"
    clarification_id = Column(String, primary_key=True)
    application_id = Column(String, ForeignKey("applications.application_id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    additional_context = Column(Text)
    required_information = Column(Text)
    deadline = Column(String)
    startup_response = Column(Text)
    supporting_document = Column(JSON)
    responded_at = Column(DateTime)
    status = Column(String, default="REQUESTED", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Evaluation(Base):
    __tablename__ = "evaluations"
    evaluation_id = Column(String, primary_key=True)
    application_id = Column(String, ForeignKey("applications.application_id"))
    scores = Column(JSON, default=dict)  # technical_feasibility, expected_impact, ...
    total_score = Column(Float)
    recommendation = Column(String)  # APPROVE / REVIEW / REJECT
    reasoning = Column(Text, nullable=True)
    evaluated_at = Column(DateTime, default=datetime.utcnow)
    synthetic = Column(Boolean, default=True)

    application = relationship("Application", back_populates="evaluation")


class Pilot(Base):
    __tablename__ = "pilots"
    pilot_id = Column(String, primary_key=True)
    application_id = Column(String, ForeignKey("applications.application_id"))
    startup_id = Column(String, ForeignKey("startups.startup_id"))
    challenge_id = Column(String, ForeignKey("challenges.challenge_id"))
    department_id = Column(String, ForeignKey("departments.department_id"))
    location = Column(String)
    duration_months = Column(Integer)
    milestones = Column(JSON, default=list)
    status = Column(String, default="PLANNED")  # PLANNED, ACTIVE, COMPLETED, FAILED, SCALED
    start_date = Column(DateTime, default=datetime.utcnow)
    scale_recommendation = Column(String, nullable=True)  # SCALE / ITERATE / STOP
    scale_reasoning = Column(Text, nullable=True)
    synthetic = Column(Boolean, default=True)

    application = relationship("Application", back_populates="pilot")
    kpis = relationship("KPI", back_populates="pilot")


class KPI(Base):
    __tablename__ = "kpis"
    kpi_id = Column(String, primary_key=True)
    pilot_id = Column(String, ForeignKey("pilots.pilot_id"))
    metric = Column(String)
    metric_description = Column(String)
    baseline = Column(Float)
    target = Column(Float)
    actual = Column(Float)
    unit = Column(String)
    achievement_percentage = Column(Float)
    status = Column(String)  # MET, ON_TRACK, AT_RISK
    synthetic = Column(Boolean, default=True)

    pilot = relationship("Pilot", back_populates="kpis")


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    doc_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    category = Column(String)
    content = Column(Text)
    source_policy_id = Column(String, nullable=True)
    synthetic = Column(Boolean, default=True)
