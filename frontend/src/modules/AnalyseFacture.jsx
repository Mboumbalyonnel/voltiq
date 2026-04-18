import { useState } from "react";
import { calculerFacture } from "../utils/steg";

const T = {
  fr: {
    title: "Analyse Facture",
    sub: "Entrez les données de votre facture STEG pour détecter les anomalies",
    kwhLabel: "Consommation (kWh)",
    montantLabel: "Montant payé (DT)",
    periodeLabel: "Période (mois/année)",
    kwhPrevLabel: "Consommation mois précédent (kWh) — optionnel",
    analyser: "Analyser la facture",
    reset: "Réinitialiser",
    normal: "Facture normale",
    anomalie: "Anomalie détectée",
    attendu: "Montant attendu",
    paye: "Montant payé",
    ecart: "Ecart",
    ecartPct: "Ecart en %",
    conseil: "Plan d'action",
    variation: "Variation vs mois précédent",
    plusEleve: "Consommation plus élevée",
    plusBas: "Consommation plus basse",
    stable: "Consommation stable",
    detail: "Détail du calcul STEG",
  },
  ar: {
    title: "تحليل الفاتورة",
    sub: "أدخل بيانات فاتورة الستاغ للكشف عن الشذوذات",
    kwhLabel: "الاستهلاك (كيلوواط)",
    montantLabel: "المبلغ المدفوع (دينار)",
    periodeLabel: "الفترة (شهر/سنة)",
    kwhPrevLabel: "استهلاك الشهر السابق (كيلوواط) — اختياري",
    analyser: "تحليل الفاتورة",
    reset: "إعادة تعيين",
    normal: "فاتورة عادية",
    anomalie: "شذوذ مكتشف",
    attendu: "المبلغ المتوقع",
    paye: "المبلغ المدفوع",
    ecart: "الفرق",
    ecartPct: "الفرق %",
    conseil: "خطة العمل",
    variation: "التغيير مقابل الشهر السابق",
    plusEleve: "استهلاك أعلى",
    plusBas: "استهلاك أقل",
    stable: "استهلاك مستقر",
    detail: "تفاصيل حساب الستاغ",
  },
};

const SEUIL_ANOMALIE_PCT = 15; // % d'écart considéré anormal

function planAction(ecartPct, kwh, kwhPrev) {
  const actions = [];
  if (ecartPct > SEUIL_ANOMALIE_PCT) {
    actions.push("Verifier si un appareil est resté allumé en permanence (chauffe-eau, climatiseur).");
    actions.push("Inspecter les joints de refrigerateur et les filtres de climatiseur.");
    actions.push("Relever vos index compteur et comparer avec ceux de la facture.");
    if (kwh > 500) actions.push("Vous etes en tranche T4 (>500 kWh). Chaque kWh economise = 0.332 DT. Priorite maximale a la reduction.");
  } else if (ecartPct < -SEUIL_ANOMALIE_PCT) {
    actions.push("Bonne performance ce mois — verifier que vous avez bien releve tous les compteurs.");
    actions.push("Maintenir les bonnes pratiques identifiees ce mois.");
  }
  if (kwhPrev && kwh > kwhPrev * 1.2) {
    actions.push("Hausse de plus de 20% par rapport au mois precedent — identifier l'appareil responsable.");
  }
  actions.push("Utiliser le module Audit Appareils pour localiser les postes les plus consommateurs.");
  return actions;
}

export default function AnalyseFacture({ lang }) {
  const l = T[lang] || T.fr;

  const [form, setForm] = useState({ kwh: "", montant: "", periode: "", kwhPrev: "" });
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.kwh || +form.kwh <= 0) e.kwh = true;
    if (!form.montant || +form.montant <= 0) e.montant = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const analyser = () => {
    if (!validate()) return;

    const kwh      = +form.kwh;
    const montant  = +form.montant;
    const kwhPrev  = form.kwhPrev ? +form.kwhPrev : null;
    const facture  = calculerFacture(kwh);
    const ecart    = +(montant - facture.total).toFixed(3);
    const ecartPct = +(((montant - facture.total) / facture.total) * 100).toFixed(1);
    const anomalie = Math.abs(ecartPct) > SEUIL_ANOMALIE_PCT;

    let variationPct = null;
    if (kwhPrev && kwhPrev > 0) {
      variationPct = +(((kwh - kwhPrev) / kwhPrev) * 100).toFixed(1);
    }

    const actions = planAction(ecartPct, kwh, kwhPrev);

    setResult({ facture, montant, ecart, ecartPct, anomalie, variationPct, actions, kwhPrev });
  };

  const variationLabel = (pct) => {
    if (pct > 5)  return l.plusEleve;
    if (pct < -5) return l.plusBas;
    return l.stable;
  };

  const variationColor = (pct) => {
    if (pct > 5)  return "var(--warn)";
    if (pct < -5) return "var(--ok)";
    return "var(--text-dim)";
  };

  return (
    <div>
      <div className="module-title">{l.title}</div>
      <div className="module-subtitle">{l.sub}</div>

      <div className="card">
        <div className="grid-2">
          <div className="field">
            <label>{l.kwhLabel}</label>
            <input
              type="number"
              placeholder="350"
              value={form.kwh}
              onChange={(e) => setForm({ ...form, kwh: e.target.value })}
              style={errors.kwh ? { borderColor: "var(--warn)" } : {}}
            />
          </div>
          <div className="field">
            <label>{l.montantLabel}</label>
            <input
              type="number"
              placeholder="98.500"
              step="0.001"
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
              style={errors.montant ? { borderColor: "var(--warn)" } : {}}
            />
          </div>
          <div className="field">
            <label>{l.periodeLabel}</label>
            <input
              placeholder="Juin 2024"
              value={form.periode}
              onChange={(e) => setForm({ ...form, periode: e.target.value })}
            />
          </div>
          <div className="field">
            <label>{l.kwhPrevLabel}</label>
            <input
              type="number"
              placeholder="290"
              value={form.kwhPrev}
              onChange={(e) => setForm({ ...form, kwhPrev: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={analyser}>{l.analyser}</button>
          <button className="btn btn-ghost" onClick={() => { setForm({ kwh: "", montant: "", periode: "", kwhPrev: "" }); setResult(null); }}>{l.reset}</button>
        </div>
      </div>

      {result && (
        <>
          <hr className="divider" />

          {result.anomalie
            ? <div className="anomaly-tag">{l.anomalie} — {result.ecartPct > 0 ? "+" : ""}{result.ecartPct}%</div>
            : <div className="ok-tag">{l.normal}</div>
          }

          <div className="result-grid">
            <div className="stat-box">
              <div className="stat-label">{l.attendu}</div>
              <div className="stat-value">{result.facture.total}</div>
              <div className="stat-unit">DT</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{l.paye}</div>
              <div className="stat-value">{result.montant}</div>
              <div className="stat-unit">DT</div>
            </div>
            <div className={`stat-box ${result.anomalie ? "warn" : "ok"}`}>
              <div className="stat-label">{l.ecart}</div>
              <div className="stat-value">{result.ecart > 0 ? "+" : ""}{result.ecart}</div>
              <div className="stat-unit">DT</div>
            </div>
            {result.variationPct !== null && (
              <div className="stat-box" style={{ borderColor: variationColor(result.variationPct) }}>
                <div className="stat-label">{l.variation}</div>
                <div className="stat-value" style={{ color: variationColor(result.variationPct) }}>
                  {result.variationPct > 0 ? "+" : ""}{result.variationPct}%
                </div>
                <div className="stat-unit">{variationLabel(result.variationPct)}</div>
              </div>
            )}
          </div>

          {/* Détail calcul */}
          <div className="card">
            <div className="card-title">{l.detail}</div>
            {result.facture.detail.map((t, i) => (
              <div key={i} className="tranche-row" style={{ fontFamily: "var(--mono)", fontSize: 12, display: "flex", gap: 12, marginBottom: 6 }}>
                <span style={{ color: "var(--text-dim)", minWidth: 130 }}>{t.label} — {t.range}</span>
                <span style={{ color: "var(--text)" }}>{t.kwh.toFixed(1)} kWh</span>
                <span style={{ color: "var(--accent)", marginLeft: "auto" }}>{t.cout.toFixed(3)} DT</span>
              </div>
            ))}
            <hr className="divider" style={{ margin: "12px 0" }} />
            {[["HT", result.facture.ht], ["TVA 19%", result.facture.tva], ["TCL 1%", result.facture.tcl], ["Redevance", result.facture.redevance]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "var(--text-dim)" }}>{k}</span>
                <span style={{ color: "var(--text)" }}>{(+v).toFixed(3)} DT</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 14, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>TOTAL</span>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>{result.facture.total} DT</span>
            </div>
          </div>

          {/* Plan d'action */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">{l.conseil}</div>
            <ul className="reco-list">
              {result.actions.map((a, i) => (
                <li key={i}>
                  <span className="reco-badge">{i + 1}</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
