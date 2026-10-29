import { FormEvent, useState } from "react";
import { MessageCircle, Send, X, ExternalLink, LoaderCircle, Flag } from "lucide-react";

type RegistryLink = { slug: string; name_fa: string; name_en: string; official_url?: string };
type Props = { english: boolean };

const API = "https://registryhub-support.erfan8km.workers.dev";

export default function SupportChat({ english }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"chat" | "report">("chat");
  const [question, setQuestion] = useState("");
  const [report, setReport] = useState("");
  const [answer, setAnswer] = useState("");
  const [links, setLinks] = useState<RegistryLink[]>([]);
  const [ticket, setTicket] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const message = question.trim();
    if (!message || busy) return;
    setBusy(true); setError(""); setAnswer(""); setLinks([]); setTicket("");
    try {
      const response = await fetch(API + "/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || (english ? "The assistant is temporarily unavailable." : "دستیار موقتاً در دسترس نیست."));
      setAnswer(data.answer || "");
      setLinks(Array.isArray(data.registries) ? data.registries : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : (english ? "Request failed. Please try again." : "ارسال پرسش ناموفق بود؛ دوباره تلاش کنید."));
    } finally { setBusy(false); }
  }

  async function sendReport(event: FormEvent) {
    event.preventDefault();
    const message = report.trim();
    if (message.length < 5 || busy) return;
    setBusy(true); setError(""); setTicket("");
    try {
      const response = await fetch(API + "/api/report", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || (english ? "Report submission is unavailable." : "ثبت گزارش فعلاً ممکن نیست."));
      setTicket(data.ticket_number || "");
      setReport("");
    } catch (e) {
      setError(e instanceof Error ? e.message : (english ? "Report submission failed." : "ثبت گزارش ناموفق بود."));
    } finally { setBusy(false); }
  }

  return <div className={`rh-support ${english ? "rh-support-en" : "rh-support-fa"}`} dir={english ? "ltr" : "rtl"}>
    {open && <section className="rh-support-panel" aria-label={english ? "RegistryHub support" : "پشتیبانی RegistryHub"}>
      <header className="rh-support-header">
        <span className="rh-support-avatar"><MessageCircle size={18} /></span>
        <span className="rh-support-heading"><strong>{english ? "RegistryHub support" : "پشتیبانی RegistryHub"}</strong><small>{english ? "Ask about published registries" : "پرسش درباره ریجستری‌های منتشرشده"}</small></span>
        <button type="button" className="rh-support-close" onClick={() => setOpen(false)} aria-label={english ? "Close support" : "بستن پشتیبانی"}><X size={18} /></button>
      </header>
      <nav className="rh-support-tabs">
        <button type="button" className={mode === "chat" ? "active" : ""} onClick={() => {setMode("chat");setError("");}}>{english ? "Ask a question" : "پرسش از کاتالوگ"}</button>
        <button type="button" className={mode === "report" ? "active" : ""} onClick={() => {setMode("report");setError("");}}><Flag size={13} />{english ? "Report an issue" : "گزارش مشکل"}</button>
      </nav>
      {mode === "chat" ? <form className="rh-support-form" onSubmit={ask}>
        <p className="rh-support-hint">{english ? "I can help find records in the published catalogue. Please don't enter personal or confidential medical information." : "برای یافتن ریجستری‌ها در کاتالوگ کمک می‌کنم. اطلاعات شخصی یا محرمانه پزشکی وارد نکنید."}</p>
        <label htmlFor="rh-support-question">{english ? "Your question" : "پرسش شما"}</label>
        <textarea id="rh-support-question" value={question} maxLength={1200} onChange={e => setQuestion(e.target.value)} placeholder={english ? "e.g. Which cancer registries are listed?" : "مثلاً چه ریجستری‌هایی در حوزه سرطان وجود دارد؟"} />
        <button className="rh-support-submit" disabled={busy || !question.trim()} type="submit">{busy ? <LoaderCircle size={16} className="rh-support-spin" /> : <Send size={16} />}{english ? "Send question" : "ارسال پرسش"}</button>
        {answer && <div className="rh-support-answer" aria-live="polite"><p>{answer}</p>{links.map(item => <div className="rh-support-result" key={item.slug}><strong>{english ? item.name_en : item.name_fa}</strong><small>{english ? item.name_fa : item.name_en}</small>{item.official_url && <a href={item.official_url} target="_blank" rel="noopener noreferrer">{english ? "Official link" : "پیوند رسمی"} <ExternalLink size={12} /></a>}</div>)}</div>}
      </form> : <form className="rh-support-form" onSubmit={sendReport}>
        <p className="rh-support-hint">{english ? "Describe a catalogue or support issue. Do not include personal or confidential medical information." : "مشکل مربوط به کاتالوگ یا پشتیبانی را شرح دهید. اطلاعات شخصی یا محرمانه پزشکی وارد نکنید."}</p>
        <label htmlFor="rh-support-report">{english ? "Issue description" : "شرح مشکل"}</label>
        <textarea id="rh-support-report" value={report} maxLength={2000} onChange={e => setReport(e.target.value)} placeholder={english ? "What went wrong?" : "چه مشکلی رخ داده است؟"} />
        <button className="rh-support-submit" disabled={busy || report.trim().length < 5} type="submit">{busy ? <LoaderCircle size={16} className="rh-support-spin" /> : <Send size={16} />}{english ? "Submit report" : "ثبت گزارش"}</button>
        {ticket && <p className="rh-support-ticket" role="status">{english ? "Report received. Ticket:" : "گزارش ثبت شد. کد پیگیری:"} <strong>{ticket}</strong></p>}
      </form>}
      {error && <p className="rh-support-error" role="alert">{error}</p>}
    </section>}
    <button type="button" className="rh-support-launcher" onClick={() => setOpen(v => !v)} aria-label={open ? (english ? "Close support" : "بستن پشتیبانی") : (english ? "Open RegistryHub support" : "بازکردن پشتیبانی RegistryHub")}>
      {open ? <X size={22} /> : <><MessageCircle size={21} /><span>{english ? "Support" : "پشتیبانی"}</span></>}
    </button>
  </div>;
}
