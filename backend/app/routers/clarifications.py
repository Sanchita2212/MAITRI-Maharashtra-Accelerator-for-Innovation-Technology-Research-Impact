import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.schemas.schemas import ClarificationRequestCreate, ClarificationRequestOut, ClarificationResponseCreate

router = APIRouter(prefix="/api/clarifications", tags=["Expert Clarifications"])


@router.get("", response_model=list[ClarificationRequestOut])
def list_clarification_requests(application_id: str, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(
        models.Application.application_id == application_id
    ).first()
    if not application:
        raise HTTPException(404, "Application not found")

    return (
        db.query(models.ClarificationRequest)
        .filter(models.ClarificationRequest.application_id == application_id)
        .order_by(models.ClarificationRequest.created_at.desc())
        .all()
    )


@router.post("", response_model=ClarificationRequestOut, status_code=201)
def create_clarification_request(payload: ClarificationRequestCreate, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(
        models.Application.application_id == payload.application_id
    ).first()
    if not application:
        raise HTTPException(404, "Application not found")

    question = payload.question.strip()
    if not question:
        raise HTTPException(422, "A clarification question is required")
    required_information = payload.required_information.strip()
    if not required_information:
        raise HTTPException(422, "Required information is required")

    request = models.ClarificationRequest(
        clarification_id=f"CLR{uuid.uuid4().hex[:12].upper()}",
        application_id=application.application_id,
        question=question,
        additional_context=payload.additional_context.strip() if payload.additional_context else None,
        required_information=required_information,
        deadline=payload.deadline,
        status="REQUESTED",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.patch("/{clarification_id}/response", response_model=ClarificationRequestOut)
def respond_to_clarification(
    clarification_id: str,
    payload: ClarificationResponseCreate,
    db: Session = Depends(get_db),
):
    request = db.query(models.ClarificationRequest).filter(
        models.ClarificationRequest.clarification_id == clarification_id
    ).first()
    if not request:
        raise HTTPException(404, "Clarification request not found")
    response = payload.response.strip()
    if not response:
        raise HTTPException(422, "A startup response is required")
    request.startup_response = response
    request.supporting_document = payload.supporting_document
    request.responded_at = datetime.utcnow()
    request.status = "RESPONDED"
    db.commit()
    db.refresh(request)
    return request
