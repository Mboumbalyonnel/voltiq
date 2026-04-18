import { useState } from "react";
import AuditAppareils from "./modules/AuditAppareils";
import AnalyseFacture from "./modules/AnalyseFacture";
import Chatbot from "./modules/Chatbot";
import Simulateur from "./modules/Simulateur";
import "./App.css";

const MODULES = [
  { id: "audit", label: "Audit Appareils", labelAr: "تدقيق الأجهزة" },
  { id: "facture", label: "Analyse Facture", labelAr: "تحليل الفاتورة" },
  { id: "chatbot", label: "Assistant IA", labelAr: "المساعد الذكي" },
  { id: "simulateur", label: "Simulateur Achat", labelAr: "محاكي الشراء" },
];

export default function App() {
  const [activeModule, setActiveModule] = useState("audit");
  const [lang, setLang] = useState("fr");

  const renderModule = () => {
    switch (activeModule) {
      case "audit":     return <AuditAppareils lang={lang} />;
      case "facture":   return <AnalyseFacture lang={lang} />;
      case "chatbot":   return <Chatbot lang={lang} />;
      case "simulateur":return <Simulateur lang={lang} />;
      default:          return null;
    }
  };

  return (
    <div className={`app-root ${lang === "ar" ? "rtl" : ""}`}>
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-volt">Volt</span>
            <span className="logo-iq">IQ</span>
            <span className="logo-tag">
              {lang === "fr" ? "Gestion intelligente de l'énergie" : "إدارة ذكية للطاقة"}
            </span>
          </div>
          <button
            className="lang-toggle"
            onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
          >
            {lang === "fr" ? "العربية" : "Français"}
          </button>
        </div>
      </header>

      <nav className="nav">
        {MODULES.map((m) => (
          <button
            key={m.id}
            className={`nav-btn ${activeModule === m.id ? "active" : ""}`}
            onClick={() => setActiveModule(m.id)}
          >
            {lang === "fr" ? m.label : m.labelAr}
          </button>
        ))}
      </nav>

      <main className="main">{renderModule()}</main>

      <footer className="footer">
        <span>VoltIQ — Tarifs STEG 2024 intégrés — Gratuit &amp; Open Source</span>
      </footer>
    </div>
  );
}
