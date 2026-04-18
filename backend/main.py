# =============================================================================
# VoltIQ — Backend FastAPI
# Routes : /api/chat, /api/audit, /api/facture, /api/simulateur
# =============================================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="VoltIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Tarifs STEG officiels 2024
# =============================================================================
TRANCHES = [
    {"min": 0,   "max": 100,      "rate": 0.081},
    {"min": 101, "max": 200,      "rate": 0.162},
    {"min": 201, "max": 500,      "rate": 0.257},
    {"min": 501, "max": float("inf"), "rate": 0.332},
]
TVA       = 0.19
TCL       = 0.01
REDEVANCE = 2.200

def calculer_facture(kwh: float) -> dict:
    """Calcule la facture STEG complète avec tranches cumulatives."""
    ht = 0.0
    detail = []
    remaining = kwh

    for i, tranche in enumerate(TRANCHES):
        if remaining <= 0:
            break
        capacite = (tranche["max"] - tranche["min"] + 1) if tranche["max"] != float("inf") else remaining
        quantite  = min(remaining, capacite)
        cout      = quantite * tranche["rate"]
        detail.append({
            "label":   f"T{i+1}",
            "range":   f"{tranche['min']}–{tranche['max']} kWh" if tranche["max"] != float("inf") else f"> {tranche['min']-1} kWh",
            "kwh":     round(quantite, 2),
            "rate":    tranche["rate"],
            "cout":    round(cout, 3),
        })
        ht        += cout
        remaining -= quantite

    tva_val = ht * TVA
    tcl_val = ht * TCL
    total   = ht + tva_val + tcl_val + REDEVANCE

    return {
        "kwh":       kwh,
        "ht":        round(ht, 3),
        "tva":       round(tva_val, 3),
        "tcl":       round(tcl_val, 3),
        "redevance": REDEVANCE,
        "total":     round(total, 3),
        "detail":    detail,
        "prix_moyen_kwh": round(total / kwh, 4) if kwh > 0 else 0,
    }

# =============================================================================
# Modèles Pydantic
# =============================================================================
class Appareil(BaseModel):
    nom: str
    puissance_w: float
    heures_jour: float

class AuditRequest(BaseModel):
    appareils: List[Appareil]

class FactureRequest(BaseModel):
    kwh: float
    montant_paye: float
    periode: Optional[str] = None
    kwh_precedent: Optional[float] = None

class SimulateurRequest(BaseModel):
    nom: str
    puissance_w: float
    heures_jour: float
    prix_achat: float
    alt_nom: Optional[str] = None
    alt_puissance_w: Optional[float] = None
    alt_prix_achat: Optional[float] = None

class ChatRequest(BaseModel):
    question: str
    lang: Optional[str] = "fr"

# =============================================================================
# Route : Audit Appareils
# =============================================================================
@app.post("/api/audit")
def audit_appareils(req: AuditRequest):
    resultats = []
    total_kwh = 0.0

    for ap in req.appareils:
        kwh_mois = round(ap.puissance_w / 1000 * ap.heures_jour * 30, 2)
        resultats.append({
            "nom":       ap.nom,
            "puissance": ap.puissance_w,
            "heures":    ap.heures_jour,
            "kwh_mois":  kwh_mois,
        })
        total_kwh += kwh_mois

    facture = calculer_facture(total_kwh)

    recos = []
    sorted_ap = sorted(resultats, key=lambda x: x["kwh_mois"], reverse=True)
    for ap in sorted_ap[:3]:
        eco = round(ap["kwh_mois"] * 0.2, 1)
        recos.append({
            "type":  "reduction",
            "texte": f"Reduire l'utilisation de '{ap['nom']}' de 20% economise ~{eco} kWh/mois.",
        })

    if total_kwh > 500:
        recos.append({"type": "alerte", "texte": "Vous etes en tranche T4. Priorite absolue a la reduction."})

    recos.append({"type": "conseil", "texte": "Multiprise avec interrupteur pour les appareils en veille : economie de 5 a 10%."})

    return {"appareils": resultats, "facture": facture, "recommandations": recos}

# =============================================================================
# Route : Analyse Facture
# =============================================================================
@app.post("/api/facture")
def analyse_facture(req: FactureRequest):
    facture_attendue = calculer_facture(req.kwh)
    ecart     = round(req.montant_paye - facture_attendue["total"], 3)
    ecart_pct = round((ecart / facture_attendue["total"]) * 100, 1) if facture_attendue["total"] > 0 else 0
    anomalie  = abs(ecart_pct) > 15

    variation_pct = None
    if req.kwh_precedent and req.kwh_precedent > 0:
        variation_pct = round(((req.kwh - req.kwh_precedent) / req.kwh_precedent) * 100, 1)

    actions = []
    if ecart_pct > 15:
        actions.append("Verifier si un appareil est reste allume en permanence.")
        actions.append("Relever vos index compteur et comparer avec ceux de la facture.")
        if req.kwh > 500:
            actions.append("Vous etes en tranche T4 : 0.332 DT par kWh. Reduction prioritaire.")
    if variation_pct and variation_pct > 20:
        actions.append(f"Hausse de {variation_pct}% vs mois precedent. Identifier l'appareil responsable.")
    actions.append("Utiliser le module Audit Appareils pour localiser les postes consommateurs.")

    return {
        "facture_attendue": facture_attendue,
        "montant_paye":     req.montant_paye,
        "ecart":            ecart,
        "ecart_pct":        ecart_pct,
        "anomalie":         anomalie,
        "variation_pct":    variation_pct,
        "plan_action":      actions,
    }

# =============================================================================
# Route : Simulateur Achat
# =============================================================================
@app.post("/api/simulateur")
def simulateur(req: SimulateurRequest):
    def calculer_totaux(pw, h, prix):
        kwh_mois = round(pw / 1000 * h * 30, 2)
        facture  = calculer_facture(kwh_mois)
        energie_an = round(facture["total"] * 12, 2)
        return {
            "kwh_mois":    kwh_mois,
            "energie_an":  energie_an,
            "total_1an":   round(prix + energie_an, 2),
            "total_3ans":  round(prix + energie_an * 3, 2),
            "total_5ans":  round(prix + energie_an * 5, 2),
        }

    ref = calculer_totaux(req.puissance_w, req.heures_jour, req.prix_achat)
    ref["nom"]  = req.nom
    ref["prix"] = req.prix_achat

    alt = None
    if req.alt_puissance_w:
        alt_prix = req.alt_prix_achat if req.alt_prix_achat else req.prix_achat
        alt = calculer_totaux(req.alt_puissance_w, req.heures_jour, alt_prix)
        alt["nom"]  = req.alt_nom or "Alternative"
        alt["prix"] = alt_prix

    economie_5ans = round(ref["total_5ans"] - alt["total_5ans"], 2) if alt else None

    return {"reference": ref, "alternative": alt, "economie_5ans": economie_5ans}

# =============================================================================
# Route : Chatbot IA
# =============================================================================
HF_MODEL_ID  = os.getenv("HF_MODEL_ID", "")
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")

FALLBACK_RESPONSES = [
    {"patterns": ["tranche", "t1", "t2", "t3", "t4"],
     "response": "Tranches STEG 2024 : T1 (0-100 kWh) = 0.081 DT/kWh, T2 (101-200) = 0.162 DT/kWh, T3 (201-500) = 0.257 DT/kWh, T4 (>500) = 0.332 DT/kWh. Tranches cumulatives. TVA 19%, TCL 1%, redevance 2.200 DT/mois."},
    {"patterns": ["chauffe-eau", "sakhana", "سخانة", "سخان"],
     "response": "Chauffe-eau 2000W, 3h/jour : 180 kWh/mois. Environ 27 DT/mois. Conseil : minuteur, limiter a 1h30/jour, economie de 50%."},
    {"patterns": ["climatiseur", "clim", "مكيف"],
     "response": "Climatiseur 1500W, 8h/jour = 360 kWh/mois. Vous entrez en T4. Environ 85-95 DT/mois. Conseil : 25 degres au lieu de 22 = -30% de consommation."},
    {"patterns": ["redevance", "fixe"],
     "response": "La redevance fixe STEG est de 2.200 DT/mois, quelle que soit la consommation."},
    {"patterns": ["reduire", "economiser", "نقلل", "توفير"],
     "response": "5 actions : debrancher les veilles (5-10%), climatiseur a 25 degres (30%), laver a 30 degres (50%), minuteur chauffe-eau (40-50%), LED (75%). Total possible : 20-40%."},
]

def fallback_response(question: str) -> str:
    q = question.lower()
    for fb in FALLBACK_RESPONSES:
        if any(p in q for p in fb["patterns"]):
            return fb["response"]
    return "Je n'ai pas pu contacter le serveur IA. Utilisez les modules Audit et Analyse pour des calculs precis bases sur les vrais tarifs STEG."

@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not HF_MODEL_ID or not HF_API_TOKEN:
        return {"response": fallback_response(req.question), "source": "fallback"}

    try:
        import httpx
        prompt = f"<s>[INST] {req.question} [/INST]"
        hf_url = f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}"

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                hf_url,
                headers={"Authorization": f"Bearer {HF_API_TOKEN}"},
                json={"inputs": prompt, "parameters": {"max_new_tokens": 300, "temperature": 0.7, "return_full_text": False}},
            )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and data:
                response_text = data[0].get("generated_text", "").strip()
                return {"response": response_text, "source": "model"}
    except Exception as e:
        print(f"Erreur HF API : {e}")

    return {"response": fallback_response(req.question), "source": "fallback"}

# =============================================================================
# Route : Health check
# =============================================================================
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_configured": bool(HF_MODEL_ID),
        "version": "1.0.0",
    }

# =============================================================================
# Lancement : uvicorn main:app --reload --port 8000
# =============================================================================
