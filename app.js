const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const today = () => {
  const d = /* @__PURE__ */ new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return (/* @__PURE__ */ new Date(d + "T12:00:00")).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
};
const num = (v) => Number(v) || 0;
const defaultState = { tasks: [], study: [], exams: [], habits: [], habitLogs: {}, goals: [], cards: [], sessions: [], notes: [], events: [], syllabus: [], weekPlan: [], testLogs: [], settings: { theme: "gold", focus: 25, shortBreak: 5, longBreak: 15, weekStart: 6, weeklyTarget: 25 }, plannerPrefs: { dailyMinutes: 180, priority: "balanced" }, calendarOffset: 0 };
let S = load(), page = "dashboard", chartRefs = {}, timer = null, remaining = 1500, timerMode = "focus", cardFlip = false, currentCard = null;
function load() {
  try {
    let old = JSON.parse(localStorage.getItem("mpb_ultimate") || "{}");
    return { ...structuredClone(defaultState), ...old, settings: { ...defaultState.settings, ...old.settings || {} } };
  } catch {
    return structuredClone(defaultState);
  }
}
function save() {
  try {
    localStorage.setItem("mpb_ultimate", JSON.stringify(S));
    localStorage.setItem("mpb_ultimate_updated", String(Date.now()));
  } catch (e) {
    console.warn("Local backup storage unavailable", e);
  }
  ;
  persistIDB();
  updateBadges();
}
function updateBadges() {
  $("#taskBadge").textContent = S.tasks.filter((x) => !x.done).length;
}
function toast(t) {
  let e = $("#toast");
  e.textContent = t;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 2300);
}
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function sum(a, k) {
  return a.reduce((n, x) => n + num(x[k]), 0);
}
function todayStudy() {
  return S.study.filter((x) => x.date === today());
}
function minutesToday() {
  return sum(todayStudy(), "minutes");
}
function avgExam(x) {
  let a = [x.math, x.physics, x.chemistry].filter((v) => v !== "" && v != null).map(Number);
  return a.length ? a.reduce((p, c) => p + c, 0) / a.length : 0;
}
function setPage(p) {
  page = p;
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === p));
  $("#sidebar").classList.remove("open");
  render();
}
const titles = { dashboard: "داشبورد", tasks: "مدیریت وظایف", calendar: "تقویم و برنامه‌ریزی", study: "مطالعه و کنکور", exams: "آزمون‌ها و درصدها", habits: "عادت‌سازی", goals: "اهداف و پروژه‌ها", flashcards: "فلش‌کارت و مرور هوشمند", focus: "اتاق تمرکز", notes: "یادداشت‌ها", analytics: "تحلیل عملکرد", settings: "تنظیمات و پشتیبان", smartplan: "برنامه‌ریز هوشمند", search: "جست‌وجوی سراسری", achievements: "دستاوردها و سطح", reports: "گزارش‌ها و خروجی", workspace: "میزکار شخصی", reminders: "یادآورها و اعلان‌ها" };
function render() {
  Object.values(chartRefs).forEach((c) => {
    try {
      c.destroy();
    } catch {
    }
  });
  chartRefs = {};
  $("#pageTitle").textContent = titles[page];
  $("#pageEyebrow").textContent = "MPB / " + page.toUpperCase();
  $("#pageContent").innerHTML = pages[page]();
  bindPage();
  updateBadges();
  if (page === "dashboard" || page === "analytics") drawCharts();
}
function stat(label, value, sub, icon, glow) {
  return `<div class="stat-card" style="--glow:${glow || "#8b7cff"}"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${sub}</div></div>`;
}
function panel(title, body, action = "") {
  return `<section class="panel"><div class="panel-head"><h3>${title}</h3>${action}</div>${body}</section>`;
}
function empty(t = "هنوز موردی ثبت نشده است") {
  return `<div class="empty">${t}</div>`;
}
function taskRows(list) {
  if (!list.length) return empty("وظیفه‌ای پیدا نشد");
  return `<div class="item-list">${list.map((t) => `<div class="list-item ${t.done ? "done" : ""}"><input class="check" type="checkbox" data-task-check="${t.id}" ${t.done ? "checked" : ""}><div class="item-main"><div class="item-title">${esc(t.title)}</div><div class="item-sub">${esc(t.category || "عمومی")} · ${fmtDate(t.date)} ${t.priority ? `· اولویت ${t.priority}` : ""}</div></div><span class="pill ${t.priority === "زیاد" ? "red" : t.priority === "متوسط" ? "yellow" : "green"}">${t.done ? "انجام‌شده" : t.priority || "عادی"}</span><div class="item-actions"><button class="mini-btn" data-edit-task="${t.id}">ویرایش</button><button class="mini-btn" data-del-task="${t.id}">×</button></div></div>`).join("")}</div>`;
}
const pages = {
  dashboard: () => {
    let active = S.tasks.filter((t) => !t.done), over = S.tasks.filter((t) => !t.done && t.date && t.date < today()).length, avg = S.exams.length ? avgExam(S.exams[S.exams.length - 1]).toFixed(1) : "—", hab = S.habits.length ? Math.round(S.habits.filter((h) => S.habitLogs[h.id]?.[today()]).length / S.habits.length * 100) : 0;
    return `<div class="grid stats-grid">${stat("مطالعه امروز", `${(minutesToday() / 60).toFixed(1)}h`, `${todayStudy().length} جلسه ثبت‌شده`, "◷", "#48d6b5")}${stat("وظایف باز", active.length, `${over} مورد عقب‌افتاده`, "☑", "#ff7185")}${stat("میانگین آخرین آزمون", avg === "—" ? "—" : avg + "٪", `${S.exams.length} آزمون ثبت‌شده`, "▤", "#6eb8ff")}${stat("پایبندی عادت امروز", hab + "٪", `${S.habits.length} عادت فعال`, "✳", "#ffc66e")}</div><div class="grid two-col">${panel("روند مطالعه · ۷ روز اخیر", `<div class="chart-wrap"><canvas id="studyChart"></canvas></div>`)}${panel("کارهای مهم", taskRows(active.sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(0, 5)), '<button class="btn small" data-go="tasks">همه وظایف</button>')}</div><div class="grid two-col section-gap">${panel("پیشرفت اهداف", S.goals.length ? S.goals.slice(0, 4).map((g) => `<div class="progress-row"><span>${esc(g.title)}</span><b>${Math.min(100, Math.round(num(g.current) / Math.max(1, num(g.target)) * 100))}%</b></div><div class="progress"><span style="width:${Math.min(100, num(g.current) / Math.max(1, num(g.target)) * 100)}%"></span></div>`).join("") : empty("هنوز هدفی تعریف نکردی"))}${panel("مرورهای سررسیدشده", `${S.cards.filter((c) => !c.next || c.next <= today()).length} فلش‌کارت برای مرور آماده است`, '<button class="btn small" data-go="flashcards">شروع مرور</button>')}</div>`;
  },
  tasks: () => `<div class="toolbar"><input class="search-input" id="taskSearch" placeholder="جست‌وجوی وظایف..."><select class="search-input" id="taskFilter"><option value="all">همه وظایف</option><option value="today">امروز</option><option value="overdue">عقب‌افتاده</option><option value="week">۷ روز آینده</option><option value="done">انجام‌شده</option></select><button class="btn" id="addTask">＋ وظیفه جدید</button></div>${panel("فهرست وظایف", `<div id="taskList">${taskRows(S.tasks)}</div>`)}`,
  calendar: () => {
    let d = /* @__PURE__ */ new Date(), first = new Date(d.getFullYear(), d.getMonth() + S.calendarOffset, 1), year = first.getFullYear(), month = first.getMonth(), start = (first.getDay() + 1) % 7, days = new Date(year, month + 1, 0).getDate(), cells = "";
    let labels = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
    for (let x of labels) cells += `<div class="muted" style="text-align:center;padding:7px">${x}</div>`;
    for (let i = 0; i < 42; i++) {
      let day = i - start + 1, valid = day > 0 && day <= days, date = valid ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "", ev = S.events.filter((e) => e.date === date), tasks = S.tasks.filter((t) => t.date === date && !t.done);
      cells += `<div class="calendar-cell ${!valid ? "muted-day" : ""} ${date === today() ? "today" : ""}" ${valid ? `data-cal-date="${date}"` : ""}><div class="daynum">${valid ? (/* @__PURE__ */ new Date(date + "T12:00:00")).toLocaleDateString("fa-IR", { day: "numeric" }) : ""}</div>${ev.slice(0, 1).map((e) => `<div class="calendar-event">${esc(e.title)}</div>`).join("")}${tasks.slice(0, 1).map((t) => `<div class="calendar-event">${esc(t.title)}</div>`).join("")}</div>`;
    }
    return `${panel("تقویم ماهانه", `<div class="panel-head"><button class="btn secondary small" id="prevMonth">‹ ماه قبل</button><b>${first.toLocaleDateString("fa-IR", { month: "long", year: "numeric" })}</b><button class="btn secondary small" id="nextMonth">ماه بعد ›</button></div><div class="calendar-grid">${cells}</div><div class="muted" style="margin-top:10px">برای افزودن رویداد، روی یک روز بزن.</div>`)}<div class="section-gap">${panel("رویدادهای آینده", S.events.filter((e) => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8).map((e) => `<div class="list-item"><div class="item-main"><div class="item-title">${esc(e.title)}</div><div class="item-sub">${fmtDate(e.date)} · ${esc(e.kind || "رویداد")}</div></div><button class="mini-btn" data-del-event="${e.id}">×</button></div>`).join("") || empty())}</div>`;
  },
  study: () => `<div class="toolbar"><button class="btn" id="addStudy">＋ ثبت جلسه مطالعه</button><button class="btn secondary" data-go="focus">رفتن به تایمر تمرکز</button></div><div class="grid stats-grid">${stat("مجموع امروز", `${(minutesToday() / 60).toFixed(1)} ساعت`, "زمان مفید ثبت‌شده", "◷")}${stat("تعداد تست امروز", sum(todayStudy(), "tests"), "تست حل‌شده", "⌁")}${stat("مجموع کل مطالعه", `${(sum(S.study, "minutes") / 60).toFixed(1)} ساعت`, "از ابتدا", "◫")}${stat("جلسات ثبت‌شده", S.study.length, "تمام جلسات", "▤")}</div><div class="grid two-col">${panel("توزیع زمان مطالعه", `<div class="chart-wrap"><canvas id="subjectChart"></canvas></div>`)}${panel("ثبت‌های اخیر", S.study.slice().reverse().slice(0, 8).map((x) => `<div class="list-item"><div class="item-main"><div class="item-title">${esc(x.subject)} · ${esc(x.topic)}</div><div class="item-sub">${fmtDate(x.date)} · ${esc(x.kind || "مطالعه")}</div></div><b>${x.minutes} دقیقه</b><button class="mini-btn" data-del-study="${x.id}">×</button></div>`).join("") || empty())}</div>`,
  exams: () => `<div class="toolbar"><button class="btn" id="addExam">＋ ثبت آزمون</button></div>${panel("روند میانگین آزمون‌ها", `<div class="chart-wrap"><canvas id="examChart"></canvas></div>`)}<div class="section-gap">${panel("تاریخچه آزمون‌ها", `<div class="table-wrap"><table><thead><tr><th>آزمون</th><th>تاریخ</th><th>ریاضی</th><th>فیزیک</th><th>شیمی</th><th>میانگین</th><th></th></tr></thead><tbody>${S.exams.slice().reverse().map((x) => `<tr><td>${esc(x.title)}</td><td>${fmtDate(x.date)}</td><td>${x.math}%</td><td>${x.physics}%</td><td>${x.chemistry}%</td><td><b>${avgExam(x).toFixed(1)}%</b></td><td><button class="mini-btn" data-del-exam="${x.id}">حذف</button></td></tr>`).join("")}</tbody></table></div>${S.exams.length ? "" : empty()}`)}</div>`,
  habits: () => `<div class="toolbar"><button class="btn" id="addHabit">＋ عادت جدید</button></div><div class="grid three-col">${S.habits.map((h) => {
    let done = !!S.habitLogs[h.id]?.[today()], streak = 0;
    for (let i = 0; i < 365; i++) {
      let d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - i);
      let k = d.toISOString().slice(0, 10);
      if (S.habitLogs[h.id]?.[k]) streak++;
      else if (i > 0) break;
    }
    return `<div class="panel"><div class="panel-head"><h3>${esc(h.title)}</h3><button class="mini-btn" data-del-habit="${h.id}">×</button></div><div class="kpi">${streak} 🔥</div><div class="muted">روز متوالی</div><div class="divider"></div><button class="btn ${done ? "green" : "secondary"}" data-habit-check="${h.id}">${done ? "✓ امروز انجام شد" : "ثبت انجام امروز"}</button><div class="divider"></div><div class="habit-grid">${Array.from({ length: 28 }, (_, i) => {
      let d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - 27 + i);
      let k = d.toISOString().slice(0, 10);
      return `<div class="habit-day ${S.habitLogs[h.id]?.[k] ? "on" : ""}" title="${fmtDate(k)}">${d.getDate()}</div>`;
    }).join("")}</div></div>`;
  }).join("") || empty("اولین عادتت را اضافه کن")}</div>`,
  goals: () => `<div class="toolbar"><button class="btn" id="addGoal">＋ هدف جدید</button></div><div class="grid two-col">${S.goals.map((g) => {
    let p = Math.min(100, Math.round(num(g.current) / Math.max(1, num(g.target)) * 100));
    return `<div class="panel"><div class="panel-head"><h3>${esc(g.title)}</h3><button class="mini-btn" data-del-goal="${g.id}">×</button></div><div class="kpi">${p}%</div><div class="progress"><span style="width:${p}%"></span></div><div class="progress-row"><span>${g.current} از ${g.target} ${esc(g.unit || "واحد")}</span><span>موعد: ${fmtDate(g.date)}</span></div><div class="btn-row"><button class="btn small" data-goal-add="${g.id}">＋ افزایش پیشرفت</button><button class="btn small secondary" data-goal-edit="${g.id}">ویرایش</button></div></div>`;
  }).join("") || empty("هدف‌هایت را اینجا مدیریت کن")}</div>`,
  flashcards: () => {
    let due = S.cards.filter((c) => !c.next || c.next <= today());
    return `<div class="toolbar"><button class="btn" id="addCard">＋ فلش‌کارت جدید</button><span class="pill">${due.length} مرور سررسیدشده</span></div>${currentCard && S.cards.some((c) => c.id === currentCard) ? `<div class="panel"><div class="muted">فلش‌کارت · برای دیدن پاسخ روی کارت بزن</div><div class="flashcard" id="flipCard"><div><span class="pill">${esc(S.cards.find((c) => c.id === currentCard).subject || "عمومی")}</span><h2>${esc(cardFlip ? S.cards.find((c) => c.id === currentCard).answer : S.cards.find((c) => c.id === currentCard).question)}</h2><p>${cardFlip ? "پاسخ" : "سؤال"}</p></div></div><div class="btn-row" style="justify-content:center;margin-top:12px"><button class="btn danger" id="hardCard">سخت بود</button><button class="btn green" id="easyCard">بلد بودم</button><button class="btn secondary" id="nextCard">بعدی</button></div></div>` : panel("مرور هوشمند", due.length ? `<div class="kpi">${due.length}</div><p class="muted">فلش‌کارت آماده مرور داری.</p><button class="btn" id="startReview">شروع مرور</button>` : empty("مروری برای امروز باقی نمانده؛ عالی!"))}<div class="section-gap">${panel("بانک فلش‌کارت‌ها", S.cards.map((c) => `<div class="list-item"><div class="item-main"><div class="item-title">${esc(c.question)}</div><div class="item-sub">${esc(c.subject || "عمومی")} · مرور بعدی: ${fmtDate(c.next)}</div></div><button class="mini-btn" data-del-card="${c.id}">×</button></div>`).join("") || empty())}</div>`;
  },
  focus: () => `<div class="grid two-col"><section class="panel" style="text-align:center"><div class="panel-head"><h3>تایمر پومودورو</h3><span class="pill" id="timerModeLabel">تمرکز</span></div><div class="timer-ring"><div class="timer" id="timerDisplay">25:00</div></div><div class="btn-row" style="justify-content:center"><button class="btn" id="timerStart">شروع</button><button class="btn secondary" id="timerPause">توقف</button><button class="btn secondary" id="timerReset">بازنشانی</button></div><div class="btn-row" style="justify-content:center;margin-top:12px"><button class="mini-btn" data-timer-mode="focus">تمرکز</button><button class="mini-btn" data-timer-mode="short">استراحت کوتاه</button><button class="mini-btn" data-timer-mode="long">استراحت بلند</button></div><p class="muted">پس از پایان بازه تمرکز، زمان به‌صورت خودکار در گزارش مطالعه ثبت می‌شود.</p></section>${panel("آمار تمرکز امروز", `<div class="kpi">${S.sessions.filter((x) => x.date === today()).length}</div><div class="muted">جلسه تکمیل‌شده</div><div class="divider"></div><div class="kpi">${S.sessions.filter((x) => x.date === today()).reduce((a, x) => a + x.minutes, 0)} دقیقه</div><div class="muted">زمان تمرکز امروز</div><div class="divider"></div><h3>تنظیمات تایمر</h3><div class="field"><label>مدت تمرکز (دقیقه)</label><input id="focusLen" type="number" min="1" max="180" value="${S.settings.focus}"></div><div class="field"><label>استراحت کوتاه</label><input id="shortLen" type="number" min="1" max="60" value="${S.settings.shortBreak}"></div><div class="field"><label>استراحت بلند</label><input id="longLen" type="number" min="1" max="90" value="${S.settings.longBreak}"></div><button class="btn" id="saveTimerSettings">ذخیره تنظیمات</button>`)}</div>`,
  notes: () => `<div class="toolbar"><button class="btn" id="addNote">＋ یادداشت جدید</button><input class="search-input" id="noteSearch" placeholder="جست‌وجو در یادداشت‌ها"></div><div class="grid three-col" id="notesGrid">${notesMarkup(S.notes)}</div>`,
  analytics: () => `<div class="grid stats-grid">${stat("کل زمان مطالعه", `${(sum(S.study, "minutes") / 60).toFixed(1)} ساعت`, "تمام دوره")}${stat("کل تست‌ها", sum(S.study, "tests"), "ثبت‌شده")}${stat("میانگین آزمون‌ها", S.exams.length ? (S.exams.reduce((a, x) => a + avgExam(x), 0) / S.exams.length).toFixed(1) + "٪" : "—", "میانگین کل")}${stat("نرخ انجام وظایف", S.tasks.length ? Math.round(S.tasks.filter((t) => t.done).length / S.tasks.length * 100) + "٪" : "—", "از کل وظایف")}</div><div class="grid two-col">${panel("مطالعه به تفکیک درس", `<div class="chart-wrap"><canvas id="subjectChart"></canvas></div>`)}${panel("روند آزمون‌ها", `<div class="chart-wrap"><canvas id="examChart"></canvas></div>`)}</div><div class="section-gap">${panel("تحلیل و پیشنهاد", analysisText())}</div>`,
  smartplan: () => {
    let due = S.cards.filter((c) => !c.next || c.next <= today()).length, weak = S.syllabus.filter((x) => x.status !== "تسلط"), late = S.tasks.filter((x) => !x.done && x.date && x.date < today()), todayTasks = S.tasks.filter((x) => !x.done && x.date === today()), priority = [...late.map((x) => ({ kind: "وظیفه عقب‌افتاده", title: x.title, reason: "موعد گذشته؛ ابتدا وضعیتش را مشخص کن", score: 5 })), ...weak.slice(0, 5).map((x) => ({ kind: "مبحث نیازمند کار", title: (x.subject || "") + " · " + x.title, reason: "وضعیت: " + (x.status || "نخوانده"), score: x.status === "نخوانده" ? 4 : 3 })), ...due ? [{ kind: "مرور فاصله‌دار", title: due + " فلش‌کارت سررسیدشده", reason: "مرور کوتاه برای تثبیت آموخته‌ها", score: 4 }] : []].sort((a, b) => b.score - a.score);
    return `<div class="grid stats-grid">${stat("وظایف عقب‌افتاده", late.length, "نیازمند تعیین تکلیف", "!", "#ff7185")}${stat("مبحث غیرمسلط", weak.length, "از بانک مباحث", "▥", "#ffc66e")}${stat("مرور سررسیدشده", due, "فلش‌کارت", "↻", "#6eb8ff")}${stat("وظیفه امروز", todayTasks.length, "برنامه امروز", "☑", "#48d6b5")}</div><div class="grid two-col">${panel("پیشنهادهای اولویت‌دار", priority.length ? priority.map((p, i) => `<div class="list-item"><div class="item-main"><div class="item-title">${i + 1}. ${esc(p.title)}</div><div class="item-sub">${esc(p.kind)} · ${esc(p.reason)}</div></div><span class="pill">${p.score >= 5 ? "بالا" : p.score === 4 ? "متوسط" : "عادی"}</span></div>`).join("") : empty("داده‌ای برای پیشنهاد وجود ندارد؛ وظایف و مباحثت را ثبت کن."))}${panel("تنظیم ظرفیت روزانه", `<p class="muted">این مقدار برای تخمین برنامه استفاده می‌شود؛ برنامه پیشنهادی جایگزین تصمیم خودت نیست.</p><div class="field"><label>زمان قابل‌اختصاص در روز (دقیقه)</label><input id="dailyCapacity" type="number" min="15" max="900" value="${num(S.plannerPrefs?.dailyMinutes) || 180}"></div><button class="btn" id="saveCapacity">ذخیره ظرفیت</button><div class="divider"></div><p class="muted">پیشنهاد اجرایی: یک مبحث دشوار، یک مرور کوتاه و سپس وظایف زمان‌دار را در بلوک‌های جدا قرار بده.</p>`)}</div><div class="section-gap">${panel("ساخت برنامه پیشنهادی امروز", `<div class="toolbar"><button class="btn" id="buildDayPlan">ساخت برنامه امروز</button><span class="muted">بر اساس کارهای عقب‌افتاده، مباحث و ظرفیت روزانه</span></div><div id="dayPlanResult">${S.generatedPlan?.date === today() ? planMarkup(S.generatedPlan.items) : empty("هنوز برنامه‌ای برای امروز ساخته نشده است.")}</div>`)}</div>`;
  },
  search: () => `${panel("جست‌وجو در تمام بخش‌ها", `<input class="search-input wide" id="globalSearch" placeholder="عنوان وظیفه، مبحث، یادداشت، هدف یا درس را جست‌وجو کن..."><div class="muted" style="margin:10px 0">جست‌وجو در وظایف، مباحث، یادداشت‌ها، اهداف، آزمون‌ها و تحلیل تست</div><div id="globalResults">${empty("عبارت جست‌وجو را وارد کن.")}</div>`)}`,
  achievements: () => {
    let mins = sum(S.study, "minutes"), tests = sum(S.study, "tests") + S.testLogs.reduce((a, x) => a + num(x.correct) + num(x.wrong) + num(x.blank), 0), done = S.tasks.filter((x) => x.done).length, streakMax = Math.max(0, ...S.habits.map((h) => {
      let n = 0;
      for (let i = 0; i < 365; i++) {
        let d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() - i);
        let k = d.toISOString().slice(0, 10);
        if (S.habitLogs[h.id]?.[k]) n++;
        else if (i > 0) break;
      }
      return n;
    }));
    let xp = Math.floor(mins / 10) + tests + done * 5 + S.exams.length * 20 + S.cards.length * 2, level = Math.floor(xp / 250) + 1, next = level * 250, ach = [["شروع‌کننده", S.study.length > 0, "اولین جلسه مطالعه"], ["تمرکزگر", mins >= 300, "۵ ساعت مطالعه ثبت‌شده"], ["تست‌زن", tests >= 100, "۱۰۰ تست ثبت‌شده"], ["منظم", done >= 20, "۲۰ وظیفه تکمیل‌شده"], ["آزمون‌دهنده", S.exams.length >= 3, "ثبت ۳ آزمون"], ["مرورگر", S.cards.length >= 20, "ساخت ۲۰ فلش‌کارت"], ["پایدار", streakMax >= 7, "۷ روز زنجیره عادت"]];
    return `<div class="grid two-col"><section class="panel level-card"><div class="eyebrow">MPB EXPERIENCE POINTS</div><div class="level-number">سطح ${level}</div><div class="kpi">${xp} XP</div><div class="progress"><span style="width:${Math.min(100, xp % 250 / 250 * 100)}%"></span></div><div class="progress-row"><span>تا سطح بعدی</span><b>${next - xp} XP</b></div></section>${panel("آمار کلی", `<div class="kpi">${(mins / 60).toFixed(1)} ساعت</div><div class="muted">مطالعه · ${tests} تست · ${done} وظیفه تکمیل‌شده · ${streakMax} روز بیشترین زنجیره فعلی</div>`)}</div><div class="section-gap">${panel("نشان‌ها و دستاوردها", `<div class="grid three-col">${ach.map((a) => `<div class="achievement ${a[1] ? "unlocked" : ""}"><div class="achievement-icon">${a[1] ? "✦" : "◇"}</div><b>${a[0]}</b><small>${a[2]}</small><span class="pill">${a[1] ? "باز شده" : "قفل"}</span></div>`).join("")}</div>`)}</div>`;
  },
  reports: () => {
    let mins = sum(S.study, "minutes"), tests = S.testLogs.reduce((a, x) => a + num(x.correct) + num(x.wrong) + num(x.blank), 0) + sum(S.study, "tests"), done = S.tasks.filter((x) => x.done).length, accTotal = S.testLogs.reduce((a, x) => a + num(x.correct) + num(x.wrong) + num(x.blank), 0), acc = accTotal ? Math.round(S.testLogs.reduce((a, x) => a + num(x.correct), 0) / accTotal * 100) : 0;
    return `<div class="grid stats-grid">${stat("کل مطالعه", `${(mins / 60).toFixed(1)} ساعت`, "تمام جلسات", "◷", "#48d6b5")}${stat("کل تست‌ها", tests, "ثبت‌شده", "⌁", "#6eb8ff")}${stat("وظایف تکمیل‌شده", done, "از کل وظایف", "☑", "#ffc66e")}${stat("دقت تحلیل تست", acc + "٪", "بر اساس تست‌های تحلیل‌شده", "◎", "#ff7185")}</div><div class="grid two-col">${panel("گزارش‌گیری", `<p class="muted">خروجی CSV برای بازکردن در Excel یا Google Sheets.</p><div class="btn-row"><button class="btn" id="exportStudyCSV">خروجی جلسات مطالعه</button><button class="btn secondary" id="exportTestsCSV">خروجی تحلیل تست</button><button class="btn secondary" id="exportTasksCSV">خروجی وظایف</button></div><div class="divider"></div><button class="btn secondary" id="printReport">چاپ / ذخیره PDF</button>`)}${panel("خلاصه داده‌ها", `<div class="list-item"><span>جلسات مطالعه</span><b>${S.study.length}</b></div><div class="list-item"><span>آزمون‌ها</span><b>${S.exams.length}</b></div><div class="list-item"><span>مباحث ثبت‌شده</span><b>${S.syllabus.length}</b></div><div class="list-item"><span>یادداشت‌ها</span><b>${S.notes.length}</b></div><div class="list-item"><span>فلش‌کارت‌ها</span><b>${S.cards.length}</b></div>`)}</div>`;
  },
  workspace: () => {
    let prefs = S.widgetPrefs || { showStats: true, showStudy: true, showTasks: true, showGoals: true };
    let blocks = [["showStats", "کارت‌های آمار"], ["showStudy", "نمودار مطالعه"], ["showTasks", "وظایف مهم"], ["showGoals", "پیشرفت اهداف"]];
    return `${panel("شخصی‌سازی میزکار", `<p class="muted">بخش‌هایی را که می‌خواهی در داشبورد نمایش داده شوند انتخاب کن.</p><div class="widget-options">${blocks.map(([k, l]) => `<label class="widget-option"><input type="checkbox" data-widget-pref="${k}" ${prefs[k] !== false ? "checked" : ""}><span>${l}</span></label>`).join("")}</div><button class="btn" id="saveWidgets">ذخیره چیدمان</button>`)}<div class="section-gap">${panel("وضعیت فضای ذخیره‌سازی", `<div class="list-item"><span>ذخیره محلی مرورگر</span><b>فعال</b></div><div class="list-item"><span>پایگاه داده IndexedDB</span><b id="idbStatus">در حال بررسی…</b></div><div class="list-item"><span>نسخه داده</span><b>MPB v7</b></div><p class="muted">برای انتقال بین دستگاه‌ها از پشتیبان JSON استفاده کن. داده‌ها به‌صورت خودکار به سرور ارسال نمی‌شوند.</p>`)}</div>`;
  },
  reminders: () => `${panel("اعلان‌ها و یادآورها", `<p class="muted">اعلان‌ها فقط با اجازه خودت فعال می‌شوند و تا وقتی برنامه باز است، وظایف امروز را بررسی می‌کنند.</p><div class="btn-row"><button class="btn" id="enableNotifications">فعال‌سازی اعلان مرورگر</button><button class="btn secondary" id="testNotification">اعلان آزمایشی</button></div><div class="divider"></div><div class="list-item"><span>وضعیت مجوز مرورگر</span><b id="notificationStatus">در حال بررسی…</b></div><div class="list-item"><span>وظایف موعد امروز</span><b>${S.tasks.filter((t) => !t.done && t.date === today()).length}</b></div><p class="muted">یادآوری زمان‌بندی‌شده در پس‌زمینه، هنگام بسته‌بودن مرورگر تضمین نمی‌شود.</p>`)}`,
  settings: () => `${panel("پوسته و فضای بصری", `<p class="muted">یکی از چهار فضای بصری MPB را انتخاب کن. انتخابت ذخیره می‌شود.</p><div class="theme-grid">
<button class="theme-choice gold-theme" data-theme-choice="gold"><span class="theme-preview"></span><b>مشکی طلایی لوکس</b><small>طلایی کلاسیک · رسمی</small></button>
<button class="theme-choice silver-theme" data-theme-choice="silver"><span class="theme-preview"></span><b>مشکی نقره‌ای لوکس</b><small>نقره‌ای · مینیمال</small></button>
<button class="theme-choice hacker-theme" data-theme-choice="hacker"><span class="theme-preview"></span><b>هکری خفن</b><small>سبز ترمینالی · سایبر</small></button>
<button class="theme-choice light-theme" data-theme-choice="light"><span class="theme-preview"></span><b>سفید ساده</b><small>روشن · خلوت</small></button>
</div>`)}<div class="section-gap">${panel("پشتیبان‌گیری و انتقال اطلاعات", `<p class="muted">از اطلاعاتت فایل پشتیبان JSON بگیر یا نسخه قبلی را بازیابی کن. پیشنهاد می‌شود هر هفته خروجی بگیری.</p><div class="btn-row"><button class="btn" id="exportData">دانلود پشتیبان JSON</button><label class="btn secondary">بازیابی فایل<input type="file" id="importData" accept=".json,application/json" hidden></label></div>`)}</div><div class="section-gap">${panel("مدیریت داده‌ها", `<p class="muted">اطلاعات در حافظه محلی همین مرورگر ذخیره می‌شود؛ با پاک‌کردن داده‌های مرورگر ممکن است حذف شود.</p><button class="btn danger" id="clearData">حذف تمام اطلاعات برنامه</button>`)}</div>`
};
titles.syllabus = "بانک مباحث و بودجه‌بندی";
titles.weekly = "برنامه هفتگی";
titles.testlog = "تحلیل تست‌ها";
pages.syllabus = () => `<div class="toolbar"><button class="btn" id="addTopic">＋ افزودن مبحث</button><select class="search-input" id="syllabusSubject"><option value="all">همه درس‌ها</option>${[...new Set(S.syllabus.map((x) => x.subject))].map((x) => `<option>${esc(x)}</option>`).join("")}</select></div><div class="grid two-col">${panel("پیشرفت پوشش مباحث", `<div class="kpi">${S.syllabus.length ? Math.round(S.syllabus.filter((x) => x.done).length / S.syllabus.length * 100) : 0}٪</div><div class="progress"><span style="width:${S.syllabus.length ? S.syllabus.filter((x) => x.done).length / S.syllabus.length * 100 : 0}%"></span></div><p class="muted">${S.syllabus.filter((x) => x.done).length} مبحث از ${S.syllabus.length} مبحث تکمیل شده</p>`)}${panel("راهنمای وضعیت", `<span class="pill">نخوانده</span> <span class="pill yellow">درحال مطالعه</span> <span class="pill green">تسلط</span><p class="muted">وضعیت هر مبحث را با انتخاب گزینه تغییر بده.</p>`)}</div><div class="section-gap">${panel("فهرست مباحث", `<div id="topicList">${syllabusMarkup(S.syllabus)}</div>`)}</div>`;
pages.weekly = () => {
  let days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  return `<div class="toolbar"><button class="btn" id="addWeekSlot">＋ افزودن بازه مطالعه</button><button class="btn secondary" id="clearWeek">پاک‌کردن برنامه هفتگی</button></div>${panel("برنامه هفتگی", `<div class="week-grid">${days.map((d, i) => `<div class="week-day"><h4>${d}</h4>${S.weekPlan.filter((x) => x.day === String(i)).sort((a, b) => a.start.localeCompare(b.start)).map((x) => `<div class="week-slot"><b>${esc(x.start)}–${esc(x.end)}</b><br>${esc(x.subject)}<br>${esc(x.topic)}<div class="btn-row" style="margin-top:6px"><button class="mini-btn" data-week-done="${x.id}">${x.done ? "✓ انجام شد" : "ثبت انجام"}</button><button class="mini-btn" data-week-del="${x.id}">×</button></div></div>`).join("") || '<div class="muted">بدون برنامه</div>'}</div>`).join("")}</div>`)}`;
};
pages.testlog = () => {
    let total = S.testLogs.reduce((a, x) => a + x.correct + x.wrong + x.blank, 0), correct = sum(S.testLogs, "correct"), wrong = sum(S.testLogs, "wrong"), blank = sum(S.testLogs, "blank"), acc = total ? Math.round(correct / total * 100) : 0;
    return `<div class="toolbar"><button class="btn" id="addTestLog">＋ ثبت تحلیل تست</button></div><div class="grid stats-grid">${stat("تعداد کل تست‌ها", total, "در گزارش‌های ثبت‌شده", "▤")}${stat("درست", correct, "پاسخ صحیح", "✓", "#48d6b5")}${stat("غلط", wrong, "پاسخ اشتباه", "×", "#ff7185")}${stat("نزده", blank, "بدون پاسخ", "—", "#ffc66e")}</div>${panel("درصد پاسخ صحیح", `<div class="kpi">${acc}٪</div><div class="progress"><span style="width:${acc}%"></span></div><p class="muted">درصد صحیح از مجموع تست‌های ثبت‌شده؛ این عدد جایگزین نمره منفی آزمون نیست.</p>`)}<div class="section-gap">${panel("گزارش‌های تحلیل تست", S.testLogs.slice().reverse().map((x) => `<div class="list-item"><div class="item-main"><div class="item-title">${esc(x.subject)} · ${esc(x.topic)}</div><div class="item-sub">${fmtDate(x.date)} · ${esc(x.source || "تمرین")}</div><div class="item-sub">درست ${x.correct} · غلط ${x.wrong} · نزده ${x.blank} · زمان ${x.minutes || 0} دقیقه</div>${x.note ? `<div class="item-sub">${esc(x.note)}</div>` : ""}</div><button class="mini-btn" data-test-del="${x.id}">×</button></div>`).join("") || empty("هنوز گزارشی ثبت نشده است"))}</div>`;
  };
  function planMarkup(items) {
    return items?.length ? `<div class="plan-list">${items.map((x, i) => `<div class="list-item"><div class="item-main"><b>${i + 1}. ${esc(x.time)}</b><div class="item-title">${esc(x.title)}</div><div class="item-sub">${esc(x.note)}</div></div><span class="pill">${x.minutes} دقیقه</span></div>`).join("")}</div><button class="btn secondary" id="clearDayPlan">پاک‌کردن برنامه پیشنهادی</button>` : empty();
  }
  function buildTodayPlan() {
    let cap = Math.max(15, Math.min(900, num(S.plannerPrefs?.dailyMinutes) || 180)), items = [], cursor = 0;
    let add = (title, note, minutes) => {
      let m = Math.min(minutes, Math.max(0, cap - cursor));
      if (m <= 0) return;
      let start = 8 * 60 + cursor, fmt = (v) => String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0");
      items.push({ title, note, minutes: m, time: fmt(start) + " تا " + fmt(start + m) });
      cursor += m + 10;
    };
    let late = S.tasks.filter((x) => !x.done && x.date && x.date < today()).slice(0, 2);
    late.forEach((x) => add(x.title, "تعیین تکلیف وظیفه عقب‌افتاده", 35));
    let weak = S.syllabus.filter((x) => x.status !== "تسلط").slice(0, 2);
    weak.forEach((x) => add((x.subject || "درس") + " · " + x.title, "مطالعه و یادگیری مبحث", 40));
    let due = S.cards.filter((x) => !x.next || x.next <= today()).length;
    if (due) add("مرور فلش‌کارت‌ها", due + " کارت سررسیدشده؛ مرور فعال", 20);
    let task = S.tasks.filter((x) => !x.done && x.date === today()).slice(0, 2);
    task.forEach((x) => add(x.title, "انجام وظیفه امروز", 25));
    if (!items.length) add("مطالعه هدفمند", "یک مبحث مهم را انتخاب و ۲۵ دقیقه شروع کن", 25);
    return items;
  }
  function globalSearch(q) {
    q = q.trim().toLowerCase();
    if (!q) return empty("عبارت جست‌وجو را وارد کن.");
    let all = [...S.tasks.map((x) => ({ type: "وظیفه", title: x.title, sub: x.category || "", page: "tasks" })), ...S.syllabus.map((x) => ({ type: "مبحث", title: x.title, sub: x.subject || "", page: "syllabus" })), ...S.notes.map((x) => ({ type: "یادداشت", title: x.title, sub: x.tag || "", page: "notes" })), ...S.goals.map((x) => ({ type: "هدف", title: x.title, sub: x.unit || "", page: "goals" })), ...S.testLogs.map((x) => ({ type: "تحلیل تست", title: x.topic, sub: x.subject || "", page: "testlog" })), ...S.exams.map((x) => ({ type: "آزمون", title: x.title, sub: fmtDate(x.date), page: "exams" }))];
    let found = all.filter((x) => (x.title + " " + x.sub + " " + x.type).toLowerCase().includes(q)).slice(0, 60);
    return found.length ? found.map((x) => `<button class="search-result" data-go="${x.page}"><span class="pill">${x.type}</span><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></button>`).join("") : empty("نتیجه‌ای پیدا نشد.");
  }
  function csvDownload(name, rows) {
    let csv = "\\ufeff" + rows.map((r) => r.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")).join("\\r\\n");
    let blob = new Blob([csv], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"), u = URL.createObjectURL(blob);
    a.href = u;
    a.download = name + "-" + today() + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1e3);
  }
  function syllabusMarkup(arr) {
    return arr.length ? arr.map((x) => `<div class="topic-row"><input type="checkbox" data-topic-done="${x.id}" ${x.done ? "checked" : ""}><div><b>${esc(x.subject)} · ${esc(x.title)}</b><div class="item-sub">${esc(x.chapter || "")} ${x.note ? "· " + esc(x.note) : ""}</div></div><div class="btn-row"><select class="mini-btn" data-topic-status="${x.id}"><option ${x.status === "نخوانده" ? "selected" : ""}>نخوانده</option><option ${x.status === "درحال مطالعه" ? "selected" : ""}>درحال مطالعه</option><option ${x.status === "تسلط" ? "selected" : ""}>تسلط</option></select><button class="mini-btn" data-topic-del="${x.id}">×</button></div></div>`).join("") : empty("مباحث درسی‌ات را اضافه کن");
  }
  function notesMarkup(arr) {
    return arr.map((n) => `<div class="panel"><div class="panel-head"><span class="pill">${esc(n.tag || "یادداشت")}</span><button class="mini-btn" data-del-note="${n.id}">×</button></div><h3>${esc(n.title)}</h3><p class="muted" style="white-space:pre-wrap">${esc(n.body)}</p><div class="item-sub">${fmtDate(n.date)}</div></div>`).join("") || empty();
  }
  function analysisText() {
    let lines = [];
    let mins = sum(S.study, "minutes"), tests = sum(S.study, "tests"), late = S.tasks.filter((t) => !t.done && t.date < today()).length;
    if (!S.study.length) lines.push("هنوز داده مطالعه کافی نیست؛ از بخش مطالعه، جلساتت را ثبت کن تا تحلیل دقیق‌تر شود.");
    else {
      lines.push(`تا الان ${(mins / 60).toFixed(1)} ساعت مطالعه ثبت کرده‌ای و ${tests} تست زده‌ای.`);
      let subjects = {};
      S.study.forEach((x) => subjects[x.subject] = (subjects[x.subject] || 0) + x.minutes);
      let best = Object.entries(subjects).sort((a, b) => b[1] - a[1])[0];
      if (best) lines.push(`بیشترین زمان مطالعه مربوط به ${best[0]} با ${best[1]} دقیقه است.`);
    }
    if (late) lines.push(`${late} وظیفه عقب‌افتاده داری؛ بهتر است ابتدا موارد مهم و نزدیک‌تر را تعیین تکلیف کنی.`);
    if (S.exams.length > 1) {
      let a = avgExam(S.exams[0]), b = avgExam(S.exams[S.exams.length - 1]);
      lines.push(`میانگین آخرین آزمون نسبت به اولین آزمون ${Math.abs(b - a).toFixed(1)} واحد درصد ${b >= a ? "بیشتر" : "کمتر"} است.`);
    }
    return `<ul>${lines.map((x) => `<li style="margin:10px 0;font-size:11px">${x}</li>`).join("")}</ul>`;
  }
  function modal(title, body) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    $("#modalBackdrop").classList.add("open");
  }
  function closeModal() {
    $("#modalBackdrop").classList.remove("open");
  }
  function field(label, name, type = "text", value = "", extra = "") {
    return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
  }
  function selectField(label, name, options, value = "") {
    return `<div class="field"><label>${label}</label><select name="${name}">${options.map((o) => `<option ${o === value ? "selected" : ""}>${o}</option>`).join("")}</select></div>`;
  }
  function formWrap(fields, submit = "ذخیره") {
    return `<form id="dataForm"><div class="field-grid">${fields}</div><div class="modal-actions"><button type="button" class="btn secondary" id="cancelModal">لغو</button><button class="btn" type="submit">${submit}</button></div></form>`;
  }
  function values(form) {
    return Object.fromEntries(new FormData(form).entries());
  }
  function openTask(t = {}) {
    modal(t.id ? "ویرایش وظیفه" : "وظیفه جدید", formWrap(field("عنوان وظیفه", "title", "text", t.title || "", "required") + field("تاریخ انجام", "date", "date", t.date || today()) + selectField("دسته", "category", ["درس", "شخصی", "پروژه", "سلامت", "متفرقه"], t.category || "درس") + selectField("اولویت", "priority", ["کم", "متوسط", "زیاد"], t.priority || "متوسط") + selectField("تکرار", "repeat", ["بدون تکرار", "روزانه", "هفتگی", "ماهانه"], t.repeat || "بدون تکرار") + `<div class="field full"><label>توضیحات</label><textarea name="desc">${esc(t.desc || "")}</textarea></div>`));
    $("#dataForm").onsubmit = (e) => {
      e.preventDefault();
      let v = values(e.target);
      if (t.id) Object.assign(t, v);
      else S.tasks.push({ id: uid(), ...v, done: false });
      save();
      closeModal();
      render();
      toast("وظیفه ذخیره شد");
    };
  }
  function openStudy() {
    modal("ثبت جلسه مطالعه", formWrap(field("درس", "subject", "text", "ریاضی", "required") + field("مبحث", "topic", "text", "", "required") + field("تاریخ", "date", "date", today()) + field("مدت (دقیقه)", "minutes", "number", "60", 'min="1" required') + field("تعداد تست", "tests", "number", "0", 'min="0"') + selectField("نوع فعالیت", "kind", ["مطالعه آموزشی", "حل تست", "مرور", "آزمون", "تحلیل آزمون"], "مطالعه آموزشی") + field("درصد پاسخ صحیح (اختیاری)", "accuracy", "number", "", 'min="0" max="100"')));
    $("#dataForm").onsubmit = (e) => {
      e.preventDefault();
      let v = values(e.target);
      S.study.push({ id: uid(), ...v, minutes: num(v.minutes), tests: num(v.tests) });
      save();
      closeModal();
      render();
      toast("جلسه مطالعه ثبت شد");
    };
  }
  function openExam() {
    modal("ثبت نتیجه آزمون", formWrap(field("نام آزمون", "title", "text", "آزمون آزمایشی", "required") + field("تاریخ", "date", "date", today()) + field("ریاضی (%)", "math", "number", "0", 'min="-100" max="100"') + field("فیزیک (%)", "physics", "number", "0", 'min="-100" max="100"') + field("شیمی (%)", "chemistry", "number", "0", 'min="-100" max="100"') + `<div class="field full"><label>نکته‌ها و تحلیل آزمون</label><textarea name="notes"></textarea></div>`));
    $("#dataForm").onsubmit = (e) => {
      e.preventDefault();
      let v = values(e.target);
      S.exams.push({ id: uid(), ...v });
      save();
      closeModal();
      render();
      toast("نتیجه آزمون ثبت شد");
    };
  }
  function bindPage() {
    $$("[data-go]").forEach((b) => b.onclick = () => setPage(b.dataset.go));
    $$("[data-task-check]").forEach((b) => b.onchange = () => {
      let t = S.tasks.find((x) => x.id === b.dataset.taskCheck);
      t.done = b.checked;
      save();
      render();
    });
    $$("[data-del-task]").forEach((b) => b.onclick = () => {
      S.tasks = S.tasks.filter((x) => x.id !== b.dataset.delTask);
      save();
      render();
    });
    $$("[data-edit-task]").forEach((b) => b.onclick = () => openTask(S.tasks.find((x) => x.id === b.dataset.editTask)));
    if ($("#addTask")) $("#addTask").onclick = () => openTask();
    if ($("#taskSearch")) {
      let filter = () => {
        let q = $("#taskSearch").value.toLowerCase(), f = $("#taskFilter").value, arr = S.tasks.filter((t) => t.title.toLowerCase().includes(q) || String(t.category).toLowerCase().includes(q));
        arr = arr.filter((t) => f === "all" || f === "today" && t.date === today() && !t.done || f === "overdue" && t.date < today() && !t.done || f === "done" && t.done || f === "week" && t.date >= today() && t.date <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) && !t.done);
        $("#taskList").innerHTML = taskRows(arr);
        bindTaskRows();
      };
      $("#taskSearch").oninput = filter;
      $("#taskFilter").onchange = filter;
    }
    function bindTaskRows() {
      $$("[data-task-check]").forEach((b) => b.onchange = () => {
        S.tasks.find((x) => x.id === b.dataset.taskCheck).done = b.checked;
        save();
        render();
      });
      $$("[data-del-task]").forEach((b) => b.onclick = () => {
        S.tasks = S.tasks.filter((x) => x.id !== b.dataset.delTask);
        save();
        render();
      });
      $$("[data-edit-task]").forEach((b) => b.onclick = () => openTask(S.tasks.find((x) => x.id === b.dataset.editTask)));
    }
    if ($("#addStudy")) $("#addStudy").onclick = openStudy;
    if ($("#addExam")) $("#addExam").onclick = openExam;
    if ($("#prevMonth")) $("#prevMonth").onclick = () => {
      S.calendarOffset--;
      render();
    };
    if ($("#nextMonth")) $("#nextMonth").onclick = () => {
      S.calendarOffset++;
      render();
    };
    $$("[data-cal-date]").forEach((b) => b.onclick = () => {
      let d = b.dataset.calDate;
      modal("افزودن رویداد", formWrap(field("عنوان", "title", "text", "", "required") + field("تاریخ", "date", "date", d) + selectField("نوع", "kind", ["امتحان", "ددلاین", "قرار", "یادآوری"], "یادآوری")));
      $("#dataForm").onsubmit = (e) => {
        e.preventDefault();
        S.events.push({ id: uid(), ...values(e.target) });
        save();
        closeModal();
        render();
        toast("رویداد اضافه شد");
      };
    });
    $$("[data-del-event]").forEach((b) => b.onclick = () => {
      S.events = S.events.filter((x) => x.id !== b.dataset.delEvent);
      save();
      render();
    });
    $$("[data-del-study]").forEach((b) => b.onclick = () => {
      S.study = S.study.filter((x) => x.id !== b.dataset.delStudy);
      save();
      render();
    });
    $$("[data-del-exam]").forEach((b) => b.onclick = () => {
      S.exams = S.exams.filter((x) => x.id !== b.dataset.delExam);
      save();
      render();
    });
    if ($("#addHabit")) $("#addHabit").onclick = () => {
      modal("عادت جدید", formWrap(field("نام عادت", "title", "text", "", "required")));
      $("#dataForm").onsubmit = (e) => {
        e.preventDefault();
        S.habits.push({ id: uid(), ...values(e.target) });
        save();
        closeModal();
        render();
      };
    };
    $$("[data-habit-check]").forEach((b) => b.onclick = () => {
      let id = b.dataset.habitCheck;
      S.habitLogs[id] ??= {};
      if (S.habitLogs[id][today()]) delete S.habitLogs[id][today()];
      else S.habitLogs[id][today()] = true;
      save();
      render();
    });
    $$("[data-del-habit]").forEach((b) => b.onclick = () => {
      S.habits = S.habits.filter((x) => x.id !== b.dataset.delHabit);
      delete S.habitLogs[b.dataset.delHabit];
      save();
      render();
    });
    if ($("#addGoal")) $("#addGoal").onclick = () => openGoal();
    $$("[data-goal-add]").forEach((b) => b.onclick = () => {
      let g = S.goals.find((x) => x.id === b.dataset.goalAdd), v = prompt("چقدر به پیشرفت اضافه شود؟", "1");
      if (v !== null) {
        g.current = num(g.current) + num(v);
        save();
        render();
      }
    });
    $$("[data-goal-edit]").forEach((b) => b.onclick = () => openGoal(S.goals.find((x) => x.id === b.dataset.goalEdit)));
    $$("[data-del-goal]").forEach((b) => b.onclick = () => {
      S.goals = S.goals.filter((x) => x.id !== b.dataset.delGoal);
      save();
      render();
    });
    if ($("#addCard")) $("#addCard").onclick = () => {
      modal("فلش‌کارت جدید", formWrap(field("درس / دسته", "subject", "text", "ریاضی") + `<div class="field full"><label>سؤال</label><textarea name="question" required></textarea></div><div class="field full"><label>پاسخ</label><textarea name="answer" required></textarea></div>`));
      $("#dataForm").onsubmit = (e) => {
        e.preventDefault();
        S.cards.push({ id: uid(), ...values(e.target), interval: 0, next: today() });
        save();
        closeModal();
        render();
      };
    };
    $$("[data-del-card]").forEach((b) => b.onclick = () => {
      S.cards = S.cards.filter((x) => x.id !== b.dataset.delCard);
      save();
      render();
    });
    if ($("#startReview")) $("#startReview").onclick = () => {
      let c = S.cards.find((x) => !x.next || x.next <= today());
      if (c) {
        currentCard = c.id;
        cardFlip = false;
        render();
      }
    };
    if ($("#flipCard")) $("#flipCard").onclick = () => {
      cardFlip = !cardFlip;
      render();
    };
    if ($("#hardCard")) $("#hardCard").onclick = () => reviewCard(false);
    if ($("#easyCard")) $("#easyCard").onclick = () => reviewCard(true);
    if ($("#nextCard")) $("#nextCard").onclick = () => {
      let due = S.cards.filter((c) => !c.next || c.next <= today());
      let idx = due.findIndex((c) => c.id === currentCard);
      currentCard = due[(idx + 1) % due.length]?.id || null;
      cardFlip = false;
      render();
    };
    if ($("#addNote")) $("#addNote").onclick = () => openNote();
    if ($("#noteSearch")) $("#noteSearch").oninput = () => {
      $("#notesGrid").innerHTML = notesMarkup(S.notes.filter((n) => (n.title + n.body + n.tag).toLowerCase().includes($("#noteSearch").value.toLowerCase())));
      bindNoteDeletes();
    };
    bindNoteDeletes();
    $$("[data-del-note]").forEach((b) => b.onclick = () => {
      S.notes = S.notes.filter((n) => n.id !== b.dataset.delNote);
      save();
      render();
    });
    if ($("#timerStart")) $("#timerStart").onclick = startTimer;
    if ($("#timerPause")) $("#timerPause").onclick = () => {
      clearInterval(timer);
      timer = null;
    };
    if ($("#timerReset")) $("#timerReset").onclick = () => {
      clearInterval(timer);
      timer = null;
      setTimer(timerMode);
    };
    $$("[data-timer-mode]").forEach((b) => b.onclick = () => {
      clearInterval(timer);
      timer = null;
      timerMode = b.dataset.timerMode;
      setTimer(timerMode);
    });
    if ($("#saveTimerSettings")) $("#saveTimerSettings").onclick = () => {
      S.settings.focus = num($("#focusLen").value) || 25;
      S.settings.shortBreak = num($("#shortLen").value) || 5;
      S.settings.longBreak = num($("#longLen").value) || 15;
      save();
      setTimer("focus");
      toast("تنظیمات تایمر ذخیره شد");
    };
    $$("[data-theme-choice]").forEach((b) => b.onclick = () => theme(b.dataset.themeChoice));
    if ($("#saveWidgets")) $("#saveWidgets").onclick = () => {
      S.widgetPrefs = {};
      $$("[data-widget-pref]").forEach((x) => S.widgetPrefs[x.dataset.widgetPref] = x.checked);
      save();
      toast("چیدمان میزکار ذخیره شد");
    };
    if ($("#enableNotifications")) $("#enableNotifications").onclick = async () => {
      if (!("Notification" in window)) {
        toast("این مرورگر از اعلان پشتیبانی نمی‌کند");
        return;
      }
      let p = await Notification.requestPermission();
      $("#notificationStatus").textContent = p === "granted" ? "فعال" : p === "denied" ? "رد شده" : "در انتظار";
      if (p === "granted") {
        toast("اعلان‌ها فعال شدند");
        notifyDueTasks();
      }
    };
    if ($("#testNotification")) $("#testNotification").onclick = () => {
      if ("Notification" in window && Notification.permission === "granted") new Notification("MPB", { body: "اعلان آزمایشی فعال است." });
      else toast("ابتدا مجوز اعلان را فعال کن");
    };
    if ($("#idbStatus")) $("#idbStatus").textContent = window.indexedDB ? "پشتیبانی می‌شود" : "در دسترس نیست";
    if ($("#notificationStatus")) $("#notificationStatus").textContent = "Notification" in window ? Notification.permission : "پشتیبانی نمی‌شود";
    if ($("#saveCapacity")) $("#saveCapacity").onclick = () => {
      S.plannerPrefs.dailyMinutes = Math.max(15, Math.min(900, num($("#dailyCapacity").value) || 180));
      save();
      toast("ظرفیت روزانه ذخیره شد");
      render();
    };
    if ($("#buildDayPlan")) $("#buildDayPlan").onclick = () => {
      S.generatedPlan = { date: today(), items: buildTodayPlan() };
      save();
      $("#dayPlanResult").innerHTML = planMarkup(S.generatedPlan.items);
    };
    if ($("#clearDayPlan")) $("#clearDayPlan").onclick = () => {
      S.generatedPlan = null;
      save();
      render();
    };
    if ($("#globalSearch")) $("#globalSearch").oninput = () => $("#globalResults").innerHTML = globalSearch($("#globalSearch").value);
    if ($("#exportStudyCSV")) $("#exportStudyCSV").onclick = () => csvDownload("MPB-study", [["تاریخ", "درس", "مبحث", "دقیقه", "تست", "نوع"], ...S.study.map((x) => [x.date, x.subject, x.topic, x.minutes, x.tests, x.kind])]);
    if ($("#exportTestsCSV")) $("#exportTestsCSV").onclick = () => csvDownload("MPB-test-analysis", [["تاریخ", "درس", "مبحث", "درست", "غلط", "نزده", "دقیقه", "منبع", "یادداشت"], ...S.testLogs.map((x) => [x.date, x.subject, x.topic, x.correct, x.wrong, x.blank, x.minutes, x.source, x.note])]);
    if ($("#exportTasksCSV")) $("#exportTasksCSV").onclick = () => csvDownload("MPB-tasks", [["عنوان", "تاریخ", "دسته", "اولویت", "انجام‌شده"], ...S.tasks.map((x) => [x.title, x.date, x.category, x.priority, x.done ? "بله" : "خیر"])]);
    if ($("#printReport")) $("#printReport").onclick = () => window.print();
    if ($("#exportData")) $("#exportData").onclick = exportData;
    if ($("#importData")) $("#importData").onchange = importData;
    if ($("#clearData")) $("#clearData").onclick = () => {
      if (confirm("تمام اطلاعات برنامه حذف شود؟ این کار قابل بازگشت نیست.")) {
        localStorage.removeItem("mpb_ultimate");
        S = structuredClone(defaultState);
        save();
        render();
        toast("اطلاعات پاک شد");
      }
    };
  }
  function bindNoteDeletes() {
    $$("[data-del-note]").forEach((b) => b.onclick = () => {
      S.notes = S.notes.filter((n) => n.id !== b.dataset.delNote);
      save();
      render();
    });
  }
  function openGoal(g = {}) {
    modal(g.id ? "ویرایش هدف" : "هدف جدید", formWrap(field("عنوان هدف", "title", "text", g.title || "", "required") + field("مقدار هدف", "target", "number", g.target || "100", 'min="1"') + field("پیشرفت فعلی", "current", "number", g.current || "0", 'min="0"') + field("واحد", "unit", "text", g.unit || "جلسه") + field("موعد", "date", "date", g.date || "")));
    $("#dataForm").onsubmit = (e) => {
      e.preventDefault();
      let v = values(e.target);
      if (g.id) Object.assign(g, v);
      else S.goals.push({ id: uid(), ...v });
      save();
      closeModal();
      render();
    };
  }
  function openNote() {
    modal("یادداشت جدید", formWrap(field("عنوان", "title", "text", "", "required") + field("برچسب", "tag", "text", "ایده") + `<div class="field full"><label>متن یادداشت</label><textarea name="body" required></textarea></div>`));
    $("#dataForm").onsubmit = (e) => {
      e.preventDefault();
      S.notes.push({ id: uid(), ...values(e.target), date: today() });
      save();
      closeModal();
      render();
    };
  }
  function reviewCard(easy) {
    let c = S.cards.find((x) => x.id === currentCard);
    if (!c) return;
    c.interval = easy ? Math.min(60, Math.max(1, (c.interval || 0) * 2 || 1)) : 1;
    c.next = new Date(Date.now() + c.interval * 864e5).toISOString().slice(0, 10);
    save();
    let next = S.cards.find((x) => !x.next || x.next <= today());
    currentCard = next?.id || null;
    cardFlip = false;
    render();
    toast(easy ? "مرور بعدی با فاصله بیشتر تنظیم شد" : "این کارت فردا دوباره مرور می‌شود");
  }
  function setTimer(mode) {
    timerMode = mode;
    let m = mode === "focus" ? S.settings.focus : mode === "short" ? S.settings.shortBreak : S.settings.longBreak;
    remaining = m * 60;
    updateTimerDisplay();
  }
  function updateTimerDisplay() {
    let e = $("#timerDisplay");
    if (e) e.textContent = String(Math.floor(remaining / 60)).padStart(2, "0") + ":" + String(remaining % 60).padStart(2, "0");
    let l = $("#timerModeLabel");
    if (l) l.textContent = timerMode === "focus" ? "تمرکز" : timerMode === "short" ? "استراحت کوتاه" : "استراحت بلند";
  }
  function startTimer() {
    if (timer) return;
    timer = setInterval(() => {
      remaining--;
      updateTimerDisplay();
      if (remaining <= 0) {
        clearInterval(timer);
        timer = null;
        if (timerMode === "focus") {
          S.sessions.push({ id: uid(), date: today(), minutes: S.settings.focus });
          S.study.push({ id: uid(), date: today(), subject: "تمرکز آزاد", topic: "جلسه پومودورو", minutes: S.settings.focus, tests: 0, kind: "تمرکز" });
          save();
          toast("جلسه تمرکز ثبت شد");
        }
        setTimer(timerMode === "focus" ? "short" : "focus");
      }
    }, 1e3);
  }
  function theme(t) {
    const allowed = ["gold", "silver", "hacker", "light"];
    if (!allowed.includes(t)) t = "gold";
    S.settings.theme = t;
    document.body.dataset.theme = t;
    document.body.classList.toggle("light", t === "light");
    save();
    toast("پوسته برنامه تغییر کرد");
  }
  function exportData() {
    let blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "MPB-backup-" + today() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function importData(e) {
    let f = e.target.files[0];
    if (!f) return;
    let r = new FileReader();
    r.onload = () => {
      try {
        let x = JSON.parse(r.result);
        if (!x || typeof x !== "object") throw 0;
        S = { ...structuredClone(defaultState), ...x, settings: { ...defaultState.settings, ...x.settings || {} }, plannerPrefs: { ...defaultState.plannerPrefs, ...x.plannerPrefs || {} } };
        save();
        render();
        toast("پشتیبان بازیابی شد");
      } catch {
        toast("فایل پشتیبان معتبر نیست");
      }
    };
    r.readAsText(f);
  }
  function drawCharts() {
    if (!window.Chart) return;
    Chart.defaults.color = "#8c97ad";
    Chart.defaults.font.family = "Vazirmatn";
    let days2 = Array.from({ length: 7 }, (_, i) => {
      let d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - 6 + i);
      return d.toISOString().slice(0, 10);
    });
    let studyData = days2.map((d) => S.study.filter((x) => x.date === d).reduce((a, x) => a + x.minutes, 0));
    if ($("#studyChart")) chartRefs.study = new Chart($("#studyChart"), { type: "bar", data: { labels: days2.map((d) => (/* @__PURE__ */ new Date(d + "T12:00:00")).toLocaleDateString("fa-IR", { weekday: "short" })), datasets: [{ label: "دقیقه مطالعه", data: studyData, backgroundColor: "#8b7cff", borderRadius: 7 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: "#283146" } } } } });
    let subjects = {};
    S.study.forEach((x) => subjects[x.subject] = (subjects[x.subject] || 0) + x.minutes);
    if ($("#subjectChart")) chartRefs.subject = new Chart($("#subjectChart"), { type: "doughnut", data: { labels: Object.keys(subjects), datasets: [{ data: Object.values(subjects), backgroundColor: ["#8b7cff", "#48d6b5", "#ffc66e", "#6eb8ff", "#ff7185", "#c08bff"] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } } });
    if ($("#examChart")) chartRefs.exam = new Chart($("#examChart"), { type: "line", data: { labels: S.exams.map((x) => fmtDate(x.date)), datasets: [{ label: "میانگین درصد", data: S.exams.map(avgExam), borderColor: "#48d6b5", backgroundColor: "#48d6b522", fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: "#283146" } }, x: { grid: { display: false } } } } });
  }
  $("#mainNav").addEventListener("click", (e) => {
    let b = e.target.closest("[data-page]");
    if (b) setPage(b.dataset.page);
  });
  $("#menuToggle").onclick = () => $("#sidebar").classList.toggle("open");
  $("#modalClose").onclick = closeModal;
  $("#modalBackdrop").onclick = (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  };
  $("#modalBody").addEventListener("click", (e) => {
    if (e.target.id === "cancelModal") closeModal();
  });
  $("#quickAdd").onclick = () => modal("افزودن سریع", `<div class="grid three-col"><button class="btn" data-quick="task">وظیفه</button><button class="btn" data-quick="study">مطالعه</button><button class="btn" data-quick="exam">آزمون</button><button class="btn secondary" data-quick="habit">عادت</button><button class="btn secondary" data-quick="goal">هدف</button><button class="btn secondary" data-quick="note">یادداشت</button></div>`);
  $("#modalBody").addEventListener("click", (e) => {
    let b = e.target.closest("[data-quick]");
    if (!b) return;
    let k = b.dataset.quick;
    closeModal();
    ({ task: () => openTask(), study: openStudy, exam: openExam, habit: () => $("#addHabit")?.click() || setPage("habits"), goal: () => openGoal(), note: openNote })[k]?.();
  });
  $("#todayLabel").textContent = (/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR", { weekday: "long", month: "long", day: "numeric" });
  $("#headerDate").textContent = (/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR", { weekday: "long", month: "short", day: "numeric" });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "addTopic") {
      modal("افزودن مبحث", formWrap(field("درس", "subject", "text", "ریاضی", "required") + field("عنوان مبحث", "title", "text", "", "required") + field("فصل / پایه", "chapter") + selectField("وضعیت", "status", ["نخوانده", "درحال مطالعه", "تسلط"], "نخوانده") + `<div class="field full"><label>یادداشت</label><textarea name="note"></textarea></div>`));
      $("#dataForm").onsubmit = (ev) => {
        ev.preventDefault();
        let v = values(ev.target);
        S.syllabus.push({ id: uid(), ...v, done: v.status === "تسلط" });
        save();
        closeModal();
        render();
      };
    }
    if (b.id === "addWeekSlot") {
      modal("افزودن برنامه هفتگی", formWrap(selectField("روز هفته", "day", ["0", "1", "2", "3", "4", "5", "6"], "0") + field("درس", "subject", "text", "ریاضی", "required") + field("مبحث", "topic", "text", "", "required") + field("شروع", "start", "time", "16:00") + field("پایان", "end", "time", "17:00")));
      $("#dataForm").onsubmit = (ev) => {
        ev.preventDefault();
        let v = values(ev.target);
        S.weekPlan.push({ id: uid(), ...v, done: false });
        save();
        closeModal();
        render();
      };
    }
    if (b.id === "clearWeek" && confirm("برنامه هفتگی پاک شود؟")) {
      S.weekPlan = [];
      save();
      render();
    }
    if (b.id === "addTestLog") {
      modal("ثبت تحلیل تست", formWrap(field("درس", "subject", "text", "ریاضی", "required") + field("مبحث", "topic", "text", "", "required") + field("تاریخ", "date", "date", today()) + field("تعداد درست", "correct", "number", "0", 'min="0"') + field("تعداد غلط", "wrong", "number", "0", 'min="0"') + field("تعداد نزده", "blank", "number", "0", 'min="0"') + field("زمان (دقیقه)", "minutes", "number", "0", 'min="0"') + field("منبع / آزمون", "source", "text", "تمرین") + `<div class="field full"><label>علت اشتباه / نکته مهم</label><textarea name="note" placeholder="مثلاً بی‌دقتی، فرمول، ضعف مفهومی..."></textarea></div>`));
      $("#dataForm").onsubmit = (ev) => {
        ev.preventDefault();
        let v = values(ev.target);
        S.testLogs.push({ id: uid(), ...v, correct: num(v.correct), wrong: num(v.wrong), blank: num(v.blank), minutes: num(v.minutes) });
        save();
        closeModal();
        render();
        toast("تحلیل تست ثبت شد");
      };
    }
  });
  document.addEventListener("change", (e) => {
    let t = e.target;
    if (t.matches("[data-topic-done]")) {
      let x = S.syllabus.find((z) => z.id === t.dataset.topicDone);
      x.done = t.checked;
      if (t.checked) x.status = "تسلط";
      else if (x.status === "تسلط") x.status = "درحال مطالعه";
      save();
      render();
    }
    if (t.matches("[data-topic-status]")) {
      let x = S.syllabus.find((z) => z.id === t.dataset.topicStatus);
      x.status = t.value;
      x.done = t.value === "تسلط";
      save();
      render();
    }
    if (t.matches("[data-topic-filter]")) {
    }
  });
  document.addEventListener("click", (e) => {
    let b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.topicDel) {
      S.syllabus = S.syllabus.filter((x) => x.id !== b.dataset.topicDel);
      save();
      render();
    }
    if (b.dataset.weekDel) {
      S.weekPlan = S.weekPlan.filter((x) => x.id !== b.dataset.weekDel);
      save();
      render();
    }
    if (b.dataset.weekDone) {
      let x = S.weekPlan.find((z) => z.id === b.dataset.weekDone);
      x.done = !x.done;
      save();
      render();
    }
    if (b.dataset.testDel) {
      S.testLogs = S.testLogs.filter((x) => x.id !== b.dataset.testDel);
      save();
      render();
    }
  });
  document.body.dataset.theme = ["gold", "silver", "hacker", "light"].includes(S.settings.theme) ? S.settings.theme : "gold";
  document.body.classList.toggle("light", document.body.dataset.theme === "light");
  initMPBStorage();
  document.addEventListener("change", (e) => {
    if (e.target.id === "syllabusSubject") {
      let v = e.target.value;
      $("#topicList").innerHTML = syllabusMarkup(v === "all" ? S.syllabus : S.syllabus.filter((x) => x.subject === v));
    }
  });
let mpbDB = null;
function openMPBDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      resolve(null);
      return;
    }
    let req = indexedDB.open("MPB_DATABASE", 1);
    req.onupgradeneeded = () => {
      let db = req.result;
      if (!db.objectStoreNames.contains("state")) db.createObjectStore("state");
    };
    req.onsuccess = () => {
      mpbDB = req.result;
      resolve(mpbDB);
    };
    req.onerror = () => reject(req.error);
  });
}
function idbGet() {
  return new Promise((resolve) => {
    if (!mpbDB) {
      resolve(null);
      return;
    }
    try {
      let tx = mpbDB.transaction("state", "readonly"), r = tx.objectStore("state").get("main");
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
function persistIDB() {
  if (!mpbDB) return;
  try {
    let tx = mpbDB.transaction("state", "readwrite");
    tx.objectStore("state").put({ updatedAt: Date.now(), state: S }, "main");
  } catch (e) {
    console.warn("IndexedDB write failed", e);
  }
}
async function initMPBStorage() {
  try {
    await openMPBDB();
    let dbRecord = await idbGet(), localAt = num(localStorage.getItem("mpb_ultimate_updated"));
    if (dbRecord?.state && num(dbRecord.updatedAt) > localAt) {
      S = { ...structuredClone(defaultState), ...dbRecord.state, settings: { ...defaultState.settings, ...dbRecord.state.settings || {} }, plannerPrefs: { ...defaultState.plannerPrefs, ...dbRecord.state.plannerPrefs || {} } };
      try {
        localStorage.setItem("mpb_ultimate", JSON.stringify(S));
        localStorage.setItem("mpb_ultimate_updated", String(dbRecord.updatedAt));
      } catch {
      }
    } else if (mpbDB) persistIDB();
  } catch (e) {
    console.warn("IndexedDB unavailable; using localStorage", e);
  }
  ;
  setTimer("focus");
  render();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch((e) => console.warn("SW registration failed", e));
  }
}
function notifyDueTasks() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  let due = S.tasks.filter((t) => !t.done && t.date === today());
  if (due.length) new Notification("MPB · برنامه امروز", { body: `${due.length} وظیفه برای امروز داری.` });
}
let lastReminderDay = "";
setInterval(() => {
  if (document.visibilityState !== "visible" || !("Notification" in window) || Notification.permission !== "granted") return;
  let day = today();
  if (day !== lastReminderDay) {
    lastReminderDay = day;
    notifyDueTasks();
  }
}, 6e4);

/* ===== MPB PLUS v8 ===== */
(function () {
  const fa = n => Number(n).toLocaleString('fa-IR');
  const baseRender = render;
  render = function () { baseRender(); plusDashboard(); };

  function plusDashboard() {
    if (page !== 'dashboard') return;
    const host = $('#pageContent'); if (!host) return;
    const ex = S.settings.examDate, T = today();
    const days = ex ? Math.round((new Date(ex + 'T00:00') - new Date(T + 'T00:00')) / 864e5) : null;
    const target = Math.round((num(S.settings.weeklyTarget) || 25) * 60 / 7), done = minutesToday();
    const pct = Math.min(100, Math.round(done / target * 100));
    const top = S.tasks.filter(t => !t.done).sort((a, b) => (a.date || '9') < (b.date || '9') ? -1 : 1).slice(0, 3);
    const mins = {}; S.study.forEach(x => mins[x.date] = (mins[x.date] || 0) + num(x.minutes));
    const now = new Date(), sat = new Date(now); sat.setDate(now.getDate() - ((now.getDay() + 1) % 7) - 15 * 7);
    let heat = '';
    for (let i = 0; i < 112; i++) {
      const d = new Date(sat); d.setDate(sat.getDate() + i);
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const m = mins[k] || 0, l = m ? (m < 30 ? 1 : m < 90 ? 2 : m < 180 ? 3 : 4) : 0;
      heat += `<i class="${k > T ? 'off' : 'l' + l}" title="${k} · ${m} دقیقه"></i>`;
    }
    const head = days === null ? 'تاریخ کنکورت را ثبت کن' : days > 0 ? `${fa(days)} روز تا کنکور` : days === 0 ? 'امروز روز آزمون است' : 'آزمون برگزار شده';
    host.insertAdjacentHTML('afterbegin', `<section class="mission"><div><small>ماموریت امروز</small><h2>${head}</h2>
      <label>تاریخ کنکور <input type="date" id="examDate" value="${ex || ''}"></label></div>
      <div class="m-ring" style="--p:${pct}" role="img" aria-label="پیشرفت مطالعه امروز"><div><b>${fa(pct)}٪</b><span>هدف امروز</span></div></div>
      <ul class="m-top">${top.length ? top.map(t => `<li>${esc(t.title)}<small class="muted">${esc(t.category || 'عمومی')} · ${fmtDate(t.date)}</small></li>`).join('') : '<li class="muted">وظیفه‌ی بازی نداری. یک هدف برای امروز بساز.</li>'}</ul></section>
      <section class="panel" style="margin-bottom:16px"><div class="panel-head"><h3>نقشه‌ی مطالعه · ۱۶ هفته اخیر</h3></div><div class="heat">${heat}</div></section>`);
    $('#examDate').onchange = e => { S.settings.examDate = e.target.value; save(); render(); };
  }

  const pal = document.createElement('div');
  pal.id = 'pal'; pal.hidden = true;
  pal.innerHTML = '<div class="pal-box"><input id="palq" placeholder="برو به… (مثلاً مطالعه، آزمون)" autocomplete="off"><ul id="pall"></ul></div>';
  document.body.append(pal);
  let sel = 0, items = [];
  const palPaint = () => {
    const q = $('#palq').value.trim();
    items = Object.entries(titles).filter(([k, v]) => !q || v.includes(q) || k.includes(q.toLowerCase())).slice(0, 8);
    sel = Math.max(0, Math.min(sel, items.length - 1));
    $('#pall').innerHTML = items.map(([k, v], i) => `<li class="${i === sel ? 'on' : ''}" data-k="${k}">${v}</li>`).join('') || '<li class="muted">موردی پیدا نشد</li>';
  };
  const palOpen = o => { pal.hidden = !o; if (o) { $('#palq').value = ''; sel = 0; palPaint(); $('#palq').focus(); } };
  const go = k => { palOpen(false); if (k) setPage(k); };
  $('#palq').oninput = () => { sel = 0; palPaint(); };
  pal.onclick = e => { if (e.target === pal) palOpen(false); const li = e.target.closest('li[data-k]'); if (li) go(li.dataset.k); };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palOpen(pal.hidden); return; }
    if (pal.hidden) return;
    if (e.key === 'Escape') palOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); palPaint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); palPaint(); }
    else if (e.key === 'Enter' && items[sel]) go(items[sel][0]);
  });
  const btn = document.createElement('button');
  btn.className = 'icon-btn'; btn.id = 'palBtn'; btn.title = 'جست‌وجوی سریع (Ctrl+K)'; btn.textContent = '⌕';
  btn.onclick = () => palOpen(true);
  $('#quickAdd').before(btn);
  render();
})();