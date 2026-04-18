/**
 * steg.js — Calculs tarifaires STEG officiels 2024
 * Tranches cumulatives (comme l'IR), TVA 19%, TCL 1%, redevance 2.200 DT/mois
 */

const TRANCHES = [
  { min: 0,   max: 100, rate: 0.081  },
  { min: 101, max: 200, rate: 0.162  },
  { min: 201, max: 500, rate: 0.257  },
  { min: 501, max: Infinity, rate: 0.332 },
];

const TVA        = 0.19;
const TCL        = 0.01;
const REDEVANCE  = 2.200; // DT/mois

/**
 * Calcule le montant HT cumulatif selon les tranches STEG
 * @param {number} kwh - consommation totale en kWh
 * @returns {{ ht: number, detail: Array, kwh: number }}
 */
export function calculerHTCumulatif(kwh) {
  let ht = 0;
  const detail = [];

  for (const tranche of TRANCHES) {
    if (kwh <= 0) break;

    const capacite = tranche.max === Infinity
      ? kwh
      : Math.min(kwh, tranche.max - tranche.min + 1);

    const quantite = Math.min(kwh, capacite);
    const cout     = quantite * tranche.rate;

    detail.push({
      label:   `T${TRANCHES.indexOf(tranche) + 1}`,
      range:   tranche.max === Infinity ? `> ${tranche.min - 1} kWh` : `${tranche.min}–${tranche.max} kWh`,
      kwh:     quantite,
      rate:    tranche.rate,
      cout:    cout,
    });

    ht  += cout;
    kwh -= quantite;
  }

  return { ht, detail };
}

/**
 * Facture complète STEG
 * @param {number} kwh
 * @returns {object}
 */
export function calculerFacture(kwh) {
  const { ht, detail } = calculerHTCumulatif(kwh);
  const tva      = ht * TVA;
  const tcl      = ht * TCL;
  const total    = ht + tva + tcl + REDEVANCE;

  return {
    kwh,
    ht:       +ht.toFixed(3),
    tva:      +tva.toFixed(3),
    tcl:      +tcl.toFixed(3),
    redevance: REDEVANCE,
    total:    +total.toFixed(3),
    detail,
    prixMoyenKwh: kwh > 0 ? +(total / kwh).toFixed(4) : 0,
  };
}

/**
 * Calcule la consommation mensuelle d'un appareil
 * @param {number} puissanceW - en watts
 * @param {number} heuresJour
 * @returns {number} kWh/mois
 */
export function consommationMensuelle(puissanceW, heuresJour) {
  return +(puissanceW / 1000 * heuresJour * 30).toFixed(2);
}

/**
 * Coût total sur N années selon tarifs STEG
 */
export function coutSurAnnes(kwhMensuel, annees) {
  const facture = calculerFacture(kwhMensuel);
  return +(facture.total * 12 * annees).toFixed(2);
}

/**
 * Génère des recommandations basées sur la facture
 */
export function genererRecommandations(appareils, factureTotal) {
  const recos = [];
  const sorted = [...appareils].sort((a, b) => b.kwhMois - a.kwhMois);

  for (const ap of sorted.slice(0, 3)) {
    const reduction20 = +(ap.kwhMois * 0.2).toFixed(1);
    recos.push({
      type: "reduction",
      texte: `Réduire l'utilisation de "${ap.nom}" de 20% économise ~${reduction20} kWh/mois.`,
    });
  }

  if (factureTotal.kwh > 500) {
    recos.push({
      type: "alerte",
      texte: "Vous êtes en tranche T4 (>500 kWh). Chaque kWh supplémentaire coûte 0.332 DT. Priorité absolue à la réduction.",
    });
  }

  recos.push({
    type: "conseil",
    texte: "Brancher les appareils en veille sur une multiprise avec interrupteur peut économiser 5 à 10% de la facture.",
  });
  recos.push({
    type: "conseil",
    texte: "Un climatiseur réglé à 25°C au lieu de 22°C consomme 30% de moins. Préférer un modèle A+++ inverter.",
  });

  return recos;
}
