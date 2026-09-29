import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.schemas import ApplicationOut, EvaluationRequest, EvaluationOut
from app.services import llm_service

router = APIRouter(prefix="/api", tags=["Applications & Evaluation"])

EVAL_SYSTEM_PROMPT = """You are an expert evaluator for a government innovation platform (MAITRI).
Given a challenge and a startup's profile, score the application on 6 dimensions, each 0-100:
technical_feasibility, expected_impact, pilot_readiness, scalability, security, cost_efficiency.
Return ONLY a JSON object:
{
  "technical_feasibility": 0-100,
  "expected_impact": 0-100,
  "pilot_readiness": 0-100,
  "scalability": 0-100,
  "security": 0-100,
  "cost_efficiency": 0-100,
  "reasoning": "2-4 concise sentences explaining the scores and overall recommendation"
}
Be honest and specific - reference the startup's actual TRL, certifications, and experience."""


@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(challenge_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Application)
    if challenge_id:
        q = q.filter(models.Application.challenge_id == challenge_id)
    return q.order_by(models.Application.submitted_at.desc()).all()


@router.get("/applications/{application_id}", response_model=ApplicationOut)
def get_application(application_id: str, db: Session = Depends(get_db)):
    a = db.query(models.Application).filter(models.Application.application_id == application_id).first()
    if not a:
        raise HTTPException(404, "Application not found")
    return a


@router.patch("/applications/{application_id}/withdraw", response_model=ApplicationOut)
def withdraw_application(application_id: str, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(
        models.Application.application_id == application_id
    ).first()
    if not application:
        raise HTTPException(404, "Application not found")
    if application.status in {"APPROVED", "REJECTED", "CLOSED", "WITHDRAWN"}:
        raise HTTPException(409, "This application can no longer be withdrawn")
    application.status = "WITHDRAWN"
    db.commit()
    db.refresh(application)
    return application


@router.get("/evaluations", response_model=list[EvaluationOut])
def list_evaluations(db: Session = Depends(get_db)):
    return db.query(models.Evaluation).order_by(models.Evaluation.evaluated_at.desc()).all()


@router.post("/evaluations/generate", response_model=EvaluationOut)
def generate_evaluation(payload: EvaluationRequest, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(
        models.Application.application_id == payload.application_id
    ).first()
    if not application:
        raise HTTPException(404, "Application not found")

    challenge = application.challenge
    startup = application.startup

    user_prompt = (
        f"Challenge: {challenge.title}\nChallenge description: {challenge.description}\n"
        f"Required technologies: {challenge.required_technologies}\n\n"
        f"Startup: {startup.company_name}\nTRL: {startup.trl_level}\n"
        f"Certifications: {startup.certifications}\nGovernment experience: {startup.government_experience}\n"
        f"Previous pilots: {startup.previous_pilots}\nDeployment capacity: {startup.deployment_capacity}\n"
        f"Capabilities: {startup.capabilities}\nTechnologies: {startup.technologies}"
    )

    try:
        result = llm_service.chat_json(EVAL_SYSTEM_PROMPT, user_prompt)
    except Exception as e:
        raise HTTPException(502, f"Groq evaluation failed: {e}")

    dims = {
        k: int(result.get(k, 0))
        for k in ["technical_feasibility", "expected_impact", "pilot_readiness",
                  "scalability", "security", "cost_efficiency"]
    }
    total = round(sum(dims.values()) / len(dims), 1)
    recommendation = "APPROVE" if total >= 70 else ("REVIEW" if total >= 55 else "REJECT")

    evaluation = models.Evaluation(
        evaluation_id=f"EVAL{uuid.uuid4().hex[:8].upper()}",
        application_id=application.application_id,
        scores=dims,
        total_score=total,
        recommendation=recommendation,
        reasoning=result.get("reasoning", ""),
        synthetic=False,
    )
    db.add(evaluation)
    if application.status == "SUBMITTED":
        application.status = "UNDER_REVIEW"
    db.commit()
    db.refresh(evaluation)
    return evaluation
