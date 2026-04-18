import { useState } from "react";
import { consommationMensuelle, calculerFacture } from "../utils/steg";

const T = {
  fr: {
    title: "Simulateur Achat",
    sub: "Calculez le coût réel d'un appareil sur 1, 3 et 5 ans selon les tarifs STEG",
    nomLabel: "Nom de l'appareil",
    nomPh: "Ex : Climatiseur Samsung 12000 BTU",
    pwLabel: "Puissance (Watts)",
    hLabel: "Heures d'utilisation / jour",
    prixLabel: "Prix d'achat (DT)",
    prixPh: "Ex : 1200",
    altNomLabel: "Alternative (nom)",
    altNomPh: "Ex : Modele A+++ inverter",
    altPwLabel: "Puissance alternative (Watts)",
    altPrixLabel: "Prix alternative (DT)",
    simuler: "Simuler",
    reset: "Réinitialiser",
    ref: "Modele de reference",
    alt: "Modele alternatif",
    energie: "Cout energie / an",
    achat: "Prix achat",
    total1: "Total 1 an",
    total3: "Total 3 ans",
    total5: "Total 5 ans",
    kwhmois: "kWh/mois",
    savings: "Economie sur 5 ans avec le modele alternatif",
  },
  ar: {
    title: "محاكي الشراء",
    sub: "احسب التكلفة الحقيقية لجهاز على 1 أو 3 أو 5 سنوات",
    nomLabel: "اسم الجهاز",
    nomPh: "مثال: مكيف سامسونج 12000 BTU",
    pwLabel: "القدرة (واط)",
    hLabel: "ساعات الاستخدام / يوم",
    prixLabel: "سعر الشراء (دينار)",
    prixPh: "مثال: 1200",
    altNomLabel: "البديل (الاسم)",
    altNomPh: "مثال: موديل A+++ إنفرتر",
    altPwLabel: "قدرة البديل (واط)",
    altPrixLabel: "سعر البديل (دينار)",
    simuler: "محاكاة",
    reset: "إعادة تعيين",
    ref: "الموديل المرجعي",
    alt: "الموديل البديل",
    energie: "تكلفة الطاقة / سنة",
    achat: "سعر الشراء",
    total1: "الإجمالي سنة 1",
    total3: "الإجمالي 3 سنوات",
    total5: "الإجمالي 5 سنوات",
    kwhmois: "كيلوواط/شهر",
    savings: "الوفر على 5 سنوات مع الموديل البديل",
  },
};

function calculerTotaux(pw, h, prix) {
  const kwh    = consommationMensuelle(pw, h);
  const fact   = calculerFacture(kwh);
  const an     = +(fact.total * 12).toFixed(2);
  return {
    kwh,
    energieAn: an,
    total1: +(prix + an).toFixed(2),
    total3: +(prix + an * 3).toFixed(2),
    total5: +(prix + an * 5).toFixed(2),
  };
}

export default function Simulateur({ lang }) {
  const l = T[lang] || T.fr;

  const [form, setForm] = useState({
    nom: "", pw: "", h: "", prix: "",
    altNom: "", altPw: "", altPrix: "",
  });
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.nom.trim()) e.nom = true;
    if (!form.pw || +form.pw <= 0) e.pw = true;
    if (!form.h || +form.h <= 0 || +form.h > 24) e.h = true;
    if (!form.prix || +form.prix < 0) e.prix = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const simuler = () => {
    if (!validate()) return;

    const ref = calculerTotaux(+form.pw, +form.h, +form.prix);
    let alt = null;

    if (form.altPw && +form.altPw > 0) {
      const altPrix = form.altPrix ? +form.altPrix : +form.prix;
      alt = calculerTotaux(+form.altPw, +form.h, altPrix);
      alt.nom = form.altNom || "Alternative";
    }

    setResult({ ref: { ...ref, nom: form.nom, prix: +form.prix }, alt });
  };

  const row = (label, val, unit = "DT") => (
    <div className="compare-row" key={label}>
      <span>{label}</span>
      <span>{val} {unit}</span>
    </div>
  );

  return (
    <div>
      <div className="module-title">{l.title}</div>
      <div className="module-subtitle">{l.sub}</div>

      <div className="card">
        <div className="card-title">{l.ref}</div>
        <div className="grid-2">
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{l.nomLabel}</label>
            <input placeholder={l.nomPh} value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              style={errors.nom ? { borderColor: "var(--warn)" } : {}} />
          </div>
          <div className="field">
            <label>{l.pwLabel}</label>
            <input type="number" placeholder="1500" value={form.pw}
              onChange={(e) => setForm({ ...form, pw: e.target.value })}
              style={errors.pw ? { borderColor: "var(--warn)" } : {}} />
          </div>
          <div className="field">
            <label>{l.hLabel}</label>
            <input type="number" placeholder="8" value={form.h}
              onChange={(e) => setForm({ ...form, h: e.target.value })}
              style={errors.h ? { borderColor: "var(--warn)" } : {}} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{l.prixLabel}</label>
            <input type="number" placeholder={l.prixPh} value={form.prix}
              onChange={(e) => setForm({ ...form, prix: e.target.value })}
              style={errors.prix ? { borderColor: "var(--warn)" } : {}} />
          </div>
        </div>

        <hr className="divider" />
        <div className="card-title" style={{ color: "var(--ok)" }}>{l.alt} — optionnel</div>
        <div className="grid-2">
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>{l.altNomLabel}</label>
            <input placeholder={l.altNomPh} value={form.altNom}
              onChange={(e) => setForm({ ...form, altNom: e.target.value })} />
          </div>
          <div className="field">
            <label>{l.altPwLabel}</label>
            <input type="number" placeholder="900" value={form.altPw}
              onChange={(e) => setForm({ ...form, altPw: e.target.value })} />
          </div>
          <div className="field">
            <label>{l.altPrixLabel}</label>
            <input type="number" placeholder="1800" value={form.altPrix}
              onChange={(e) => setForm({ ...form, altPrix: e.target.value })} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={simuler}>{l.simuler}</button>
          <button className="btn btn-ghost" onClick={() => { setForm({ nom: "", pw: "", h: "", prix: "", altNom: "", altPw: "", altPrix: "" }); setResult(null); }}>{l.reset}</button>
        </div>
      </div>

      {result && (
        <>
          <hr className="divider" />
          <div className={result.alt ? "compare-grid" : ""}>
            {/* Référence */}
            <div className="compare-card reference">
              <div className="compare-card-label">{l.ref}</div>
              <div className="compare-card-name">{result.ref.nom}</div>
              {row(l.kwhmois, result.ref.kwh, "kWh")}
              {row(l.achat, result.ref.prix)}
              {row(l.energie, result.ref.energieAn)}
              {row(l.total1, result.ref.total1)}
              {row(l.total3, result.ref.total3)}
              {row(l.total5, result.ref.total5)}
            </div>

            {/* Alternative */}
            {result.alt && (
              <div className="compare-card alternative">
                <div className="compare-card-label">{l.alt}</div>
                <div className="compare-card-name">{result.alt.nom}</div>
                {row(l.kwhmois, result.alt.kwh, "kWh")}
                {row(l.achat, result.alt.prix)}
                {row(l.energie, result.alt.energieAn)}
                {row(l.total1, result.alt.total1)}
                {row(l.total3, result.alt.total3)}
                {row(l.total5, result.alt.total5)}
              </div>
            )}
          </div>

          {result.alt && (
            <div className="savings-banner">
              {l.savings} : {+(result.ref.total5 - result.alt.total5).toFixed(2)} DT
            </div>
          )}
        </>
      )}
    </div>
  );
}
