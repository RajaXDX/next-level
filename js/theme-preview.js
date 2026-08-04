/* ===================== مبدّل الأطقم — مؤقّت ===================== */
/*
  ⚠️ **ملف مؤقّت للاختيار فقط.** بعد ما تستقرّ على طقم:
     1. احذف هذا الملف
     2. احذف وسم <script> الخاص به من index.html
     3. انقل قيم الطقم المختار إلى `:root` في css/style.css
        (أو خلّ `body[data-theme="..."]` واضبطها في وسم <body>)

  لا تنشره كما هو: زائر يقلّب ألوان بوابتك ليس ميزة، والاختيار
  يُحفظ في متصفّحه فيرى نسخة غير التي تريدها.
*/

const THEMES = [
  { id: 'najdi',      label: 'نجدي: أخضر + ذهب',        bg: '#0A1A14', dot: '#D4AF37' },
  { id: 'night-blue', label: 'ليل أزرق + سماوي',        bg: '#0B1220', dot: '#38BDF8' },
  { id: 'amber',      label: 'فحمي + كهرماني',          bg: '#0D0D0F', dot: '#FF8A3D' },
  { id: 'violet',     label: 'بنفسجي عميق + وردي',      bg: '#140A24', dot: '#C084FC' },
  { id: 'light',      label: 'فاتح: رملي + أخضر داكن',  bg: '#F5F1E8', dot: '#1B4D3E' }
];

const THEME_KEY = 'raja_hub_theme_preview';

function applyTheme(id) {
  document.body.dataset.theme = id;
  localStorage.setItem(THEME_KEY, id);
  document.querySelectorAll('.theme-swatch').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.theme === id)));

  // شريط المتصفح على الجوال يتبع الطقم أيضاً
  const t = THEMES.find(x => x.id === id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t?.bg || '#0A1A14');
}

function buildThemeSwitch() {
  const box = document.createElement('div');
  box.className = 'theme-switch';
  box.innerHTML = '<b>جرّب:</b>';

  THEMES.forEach(t => {
    const b = document.createElement('button');
    b.className = 'theme-swatch';
    b.dataset.theme = t.id;
    b.title = t.label;
    b.setAttribute('aria-label', t.label);
    b.setAttribute('aria-pressed', 'false');
    // نصف الزر خلفية والنصف الآخر اللون المميّز — تشوف الطقم بلا ما تجرّبه
    b.style.background = `linear-gradient(135deg, ${t.bg} 50%, ${t.dot} 50%)`;
    b.addEventListener('click', () => applyTheme(t.id));
    box.appendChild(b);
  });

  document.body.appendChild(box);
  applyTheme(localStorage.getItem(THEME_KEY) || 'najdi');
}

document.addEventListener('DOMContentLoaded', buildThemeSwitch);
