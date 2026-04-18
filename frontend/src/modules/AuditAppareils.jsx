import { useState } from "react";
import {
  consommationMensuelle,
  calculerFacture,
  genererRecommandations,
} from "../utils/steg";

const T = {
  fr: {
    title:        "Audit Appareils",
    sub:          "Calculez votre consommation réelle et votre coût mensuel STEG",
    nomLabel:     "Nom de l'appareil",
    nomPh:        "Ex : Climatiseur, Chauffe-eau, Réfrigérateur",
    pwLabel:      "Puissance (Watts)",
    pwPh:         "Ex : 1500",
    hLabel:       "Heures d'utilisation / jour",
    hPh:          "Ex : 6",
    add:          "Ajouter",
    calc:         "Calculer la facture",
    reset:        "Réinitialiser",
    empty:        "Aucun appareil ajouté.",
    resuTitle:    "Résultat mensuel",
    consom:       "Consommation",
    total:        "Total facture",
    ht:           "Montant HT",
    tva:          "TVA (19%)",
    tcl:          "TCL (1%)",
    redev:        "Redevance fixe",
    detail:       "Détail par tranche",
    recos:        "Recommandations",
    kwh:          "kWh/mois",
    appareils:    "Appareils saisis",
  },
  ar: {
    title:        "تدقيق الأجهزة",
    sub:          "احسب استهلاكك الحقيقي والتكلفة الشهرية",
    nomLabel:     "اسم الجهاز",
    nomPh:        "مثال: مكيف, سخان ماء, ثلاجة",
    pwLabel:      "القدرة (واط)",
    pwPh:         "مثال: 1500",
    hLabel:       "ساعات الاستخدام / يوم",
    hPh:          "مثال: 6",
    add:          "إضافة",
    calc:         "احسب الفاتورة",
    reset:        "إعادة تعيين",
    empty:        "لا توجد أجهزة مضافة.",
    resuTitle:    "النتيجة الشهرية",
    consom:       "الاستهلاك",
    total:        "إجمالي الفاتورة",
    ht:           "المبلغ قبل الضريبة",
    tva:          "TVA (19%)",
    tcl:          "TCL (1%)",
    redev:        "رسم ثابت",
    detail:       "التفاصيل حسب الشريحة",
    recos:        "التوصيات",
    kwh:          "كيلوواط/شهر",
    appareils:    "الأجهزة المدخلة",
  },
};

const TRANCHE_COLORS = ["#e8a838", "#e87038", "#e83838", "#b81818"];

export default function AuditAppareils({ lang }) {
  const l = T[lang] || T.fr;

  const [form, setForm]       = useState({ nom: "", puissance: "", heures: "" });
  const [appareils, setApp]   = useState([]);
  const [facture, setFacture] = useState(null);
  const [recos, setRecos]     = useState([]);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.nom.trim())            e.nom      = true;
    if (!form.puissance || +form.puissance <= 0) e.puissance = true;
    if (!form.heures || +form.heures <= 0 || +form.heures > 24) e.heures = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const ajouterAppareil = () => {
    if (!validate()) return;
    const kwh = consommationMensuelle(+form.puissance, +form.heures);
    setApp([...appareils, { ...form, puissance: +form.puissance, heures: +form.heures, kwhMois: kwh }]);
    setForm({ nom: "", puissance: "", heures: "" });
    setFacture(null);
    setErrors({});
  };

  const calculer = () => {
    const totalKwh = appareils.reduce((s, a) => s + a.kwhMois, 0);
    const f = calculerFacture(totalKwh);
    setFacture(f);
    setRecos(genererRecommandations(appareils, f));
  };

  const recoColors = { reduction: "#e87038", alerte: "#e83838", conseil: "#3ecf8e" };

  return (
    <div>
      <div className="module-title">{l.title}</div>
      <div className="module-subtitle">{l.sub}</div>

      {/* Formulaire ajout appareil */}
      <div className="card">
        <div className="card-title">{l.appareils}</div>
        <div className="grid-2">
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{l.nomLabel}</label>
            <input
              placeholder={l.nomPh}
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              style={errors.nom ? { borderColor: "var(--warn)" } : {}}
            />
          </div>
          <div className="field">
            <label>{l.pwLabel}</label>
            <input
              type="number"
              placeholder={l.pwPh}
              value={form.puissance}
              onChange={(e) => setForm({ ...form, puissance: e.target.value })}
              style={errors.puissance ? { borderColor: "var(--warn)" } : {}}
            />
          </div>
          <div className="field">
            <label>{l.hLabel}</label>
            <input
              type="number"
              placeholder={l.hPh}
              value={form.heures}
              onChange={(e) => setForm({ ...form, heures: e.target.value })}
              style={errors.heures ? { borderColor: "var(--warn)" } : {}}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={ajouterAppareil}>{l.add}</button>
      </div>

      {/* Liste appareils */}
      {appareils.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <ul className="appareil-list">
            {appareils.map((ap, i) => (
              <li key={i} className="appareil-item">
                <div>
                  <div className="appareil-name">{ap.nom}</div>
                  <div className="appareil-meta">{ap.puissance} W &mdash; {ap.heures} h/j</div>
                </div>
                <div className="appareil-kwh">{ap.kwhMois} kWh/mois</div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  onClick={() => { setApp(appareils.filter((_, j) => j !== i)); setFacture(null); }}
                >
                  X
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={calculer}>{l.calc}</button>
            <button className="btn btn-ghost" onClick={() => { setApp([]); setFacture(null); setRecos([]); }}>{l.reset}</button>
          </div>
        </div>
      )}

      {appareils.length === 0 && !facture && (
        <div style={{ color: "var(--text-dim)", fontFamily: "var(--mono)", fontSize: 13, marginTop: 20 }}>
          {l.empty}
        </div>
      )}

      {/* Résultats */}
      {facture && (
        <>
          <hr className="divider" />
          <div className="card-title" style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
            {l.resuTitle}
          </div>

          <div className="result-grid">
            <div className="stat-box highlight">
              <div className="stat-label">{l.consom}</div>
              <div className="stat-value">{facture.kwh}</div>
              <div className="stat-unit">{l.kwh}</div>
            </div>
            <div className="stat-box highlight">
              <div className="stat-label">{l.total}</div>
              <div className="stat-value">{facture.total}</div>
              <div className="stat-unit">DT/mois</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{l.ht}</div>
              <div className="stat-value">{facture.ht}</div>
              <div className="stat-unit">DT</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{l.tva}</div>
              <div className="stat-value">{facture.tva}</div>
              <div className="stat-unit">DT</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{l.tcl}</div>
              <div className="stat-value">{facture.tcl}</div>
              <div className="stat-unit">DT</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{l.redev}</div>
              <div className="stat-value">{facture.redevance}</div>
              <div className="stat-unit">DT</div>
            </div>
          </div>

          {/* Détail tranches */}
          <div className="card">
            <div className="card-title">{l.detail}</div>
            <div className="tranche-bar">
              {facture.detail.map((t, i) => (
                <div key={i} className="tranche-row">
                  <span className="tranche-label">{t.label} — {t.range}</span>
                  <div className="tranche-fill-wrap">
                    <div
                      className="tranche-fill"
                      style={{
                        width: facture.kwh > 0 ? `${Math.min(100, (t.kwh / facture.kwh) * 100)}%` : "0%",
                        background: TRANCHE_COLORS[i] || "#555",
                      }}
                    />
                  </div>
                  <span className="tranche-val">{t.kwh.toFixed(1)} kWh — {t.cout.toFixed(3)} DT</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommandations */}
          {recos.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">{l.recos}</div>
              <ul className="reco-list">
                {recos.map((r, i) => (
                  <li key={i}>
                    <span className="reco-badge" style={{ borderColor: recoColors[r.type], color: recoColors[r.type] }}>
                      {r.type}
                    </span>
                    <span>{r.texte}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
