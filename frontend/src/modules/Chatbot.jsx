import { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const T = {
  fr: {
    title: "Assistant IA",
    sub: "Posez vos questions en français ou en arabe tunisien",
    placeholder: "Ex : Combien me coûte mon chauffe-eau par mois ?",
    send: "Envoyer",
    thinking: "Analyse en cours...",
    welcome: "Bonjour. Je suis VoltIQ, votre assistant specialise en energie electrique en Tunisie. Posez-moi n'importe quelle question sur votre consommation, vos factures ou les tarifs STEG.",
    suggestions: [
      "Combien coute 1 kWh en tranche T3 ?",
      "Mon chauffe-eau 2000W tourne 4h/j, quel est son cout mensuel ?",
      "Comment reduire ma facture STEG ?",
      "Quelle est la redevance fixe STEG ?",
    ],
  },
  ar: {
    title: "المساعد الذكي",
    sub: "اسأل بالعربية أو الفرنسية",
    placeholder: "مثال: قداش تكلف السخانة في الشهر؟",
    send: "إرسال",
    thinking: "جاري التحليل...",
    welcome: "أهلاً. أنا VoltIQ، مساعدك المتخصص في الطاقة الكهربائية في تونس. اسألني عن استهلاكك أو فواتيرك أو تعريفة الستاغ.",
    suggestions: [
      "قداش تكلف الكيلوواط في الشريحة T3؟",
      "السخانة 2000 واط 4 ساعات في اليوم، قداش تكلف في الشهر؟",
      "كيفاش نقلل فاتورة الستاغ؟",
      "شنوة الرسم الثابت؟",
    ],
  },
};

// Réponses fallback locales si le backend est indisponible
const FALLBACK = [
  {
    patterns: ["tranche", "t1", "t2", "t3", "t4", "شريحة"],
    response: "Les tranches STEG 2024 : T1 (0-100 kWh) = 0.081 DT/kWh | T2 (101-200 kWh) = 0.162 DT/kWh | T3 (201-500 kWh) = 0.257 DT/kWh | T4 (>500 kWh) = 0.332 DT/kWh. Ces tranches sont cumulatives. TVA 19%, TCL 1%, redevance fixe 2.200 DT/mois.",
  },
  {
    patterns: ["chauffe-eau", "سخانة", "سخان"],
    response: "Un chauffe-eau de 2000W utilisé 4h/jour consomme : 2000/1000 × 4 × 30 = 240 kWh/mois. Sur les tranches STEG, cela représente environ 42 DT/mois (hors taxes). Conseil : utiliser le minuteur et isoler le ballon.",
  },
  {
    patterns: ["climatiseur", "clim", "مكيف"],
    response: "Un climatiseur de 1500W utilisé 8h/jour consomme 360 kWh/mois. Vous entrez en tranche T4. Conseil : régler à 25°C au lieu de 22°C (-30% de consommation), préférer un modèle A+++ inverter.",
  },
  {
    patterns: ["redevance", "fixe", "رسم"],
    response: "La redevance fixe STEG est de 2.200 DT/mois, quel que soit votre niveau de consommation. Elle apparait sur chaque facture avant l'application de la TVA et du TCL.",
  },
  {
    patterns: ["réduire", "economiser", "reduire", "نقلل", "توفير"],
    response: "5 actions pour réduire votre facture STEG : 1) Débrancher les appareils en veille (5-10%). 2) Climatiseur à 25°C (+30% d'économie vs 22°C). 3) Laver le linge à 30°C. 4) Chauffe-eau sur minuterie. 5) Ampoules LED (75% moins que les classiques).",
  },
];

function getFallbackResponse(question) {
  const q = question.toLowerCase();
  for (const f of FALLBACK) {
    if (f.patterns.some((p) => q.includes(p))) return f.response;
  }
  return "Je n'ai pas pu contacter le serveur IA. En attendant, utilisez les modules Audit Appareils et Analyse Facture pour des calculs precis bases sur les vrais tarifs STEG.";
}

export default function Chatbot({ lang }) {
  const l = T[lang] || T.fr;

  const [messages, setMessages] = useState([
    { role: "bot", text: l.welcome },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mise à jour du message de bienvenue si langue change
  useEffect(() => {
    setMessages([{ role: "bot", text: T[lang]?.welcome || T.fr.welcome }]);
  }, [lang]);

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, lang }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.response }]);
    } catch {
      const fallback = getFallbackResponse(q);
      setMessages((prev) => [...prev, { role: "bot", text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div>
      <div className="module-title">{l.title}</div>
      <div className="module-subtitle">{l.sub}</div>

      {/* Suggestions rapides */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {l.suggestions.map((s, i) => (
          <button
            key={i}
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "5px 12px", textTransform: "none", letterSpacing: 0 }}
            onClick={() => sendMessage(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Fenêtre de chat */}
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="msg msg-bot loading">{l.thinking}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-row">
        <input
          placeholder={l.placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
          dir={lang === "ar" ? "rtl" : "ltr"}
        />
        <button
          className="btn btn-primary"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          {l.send}
        </button>
      </div>
    </div>
  );
}
