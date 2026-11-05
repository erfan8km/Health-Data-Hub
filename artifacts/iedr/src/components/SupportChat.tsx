import { useState } from "react";
import { createPortal } from "react-dom";
import type { FormEvent } from "react";
import { MessageCircle, Send, X, ExternalLink, LoaderCircle, Flag, Trash2 } from "lucide-react";

type RegistryLink = { slug: string; name_fa: string; name_en: string; official_url?: string };
type ChatMessage = { role: "user" | "assistant"; content: string; registries?: RegistryLink[] };
type Props = { english: boolean; open: boolean; onClose: () => void };

const HISTORY_LIMIT = 6;

const API = "https://registryhub-support.erfan8km.workers.dev";

export default function SupportChat({ english, open, onClose }: Props) {
  const [mode, setMode] = useState<"chat" | "report">("chat");
  const [question, setQuestion] = useState("");
  const [report, setReport] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ticket, setTicket] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const message = question.trim();
    if (!message || busy) return;
    setBusy(true); setError(""); setTicket("");
    try {
      const history = messages.slice(-HISTORY_LIMIT).map(({ role, content }) => ({ role, content }));
      const response = await fetch(API + "/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || (english ? "The assistant is temporarily unavailable." : "دستیار موقتاً در دسترس نیست."));
      const registries = Array.isArray(data.registries) ? data.registries : [];
      const turns: ChatMessage[] = [
        { role: "user", content: message },
        { role: "assistant", content: typeof data.answer === "string" ? data.answer : "", registries }
      ];
      setMessages((current) => [...current, ...turns].slice(-20));
      setQuestion("");
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

  return createPortal(open ? <div className={`rh-support ${english ? "rh-support-en" : "rh-support-fa"}`} dir={english ? "ltr" : "rtl"}>
    {open && <section className="rh-support-panel" aria-label={english ? "RegistryHub support" : "پشتیبانی RegistryHub"}>
      <header className="rh-support-header">
        <span className="rh-support-avatar"><MessageCircle size={18} /></span>
        <span className="rh-support-heading"><strong>{english ? "RegistryHub support" : "پشتیبانی RegistryHub"}</strong><small>{english ? "Ask about published registries" : "پرسش درباره ریجستری‌های منتشرشده"}</small></span>
        {mode === "chat" && messages.length > 0 && <button type="button" className="rh-support-clear" onClick={() => setMessages([])} aria-label={english ? "Clear conversation" : "پاک کردن گفتگو"} title={english ? "Clear conversation" : "پاک کردن گفتگو"}><Trash2 size={14} /></button>}
        <button type="button" className="rh-support-close" onClick={onClose} aria-label={english ? "Close support" : "بستن پشتیبانی"}><X size={18} /></button>
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
        {messages.length > 0 && <div className="rh-support-thread" aria-live="polite" aria-relevant="additions text">
          {messages.map((item, index) => <article key={`${item.role}-${index}`} className={`rh-support-message rh-support-message-${item.role}`}>
            <p>{item.content}</p>
            {item.registries?.map(registry => <div className="rh-support-result" key={registry.slug}>
              <strong>{english ? registry.name_en : registry.name_fa}</strong>
              <small>{english ? registry.name_fa : registry.name_en}</small>
              {registry.official_url && <a href={registry.official_url} target="_blank" rel="noopener noreferrer">{english ? "Official link" : "پیوند رسمی"} <ExternalLink size={12} /></a>}
            </div>)}
          </article>)}
        </div>}
      </form> : <form className="rh-support-form" onSubmit={sendReport}>
        <p className="rh-support-hint">{english ? "Describe a catalogue or support issue. Do not include personal or confidential medical information." : "مشکل مربوط به کاتالوگ یا پشتیبانی را شرح دهید. اطلاعات شخصی یا محرمانه پزشکی وارد نکنید."}</p>
        <label htmlFor="rh-support-report">{english ? "Issue description" : "شرح مشکل"}</label>
        <textarea id="rh-support-report" value={report} maxLength={2000} onChange={e => setReport(e.target.value)} placeholder={english ? "What went wrong?" : "چه مشکلی رخ داده است؟"} />
        <button className="rh-support-submit" disabled={busy || report.trim().length < 5} type="submit">{busy ? <LoaderCircle size={16} className="rh-support-spin" /> : <Send size={16} />}{english ? "Submit report" : "ثبت گزارش"}</button>
        {ticket && <p className="rh-support-ticket" role="status">{english ? "Report received. Ticket:" : "گزارش ثبت شد. کد پیگیری:"} <strong>{ticket}</strong></p>}
      </form>}
      {error && <p className="rh-support-error" role="alert">{error}</p>}
    </section>}
  </div> : null, document.body);
}
