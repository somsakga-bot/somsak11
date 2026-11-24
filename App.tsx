import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookCheck, CameraOff, CheckCircle2, ClipboardCheck, Copy, Eraser, FileText, History, Lightbulb, RefreshCw, Save, ScanLine, Sparkles, Trash2, Wand2 } from "lucide-react";

type Finding = {
  id: string;
  start: number;
  end: number;
  text: string;
  suggestion: string;
  reason: string;
  kind: string;
};

type SavedCheck = {
  id: string;
  value: { text: string; corrected: string; total: number; wrong: number; savedAt: string };
  created_at?: string;
};

type DictEntry = { wrong: string; correct: string; reason: string };

const DICTIONARY: DictEntry[] = [
  { wrong: "นะค่ะ", correct: "นะคะ", reason: "“นะค่ะ” ใช้ผิดเสมอ ใช้ “นะคะ” สำหรับประโยคบอกเล่า" },
  { wrong: "สังเกตุ", correct: "สังเกต", reason: "สะกดที่ถูกต้องคือ “สังเกต”" },
  { wrong: "อนุญาติ", correct: "อนุญาต", reason: "สะกดที่ถูกต้องคือ “อนุญาต”" },
  { wrong: "ปรากฎ", correct: "ปรากฏ", reason: "สะกดที่ถูกต้องคือ “ปรากฏ”" },
  { wrong: "ปรากฎการณ์", correct: "ปรากฏการณ์", reason: "สะกดที่ถูกต้องคือ “ปรากฏการณ์”" },
  { wrong: "ป่าว", correct: "เปล่า", reason: "คำสุภาพที่ถูกต้องคือ “เปล่า”" },
  { wrong: "ไห้", correct: "ให้", reason: "สะกดที่ถูกต้องคือ “ให้”" },
  { wrong: "เปน", correct: "เป็น", reason: "สะกดที่ถูกต้องคือ “เป็น”" },
  { wrong: "เปนต้น", correct: "เป็นต้น", reason: "สะกดที่ถูกต้องคือ “เป็นต้น”" },
  { wrong: "แลัว", correct: "แล้ว", reason: "สะกดที่ถูกต้องคือ “แล้ว”" },
  { wrong: "เเล้ว", correct: "แล้ว", reason: "สะกดที่ถูกต้องคือ “แล้ว”" },
  { wrong: "คอมพิวเตอ", correct: "คอมพิวเตอร์", reason: "คำทับศัพท์ที่ถูกต้องคือ “คอมพิวเตอร์”" },
  { wrong: "อินเตอเน็ต", correct: "อินเตอร์เน็ต", reason: "คำทับศัพท์ที่ถูกต้องคือ “อินเตอร์เน็ต”" },
  { wrong: "อินเทอเน็ต", correct: "อินเตอร์เน็ต", reason: "คำทับศัพท์ที่ถูกต้องคือ “อินเตอร์เน็ต”" },
  { wrong: "ขอบคุน", correct: "ขอบคุณ", reason: "สะกดที่ถูกต้องคือ “ขอบคุณ”" },
  { wrong: "ขอโทด", correct: "ขอโทษ", reason: "สะกดที่ถูกต้องคือ “ขอโทษ”" },
  { wrong: "สวัสดีคับ", correct: "สวัสดีครับ", reason: "คำสุภาพที่ถูกต้องคือ “ครับ”" },
  { wrong: "คับ", correct: "ครับ", reason: "คำสุภาพที่ถูกต้องคือ “ครับ”" },
  { wrong: "กระเพรา", correct: "กะเพรา", reason: "สะกดที่ถูกต้องคือ “กะเพรา”" },
  { wrong: "ลำคาญ", correct: "รำคาญ", reason: "สะกดที่ถูกต้องคือ “รำคาญ”" },
  { wrong: "สหลุป", correct: "สรุป", reason: "สะกดที่ถูกต้องคือ “สรุป”" },
  { wrong: "ตหลอด", correct: "ตลอด", reason: "สะกดที่ถูกต้องคือ “ตลอด”" },
  { wrong: "น่ารัค", correct: "น่ารัก", reason: "สะกดที่ถูกต้องคือ “น่ารัก”" },
  { wrong: "อะร่อย", correct: "อร่อย", reason: "สะกดที่ถูกต้องคือ “อร่อย”" },
  { wrong: "เพาะว่า", correct: "เพราะว่า", reason: "สะกดที่ถูกต้องคือ “เพราะว่า”" },
  { wrong: "ซักถาม", correct: "สักถาม", reason: "ในความหมายว่า “สัก” ใช้ “สักถาม”" },
];

const SAMPLE = "สวัสดีคับ วันนี้สังเกตุเห็นว่ามีคนอนุญาติให้ใช้คอมพิวเตอ แต่ป่าวเลย ปรากฎว่าไห้ซักถามดูก่อนนะค่ะ  คุณจะไปไหมค่ะ  แล้ว แล้ว ผมจะรอ เป็นต้น ,ขอโทษที่มาช้า";
const SAMPLE2 = "เพาะว่าคอมพิวเตออินเตอเน็ตมีปัญหา ผมเลยขอโทดนะค่ะ  สังเกตุแล้ว ปรากฎว่าต้องรอตลอด";

function overlaps(a: number, b: number, list: Finding[]) {
  return list.some((f) => a < f.end && b > f.start);
}

function detect(text: string): Finding[] {
  const findings: Finding[] = [];
  const add = (start: number, end: number, word: string, suggestion: string, reason: string, kind: string) => {
    if (start < 0 || end <= start || overlaps(start, end, findings)) return;
    findings.push({ id: `${start}-${end}-${word}`, start, end, text: word, suggestion, reason, kind });
  };

  for (const item of DICTIONARY) {
    let from = 0;
    while (from < text.length) {
      const idx = text.indexOf(item.wrong, from);
      if (idx === -1) break;
      add(idx, idx + item.wrong.length, item.wrong, item.correct, item.reason, "พจนานุกรม");
      from = idx + item.wrong.length;
    }
  }

  // ค่ะ / คะ ตามบริบทประโยค
  const particle = /ค่ะ|คะ/g;
  let m: RegExpExecArray | null;
  while ((m = particle.exec(text)) !== null) {
    const start = m.index;
    const word = m[0];
    if (overlaps(start, start + word.length, findings)) continue;
    const before = text.slice(0, start);
    const after = text.slice(start + word.length);
    const sentenceStart = Math.max(before.lastIndexOf("?"), before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("\n")) + 1;
    const endCandidates = [after.indexOf("?"), after.indexOf("."), after.indexOf("!"), after.indexOf("\n")].filter((v) => v >= 0);
    const sentenceEnd = endCandidates.length ? start + word.length + Math.min(...endCandidates) : text.length;
    const sentence = text.slice(sentenceStart, sentenceEnd);
    const isQuestion = sentence.includes("?") || /ไหม|หรือ|มั้ย|ใช่ไหม|หรือเปล่า|หรือยัง|ได้ไหม|หรือว่า/.test(sentence);
    const precededByNa = before.endsWith("นะ");
    if (word === "ค่ะ" && isQuestion) add(start, start + 2, word, "คะ", "ประโยคคำถาม ใช้ “คะ” ไม่ใช้ “ค่ะ”", "บริบทประโยค");
    if (word === "คะ" && !isQuestion && !precededByNa) add(start, start + 2, word, "ค่ะ", "ประโยคบอกเล่า ใช้ “ค่ะ” ไม่ใช้ “คะ”", "บริบทประโยค");
  }

  // คำซ้ำ
  const repeated = /(\S+)\s+\1/g;
  while ((m = repeated.exec(text)) !== null) {
    add(m.index, m.index + m[0].length, m[0], m[1], "คำซ้ำ ควรใช้เพียงครั้งเดียว", "คำซ้ำ");
  }
  // ช่องว่างหน้าวรรคตอน
  const beforePunct = /\s+([,.;!?])/g;
  while ((m = beforePunct.exec(text)) !== null) {
    add(m.index, m.index + m[0].length, m[0], m[1], "ไม่เว้นวรรคหน้าเครื่องหมายวรรคตอน", "วรรคตอน");
  }
  // ช่องว่างซ้ำ
  const doubleSpace = /[ ]{2,}/g;
  while ((m = doubleSpace.exec(text)) !== null) {
    add(m.index, m.index + m[0].length, m[0], " ", "เว้นวรรคเกิน ควรเว้นวรรคเพียงครั้งเดียว", "ช่องว่าง");
  }
  // ไม่มีช่องว่างหลังจุลภาค
  const afterComma = /,(?=[^\s])/g;
  while ((m = afterComma.exec(text)) !== null) {
    add(m.index, m.index + 1, ",", ", ", "หลังจุลภาคควรเว้นวรรคหนึ่งครั้ง", "วรรคตอน");
  }

  return findings.sort((a, b) => a.start - b.start);
}

function applyFindings(text: string, list: Finding[]) {
  let result = text;
  [...list].sort((a, b) => b.start - a.start).forEach((f) => {
    result = result.slice(0, f.start) + f.suggestion + result.slice(f.end);
  });
  return result;
}

async function callApi(action: string, args: Record<string, unknown>) {
  const res = await fetch("actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, args }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload?.error) throw new Error(payload?.error || `ไม่สามารถเชื่อมต่อได้ (${res.status})`);
  return payload.data;
}

export default function App() {
  const [text, setText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState(false);
  const [history, setHistory] = useState<SavedCheck[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveResult, setSaveResult] = useState<{ saved: number; remaining: number; error: string | null; reloadError: string | null } | null>(null);
  const correctedRef = useRef<HTMLTextAreaElement>(null);

  const findings = useMemo(() => (checked ? detect(text) : []), [text, checked]);
  const totalWords = useMemo(() => text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0, [text]);
  const wrongCount = findings.length;
  const accuracy = totalWords === 0 ? 100 : Math.max(0, Math.round(((totalWords - wrongCount) / totalWords) * 100));
  const corrected = useMemo(() => applyFindings(text, findings), [text, findings]);
  const selected = findings.find((f) => f.id === selectedId) || null;

  const reloadRecords = async () => {
    const data = await callApi("records.list", { collection: "checks", limit: 20 });
    const rows = (data?.records || []) as SavedCheck[];
    setHistory(rows);
    setHistoryError("");
  };

  const createRow = async (row: SavedCheck["value"]) => {
    await callApi("records.create", {
      collection: "checks",
      value: row,
      idempotency_key: `check-${row.savedAt}-${row.total}-${row.wrong}`,
    });
  };

  useEffect(() => {
    reloadRecords().catch((e) => setHistoryError(e instanceof Error ? e.message : String(e)));
  }, []);

  const runCheck = () => {
    if (!text.trim()) { setMessage("กรุณาใส่ข้อความก่อนตรวจ"); return; }
    setChecked(true);
    setSelectedId(null);
    setMessage(findings.length ? "" : "");
    setTimeout(() => setMessage("ตรวจเสร็จแล้ว แตะคำที่ไฮไลต์สีแดงเพื่อดูคำแนะนำ"), 30);
  };

  const fixOne = (finding: Finding | null) => {
    if (!finding) return;
    setText((old) => old.slice(0, finding.start) + finding.suggestion + old.slice(finding.end));
    setSelectedId(null);
    setMessage(`แก้ “${finding.text}” เป็น “${finding.suggestion}” แล้ว`);
  };

  const fixSameWord = (finding: Finding | null) => {
    if (!finding) return;
    const same = findings.filter((f) => f.text === finding.text);
    setText((old) => applyFindings(old, same));
    setSelectedId(null);
    setMessage(`แก้ “${finding.text}” ทั้งหมด ${same.length} จุดแล้ว`);
  };

  const fixAll = () => {
    if (!findings.length) return;
    setText(corrected);
    setSelectedId(null);
    setMessage(`แก้ทั้งหมด ${findings.length} จุดแล้ว`);
  };

  const useSample = (value: string) => {
    setText(value);
    setChecked(true);
    setSelectedId(null);
    setMessage("ใส่ข้อความตัวอย่างแล้ว แตะคำที่ไฮไลต์เพื่อดูคำแนะนำ");
  };

  const clearAll = () => {
    setText("");
    setChecked(false);
    setSelectedId(null);
    setMessage("ล้างข้อความแล้ว");
    setSaveResult(null);
  };

  const copyCorrected = () => {
    const el = correctedRef.current;
    if (!el) return;
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    setMessage(ok ? "คัดลอกข้อความที่แก้แล้วไว้แล้ว นำไปวางได้เลย" : "เลือกข้อความในกล่องผลลัพธ์แล้วคัดลอกอีกครั้ง");
  };

  const saveCheck = async () => {
    if (!text.trim()) { setMessage("กรุณาใส่ข้อความก่อนบันทึก"); return; }
    const rows = [{ text, corrected, total: totalWords, wrong: wrongCount, savedAt: new Date().toISOString() }];
    setBusy(true);
    let saved = 0;
    let error: string | null = null;
    try {
      for (const row of rows) {
        await createRow(row);
        saved += 1;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    let reloadError: string | null = null;
    try {
      await reloadRecords();
    } catch (e) {
      reloadError = e instanceof Error ? e.message : String(e);
    }
    setSaveResult({ saved, remaining: rows.length - saved, error, reloadError });
    setBusy(false);
    if (!error) setMessage("บันทึกผลตรวจนี้แล้ว");
  };

  const loadHistory = (item: SavedCheck) => {
    setText(item.value.text);
    setChecked(true);
    setSelectedId(null);
    setMessage("โหลดข้อความที่บันทึกไว้แล้ว");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteHistory = async (id: string) => {
    try {
      await callApi("records.delete", { collection: "checks", id });
      await reloadRecords();
      setMessage("ลบรายการที่บันทึกแล้ว");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const renderHighlighted = () => {
    if (!text) return <span className="text-[var(--muted)]">ข้อความของคุณจะแสดงตรงนี้หลังพิมพ์หรือเลือกตัวอย่าง</span>;
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    findings.forEach((f, i) => {
      if (f.start > cursor) parts.push(<span key={`t-${i}`}>{text.slice(cursor, f.start)}</span>);
      parts.push(
        <button key={f.id} type="button" onClick={() => setSelectedId(f.id)} className={`word-btn rounded px-0.5 font-bold underline decoration-2 underline-offset-4 ${selectedId === f.id ? "bg-[var(--danger)] text-white" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`} aria-label={`คำผิด ${f.text} แนะนำ ${f.suggestion}`}>
          {f.text}
        </button>
      );
      cursor = f.end;
    });
    if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
    return <>{parts}</>;
  };

  return (
    <div data-safe-area-inset-root className="min-h-[100dvh] overflow-x-clip bg-[var(--bg)] text-[var(--ink)]" style={{ boxSizing: "border-box", paddingTop: "var(--safe-area-inset-top)" }}>
      <header data-safe-area-sticky-top className="sticky z-20 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur" style={{ top: "var(--safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-white"><ScanLine size={26} /></div>
          <div className="min-w-0">
            <h1 className="thai-display text-[clamp(1.25rem,5vw,1.8rem)] font-extrabold leading-tight">สแกนตรวจคำผิดภาษาไทย</h1>
            <p className="text-xs text-[var(--muted)] sm:text-sm">พิมพ์หรือวางข้อความ แล้วตรวจ แก้ไข และคัดลอกได้ทันที</p>
          </div>
          <span className="ml-auto hidden rounded-full bg-[var(--success-soft)] px-3 py-1 text-xs font-bold text-[var(--success)] sm:block">ตรวจแบบออฟไลน์</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6">
        <section className="overflow-hidden rounded-[28px] bg-[var(--primary)] p-5 text-white sm:p-7">
          <p className="text-sm font-bold opacity-90">ใช้งานง่าย 4 ขั้นตอน</p>
          <h2 className="thai-display mt-2 text-[clamp(1.65rem,7vw,2.8rem)] font-extrabold leading-[1.15]">พิมพ์ข้อความ<br />แล้วให้แอปช่วยจับคำผิด</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-90 sm:text-base">ตรวจคำที่พบบ่อย ค่ะ/คะ คำซ้ำ ช่องว่าง และวรรคตอน แล้วแตะคำที่ไฮไลต์เพื่อแก้ทีละคำหรือแก้ทั้งหมด</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["1 ใส่ข้อความ", "2 ตรวจคำผิด", "3 แก้ไขคำผิด", "4 คัดลอกผลลัพธ์"].map((s) => (
              <div key={s} className="rounded-2xl bg-white/15 px-3 py-3 text-center text-sm font-bold">{s}</div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-black/15 p-3 text-xs leading-relaxed sm:text-sm">
            <CameraOff className="mt-0.5 shrink-0" size={18} />
            <span>การถ่ายภาพจากกล้องและการเลือกไฟล์รูปภาพยังไม่พร้อมใช้งานในตอนนี้ ใช้การพิมพ์หรือวางข้อความด้านล่างแทนได้เลย</span>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-extrabold"><FileText className="text-[var(--primary)]" /> ข้อความที่ต้องการตรวจ</h2>
              <span className="text-sm text-[var(--muted)]">{totalWords} คำ</span>
            </div>
            <label className="mt-3 block text-sm font-bold text-[var(--muted)]" htmlFor="source-text">พิมพ์หรือวางข้อความภาษาไทยที่นี่</label>
            <textarea id="source-text" value={text} onChange={(e) => { setText(e.target.value); setChecked(false); setSelectedId(null); }} placeholder="เช่น วันนี้ผมสังเกตุเห็น..." className="mt-2 min-h-[180px] w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-4 text-[17px] leading-8 outline-none focus:border-[var(--primary)]" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => useSample(SAMPLE)} className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-extrabold text-white"><Sparkles size={18} /> ลองข้อความตัวอย่าง</button>
              <button onClick={() => useSample(SAMPLE2)} className="rounded-full border border-[var(--primary)] px-4 py-3 text-sm font-extrabold text-[var(--primary)]">ตัวอย่างที่ 2</button>
              <button onClick={runCheck} className="flex items-center gap-2 rounded-full bg-[var(--success)] px-4 py-3 text-sm font-extrabold text-white"><BookCheck size={18} /> ตรวจคำผิด</button>
              <button onClick={clearAll} className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-4 py-3 text-sm font-extrabold"><Eraser size={18} /> ล้าง</button>
            </div>
            {message && <p role="status" className="mt-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm font-bold">{message}</p>}
          </div>

          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
            <h2 className="text-lg font-extrabold">สรุปผลการตรวจ</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-[var(--surface-2)] p-3"><div className="text-[clamp(1.4rem,6vw,2rem)] font-black leading-none">{totalWords}</div><div className="mt-1 text-xs text-[var(--muted)]">คำทั้งหมด</div></div>
              <div className="rounded-2xl bg-[var(--danger-soft)] p-3"><div className="text-[clamp(1.4rem,6vw,2rem)] font-black leading-none text-[var(--danger)]">{wrongCount}</div><div className="mt-1 text-xs text-[var(--muted)]">จุดที่ควรแก้</div></div>
              <div className="rounded-2xl bg-[var(--success-soft)] p-3"><div className="text-[clamp(1.4rem,6vw,2rem)] font-black leading-none text-[var(--success)]">{accuracy}%</div><div className="mt-1 text-xs text-[var(--muted)]">ความถูกต้อง</div></div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full bg-[var(--success)] transition-all" style={{ width: `${accuracy}%` }} /></div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">แตะคำสีแดงในข้อความด้านล่างเพื่อดูเหตุผลและคำที่แนะนำ แล้วเลือกแก้ทีละคำหรือแก้ทั้งหมด</p>
            <button onClick={fixAll} disabled={!findings.length} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--warning)] px-4 py-3 font-extrabold text-white"><Wand2 size={18} /> แก้ทั้งหมด {findings.length ? `(${findings.length} จุด)` : ""}</button>
            <button onClick={saveCheck} disabled={busy || !text.trim()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--primary)] px-4 py-3 font-extrabold text-[var(--primary)]"><Save size={18} /> {busy ? "กำลังบันทึก..." : "บันทึกผลตรวจนี้"}</button>
            {saveResult && <p role="status" className="mt-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm">บันทึกแล้ว {saveResult.saved} รายการ เหลือ {saveResult.remaining} รายการ {saveResult.error ? `ข้อผิดพลาด: ${saveResult.error}` : ""} {saveResult.reloadError ? `โหลดใหม่ไม่สำเร็จ: ${saveResult.reloadError}` : ""}</p>}
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">ข้อความพร้อมคำแนะนำ</h2>
            <span className="text-xs text-[var(--muted)]">แตะคำที่ไฮไลต์</span>
          </div>
          <div className="text-wrap-anywhere mt-3 min-h-[120px] rounded-2xl bg-[var(--bg)] p-4 text-[17px] leading-9">{renderHighlighted()}</div>
          {selected ? (
            <div className="mt-4 rounded-2xl border-2 border-[var(--danger)] bg-[var(--danger-soft)] p-4">
              <div className="flex items-start gap-2"><Lightbulb className="mt-0.5 shrink-0 text-[var(--warning)]" /><div><p className="font-extrabold">คำว่า “{selected.text}”</p><p className="mt-1 text-sm leading-relaxed">{selected.reason}</p><p className="mt-2 text-sm">แนะนำเป็น <strong className="text-[var(--success)]">“{selected.suggestion}”</strong> <span className="text-[var(--muted)]">· {selected.kind}</span></p></div></div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => fixOne(selected)} className="rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-extrabold text-white">แก้คำนี้</button>
                <button onClick={() => fixSameWord(selected)} className="rounded-full bg-white px-4 py-2.5 text-sm font-extrabold text-[var(--ink)]">แก้คำนี้ทั้งหมด</button>
                <button onClick={() => setSelectedId(null)} className="rounded-full px-3 py-2.5 text-sm font-bold text-[var(--muted)]">ปิดคำแนะนำ</button>
              </div>
            </div>
          ) : checked && findings.length > 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">เลือกคำที่ไฮไลต์สีแดงเพื่อดูคำแนะนำ</p>
          ) : checked ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-[var(--success)]"><CheckCircle2 size={18} /> ไม่พบคำผิดจากกฎที่ตั้งไว้ ลองตรวจซ้ำหลังแก้ไขประโยค</p>
          ) : null}
        </section>

        <section className="mt-4 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="p-4 sm:p-5"><h2 className="text-lg font-extrabold">รายการคำผิดพร้อมคำที่แนะนำ</h2><p className="text-sm text-[var(--muted)]">ตารางนี้อัปเดตตามข้อความด้านบน</p></div>
          {findings.length ? (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] border-t border-[var(--line)] text-left text-sm"><thead className="bg-[var(--surface-2)]"><tr><th className="px-4 py-3">คำที่พบ</th><th className="px-4 py-3">คำที่แนะนำ</th><th className="px-4 py-3">เหตุผล</th><th className="px-4 py-3">จัดการ</th></tr></thead><tbody>{findings.map((f) => (<tr key={f.id} className="border-t border-[var(--line)]"><td className="px-4 py-3 font-bold text-[var(--danger)]">{f.text}</td><td className="px-4 py-3 font-bold text-[var(--success)]">{f.suggestion}</td><td className="px-4 py-3 leading-relaxed">{f.reason}</td><td className="px-4 py-3"><button onClick={() => fixOne(f)} className="rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-extrabold text-white">แก้คำนี้</button></td></tr>))}</tbody></table></div>
          ) : <p className="border-t border-[var(--line)] px-5 py-6 text-sm text-[var(--muted)]">ยังไม่มีรายการคำผิด ใส่ข้อความแล้วกด “ตรวจคำผิด”</p>}
        </section>

        <section className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-extrabold"><ClipboardCheck className="text-[var(--primary)]" /> ข้อความที่แก้แล้ว</h2><button onClick={copyCorrected} disabled={!text} className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-extrabold text-white"><Copy size={17} /> คัดลอกข้อความที่แก้แล้ว</button></div>
          <textarea ref={correctedRef} readOnly value={corrected} aria-label="ข้อความที่แก้แล้ว" className="text-wrap-anywhere mt-3 min-h-[150px] w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-4 text-[17px] leading-8" />
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={fixAll} disabled={!findings.length} className="rounded-full bg-[var(--warning)] px-4 py-3 text-sm font-extrabold text-white">แก้ทั้งหมด</button><button onClick={clearAll} className="rounded-full bg-[var(--surface-2)] px-4 py-3 text-sm font-extrabold">ล้างข้อความ</button><button onClick={() => useSample(SAMPLE)} className="rounded-full bg-[var(--surface-2)] px-4 py-3 text-sm font-extrabold">สแกนใหม่ด้วยตัวอย่าง</button></div>
        </section>

        <section className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><History className="text-[var(--primary)]" /> ประวัติที่บันทึกไว้</h2>
          {historyError && <p className="mt-2 text-sm text-[var(--danger)]">โหลดประวัติไม่ได้: {historyError}</p>}
          {!historyError && history.length === 0 && <p className="mt-2 text-sm text-[var(--muted)]">ยังไม่มีประวัติที่บันทึกไว้ กด “บันทึกผลตรวจนี้” เพื่อเก็บข้อความไว้เปิดดูภายหลัง</p>}
          <div className="mt-3 grid gap-3">
            {history.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[var(--line)] p-4">
                <p className="text-wrap-anywhere line-clamp-2 text-sm leading-relaxed">{item.value.text}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">คำทั้งหมด {item.value.total} · ควรแก้ {item.value.wrong} จุด · บันทึกเมื่อ {new Date(item.value.savedAt).toLocaleString("th-TH")}</p>
                <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => loadHistory(item)} className="rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-extrabold text-white">โหลดข้อความนี้</button><button onClick={() => deleteHistory(item.id)} className="flex items-center gap-1 rounded-full bg-[var(--danger-soft)] px-3 py-2 text-xs font-extrabold text-[var(--danger)]"><Trash2 size={14} /> ลบ</button></div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
