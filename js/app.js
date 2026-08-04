/* ============================= البوابة ============================= */

let PROJECTS = [];

/* ------------------------------ أدوات ------------------------------ */

// كل نص يأتي من قاعدة البيانات يمرّ من هنا قبل أن يدخل innerHTML.
// الوصف يكتبه الذكاء الاصطناعي والاسم تكتبه أنت — ومع ذلك يُهرَّب:
// المصدر ليس ضماناً، والحقل قد يُعدَّل من مكان آخر يوماً.
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/*
  الرابط يُفحص قبل وضعه في href.

  ⚠️ `javascript:` في href يُنفَّذ عند النقر. الحقل يكتبه صاحب الموقع،
  لكن رابطاً واحداً معطوباً — بلصق خاطئ أو بحقل يُعدَّل من مكان آخر —
  يكفي. المسموح: http/https والمسارات النسبية.
*/
function safeUrl(u) {
  const s = String(u ?? '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[.\/]/.test(s) && !/^\/\//.test(s)) return s;   // نسبي، وليس //host
  return '#';
}

function isExternal(u) {
  return /^https?:\/\//i.test(String(u || ''));
}

/*
  لون النص فوق لون المشروع — يُحسب، لا يُثبَّت.

  ⚠️ زر البطاقة خلفيته لون المشروع، واللون يختاره صاحب الموقع من منتقي
  ألوان حرّ في اللوحة. نصّ داكن ثابت يقرأ جيداً على الذهبي والنعناعي
  الحاليين، ويختفي تماماً أول ما يُختار لون داكن (كحلي، عنّابي) — والعطل
  لا يظهر إلا بعد إضافة المشروع ونشره.

  ⚠️ **نقارن التباين الفعلي، ولا نقارن الإضاءة بعتبة.** جرّبت العتبة
  أولاً (`L > 0.45 ? داكن : فاتح`) فوقع ذهب تحدي رجا `#D4AF37` عليها
  بالضبط — إضاءته 0.453 — فاختار **الأبيض بتباين 2.1:1**، أي زر لا
  يُقرأ في الصفحة الرئيسية. أي عتبة تختارها يقع عليها لون ما؛ وحساب
  النسبتين واختيار الأعلى صحيح عند كل نقطة بلا معايرة.
*/
function relLuminance(hex) {
  const v = /^#([0-9a-f]{6})$/i.exec(hex)[1];
  const lin = i => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
}

function onColor(hex) {
  const clean = String(hex || '').trim();
  if (!/^#[0-9a-f]{6}$/i.test(clean)) return '#12100E';   // لون غير مفهوم → داكن

  const bg = relLuminance(clean);
  const contrast = (a, b) => {
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  };

  const DARK = '#12100E', LIGHT = '#FFFFFF';
  return contrast(bg, relLuminance(DARK)) >= contrast(bg, relLuminance(LIGHT)) ? DARK : LIGHT;
}

/* ------------------------------ التحميل ------------------------------ */

async function loadProjects() {
  const grid = document.getElementById('grid');

  if (supa) {
    try {
      const { data, error } = await withTimeout(
        supa.from('projects').select('*').order('sort_order', { ascending: true }),
        8000
      );
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        PROJECTS = data;
        renderProjects();
        return;
      }
    } catch (e) {
      console.warn('تعذّر جلب المشاريع من السحابة، نعرض النسخة المحلية:', e.message);
    }
  }

  // السحابة غير متاحة أو فارغة → النسخة المحفوظة في الكود
  PROJECTS = FALLBACK_PROJECTS;
  renderProjects();
}

/*
  ⚠️ مهلة صريحة على نداء الشبكة: نداءات Supabase بلا مهلة افتراضية،
  فتعثّر رحلة واحدة يترك الوعد معلّقاً للأبد — والزائر يبقى أمام
  هيكل تحميل لا يتحرّك بلا رسالة خطأ. (نفس الفخّ الذي وقع في تحدي رجا.)
*/
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

/* ------------------------------ العرض ------------------------------ */

function renderProjects() {
  const grid = document.getElementById('grid');
  const visible = PROJECTS.filter(p => p.status !== 'hidden');

  if (!visible.length) {
    grid.innerHTML = '<p class="empty">ما فيه مشاريع معروضة بعد.</p>';
    updateCount(0);
    return;
  }

  grid.innerHTML = visible.map(cardHtml).join('');
  updateCount(visible.length);

  // كشف البطاقات عند التمرير — تُعطَّل لمن يطلب تقليل الحركة
  revealOnScroll();
}

function cardHtml(p) {
  const accent = /^#[0-9a-f]{3,8}$/i.test(p.accent || '') ? p.accent : '#D4AF37';
  const url = safeUrl(p.url);
  const wip = p.status === 'wip';
  const tags = Array.isArray(p.tags) ? p.tags : [];

  const visual = p.image
    ? `<img src="${esc(p.image)}" alt="" class="card-logo" loading="lazy">`
    : `<span class="card-emoji">${esc(p.emoji || '🎮')}</span>`;

  return `
    <article class="card${wip ? ' is-wip' : ''}" style="--accent:${esc(accent)};--on-accent:${esc(onColor(accent))}">
      <div class="card-top">
        <div class="card-visual">${visual}</div>
        ${wip ? '<span class="badge">قيد التطوير</span>' : '<span class="badge badge-live">تشتغل الآن</span>'}
      </div>

      <h3 class="card-name">${esc(p.name)}</h3>
      ${p.tagline ? `<p class="card-tagline">${esc(p.tagline)}</p>` : ''}
      ${p.description ? `<p class="card-desc">${esc(p.description)}</p>` : ''}

      ${tags.length ? `<ul class="card-tags">${tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}

      <a class="card-cta" href="${esc(url)}"${isExternal(url) ? ' target="_blank" rel="noopener noreferrer"' : ''}>
        ${wip ? 'شوف التقدّم' : 'العب الآن'}
        <span aria-hidden="true">←</span>
      </a>
    </article>`;
}

function updateCount(n) {
  const el = document.getElementById('projectCount');
  if (el) el.textContent = n;
}

/*
  الكشف عند التمرير.

  ⚠️ **البطاقات ظاهرة افتراضياً، والإخفاء يُضاف بجافاسكربت** — لا العكس.
  البديهي أن تبدأ شفافة في CSS ثم يُظهرها المراقب، لكن معناه أن أي تعثّر
  في المراقب يترك **البوابة كلها بيضاء**: لا بطاقات ولا رسالة خطأ. وهذا
  وقع فعلاً أثناء الاختبار — `IntersectionObserver` لم يُطلق نداءه أصلاً
  والصفحة بقيت فارغة رغم أن البطاقات مبنية وفي مجال الرؤية.
  الزينة لا يجوز أن تكون شرطاً لظهور المحتوى.

  و⚠️ مؤقّت أمان يكشف ما بقي بعد ثانية ونصف: يغطّي الحالات التي يُنشأ
  فيها المراقب ولا يُطلق نداءه (تبويب في الخلفية مثلاً).
*/
function revealOnScroll() {
  const cards = [...document.querySelectorAll('.card')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // من طلب تقليل الحركة، أو متصفّح بلا مراقب: تظهر كما هي بلا أي حركة
  if (reduce || !('IntersectionObserver' in window)) return;

  cards.forEach((c, i) => {
    c.classList.add('pre');
    c.style.transitionDelay = `${Math.min(i * 70, 350)}ms`;
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });

  cards.forEach(c => io.observe(c));

  setTimeout(() => {
    document.querySelectorAll('.card.pre').forEach(c => c.classList.remove('pre'));
  }, 1500);
}

/* ------------------------------ سنة الحقوق ------------------------------ */

function setYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ------------------------------ الإقلاع ------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  setYear();
  initSupabase();
  loadProjects();
  initAdmin?.();
});
