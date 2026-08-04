/* ============================= لوحة الإدارة ============================= */
/*
  زر الإدارة يظهر للجميع، لكنه لا يفتح شيئاً بلا حساب إدارة.
  الحماية الحقيقية في قاعدة البيانات: سياسة `projects_write_admin`
  تشترط `is_admin()`، فأي محاولة إضافة أو تعديل من غير إدمن تُرفض
  في الخادم — إخفاء الزر تجميل، لا حماية.
*/

let isAdmin = false;
let editingId = null;

const AI_KEY_STORE = 'raja_hub_ai_key';

/* ------------------------------ إشعارات ------------------------------ */

function toast(msg, kind = 'info') {
  const box = document.getElementById('toasts');
  if (!box) return alert(msg);
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3600);
}

/* ------------------------------ فتح/إغلاق ------------------------------ */

function openAdmin() {
  document.getElementById('adminModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (isAdmin) showPanel(); else showLogin();
}

function closeAdmin() {
  document.getElementById('adminModal').classList.remove('open');
  document.body.style.overflow = '';
}

function showLogin() {
  document.getElementById('adminLogin').hidden = false;
  document.getElementById('adminPanel').hidden = true;
}

function showPanel() {
  document.getElementById('adminLogin').hidden = true;
  document.getElementById('adminPanel').hidden = false;
  renderAdminList();

  // بلا جدول لا معنى لزر الإضافة: الحفظ سيفشل حتماً
  const newBtn = document.getElementById('newBtn');
  newBtn.disabled = tableMissing;
  newBtn.title = tableMissing ? 'شغّل supabase-projects.sql أولاً' : '';

  document.getElementById('aiKeyState').textContent =
    localStorage.getItem(AI_KEY_STORE) ? '✅ محفوظ في هذا الجهاز' : '— غير محفوظ';
}

/* ------------------------------ الدخول ------------------------------ */

async function adminLogin(e) {
  e?.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const pass = document.getElementById('adminPass').value;
  const btn = document.getElementById('loginBtn');

  if (!email || !pass) return toast('اكتب البريد وكلمة المرور', 'error');
  if (!supa) return toast('تعذّر الاتصال بقاعدة البيانات', 'error');

  btn.disabled = true; btn.textContent = 'جاري الدخول…';
  try {
    const { error } = await supa.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;

    // ⚠️ الدخول وحده لا يكفي: أي حساب لاعب في تحدي رجا يقدر يسجّل دخوله
    // بنفس المشروع. الصفة تُقرأ من `is_admin()` في قاعدة البيانات.
    const { data: adminOk, error: adminErr } = await supa.rpc('is_admin');
    if (adminErr) throw adminErr;

    if (adminOk !== true) {
      await supa.auth.signOut();
      toast('هذا الحساب ليس حساب إدارة', 'error');
      return;
    }

    isAdmin = true;
    document.getElementById('adminPass').value = '';
    toast('أهلاً 👋');
    await reloadForAdmin();
    showPanel();
  } catch (err) {
    toast(`تعذّر الدخول: ${err.message}`, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'دخول';
  }
}

async function adminLogout() {
  await supa?.auth.signOut();
  isAdmin = false;
  toast('خرجت من لوحة الإدارة');
  closeAdmin();
  loadProjects();
}

/*
  الإدمن يرى المخفي أيضاً — سياسة القراءة الثانية تسمح له بذلك.

  ⚠️ الخطأ يُعرض ولا يُبتلع: قبلها كانت الدالة تتجاهل `error` بصمت، فإن
  لم يكن الجدول منشأً بعد فتحت اللوحة **وبدت سليمة** وهي تعرض النسخة
  الاحتياطية من الكود — بلا معرّفات، فالتعديل والحذف لا يفعلان شيئاً
  والحفظ يفشل. مستخدم في هذه الحالة يظنّ العطل في زر الإدارة.
*/
let tableMissing = false;

async function reloadForAdmin() {
  const { data, error } = await supa.from('projects').select('*').order('sort_order');

  if (error) {
    tableMissing = /schema cache|does not exist|relation/i.test(error.message);
    return false;
  }

  tableMissing = false;
  if (Array.isArray(data)) { PROJECTS = data; renderProjects(); }
  return true;
}

/* ------------------------------ القائمة ------------------------------ */

function renderAdminList() {
  const box = document.getElementById('adminList');

  // الجدول غير منشأ: نقول السبب والحلّ صراحةً بدل عرض قائمة لا تعمل
  if (tableMissing) {
    box.innerHTML = `
      <div class="notice">
        <strong>جدول المشاريع غير موجود بعد.</strong>
        شغّل <code>supabase-projects.sql</code> على مشروع Supabase، ثم حدّث الصفحة.
        <br>حتى ذلك الحين تُعرض للزوّار النسخة المحفوظة في الكود، ولا يمكن
        الإضافة ولا التعديل من هنا.
      </div>`;
    return;
  }

  if (!PROJECTS.length) { box.innerHTML = '<p class="empty">ما فيه مشاريع.</p>'; return; }

  box.innerHTML = PROJECTS.map(p => `
    <div class="arow">
      <span class="adot" style="background:${esc(p.accent || '#D4AF37')}"></span>
      <div class="arow-main">
        <strong>${esc(p.name)}</strong>
        <small>${esc(p.tagline || p.url)}</small>
      </div>
      <span class="astatus astatus-${esc(p.status || 'live')}">${statusLabel(p.status)}</span>
      <button class="mini" data-edit="${esc(p.id)}">تعديل</button>
      <button class="mini mini-danger" data-del="${esc(p.id)}">حذف</button>
    </div>`).join('');

  box.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => editProject(b.dataset.edit)));
  box.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteProject(b.dataset.del)));
}

function statusLabel(s) {
  return s === 'wip' ? 'قيد التطوير' : s === 'hidden' ? 'مخفي' : 'يشتغل';
}

/* ------------------------------ النموذج ------------------------------ */

function newProject() {
  editingId = null;
  fillForm({ accent: '#D4AF37', emoji: '🎮', status: 'live', sort_order: PROJECTS.length + 1 });
  document.getElementById('formTitle').textContent = 'مشروع جديد';
  document.getElementById('adminForm').hidden = false;
  document.getElementById('pName').focus();
}

function editProject(id) {
  const p = PROJECTS.find(x => String(x.id) === String(id));
  if (!p) return;
  editingId = p.id;
  fillForm(p);
  document.getElementById('formTitle').textContent = `تعديل: ${p.name}`;
  document.getElementById('adminForm').hidden = false;
}

function fillForm(p) {
  const v = (id, val) => { document.getElementById(id).value = val ?? ''; };
  v('pName', p.name); v('pTagline', p.tagline); v('pDesc', p.description);
  v('pUrl', p.url); v('pImage', p.image); v('pEmoji', p.emoji || '🎮');
  v('pAccent', p.accent || '#D4AF37'); v('pStatus', p.status || 'live');
  v('pTags', Array.isArray(p.tags) ? p.tags.join('، ') : '');
  v('pOrder', p.sort_order ?? 0);
}

function cancelForm() {
  document.getElementById('adminForm').hidden = true;
  editingId = null;
}

async function saveProject(e) {
  e?.preventDefault();
  const g = id => document.getElementById(id).value.trim();

  const row = {
    name: g('pName'),
    tagline: g('pTagline') || null,
    description: g('pDesc') || null,
    url: g('pUrl'),
    image: g('pImage') || null,
    emoji: g('pEmoji') || '🎮',
    accent: g('pAccent') || '#D4AF37',
    status: g('pStatus') || 'live',
    // الوسوم تُكتب مفصولة بفاصلة عربية أو لاتينية — كلاهما مقبول
    tags: g('pTags') ? g('pTags').split(/[،,]/).map(s => s.trim()).filter(Boolean) : [],
    sort_order: parseInt(g('pOrder'), 10) || 0
  };

  if (!row.name || !row.url) return toast('الاسم والرابط مطلوبان', 'error');
  if (safeUrl(row.url) === '#') return toast('الرابط لازم يبدأ بـ https:// أو يكون مساراً نسبياً', 'error');

  const btn = document.getElementById('saveBtn');
  btn.disabled = true; btn.textContent = 'جاري الحفظ…';
  try {
    const q = editingId
      ? supa.from('projects').update(row).eq('id', editingId)
      : supa.from('projects').insert(row);
    const { error } = await q;
    if (error) throw error;

    toast(editingId ? 'تم التعديل ✅' : 'تمت الإضافة ✅', 'success');
    cancelForm();
    await reloadForAdmin();
    renderAdminList();
  } catch (err) {
    toast(`تعذّر الحفظ: ${err.message}`, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'حفظ';
  }
}

async function deleteProject(id) {
  const p = PROJECTS.find(x => String(x.id) === String(id));
  if (!p) return;
  if (!confirm(`حذف «${p.name}» نهائياً؟`)) return;

  try {
    const { error } = await supa.from('projects').delete().eq('id', id);
    if (error) throw error;
    toast('حُذف', 'success');
    await reloadForAdmin();
    renderAdminList();
  } catch (err) {
    toast(`تعذّر الحذف: ${err.message}`, 'error');
  }
}

/* ========================= توليد الوصف بالذكاء الاصطناعي ========================= */
/*
  ⚠️ **المفتاح يبقى في جهازك وحده** — localStorage، ولا يدخل المستودع
  ولا يصل أي زائر. لهذا لا يعمل الزر إلا على الجهاز الذي لصقت فيه
  المفتاح، وهذا مقصود: البديل (مفتاح داخل صفحة منشورة) يقرأه أي أحد
  ويستنزف رصيدك.

  ⚠️ و`anthropic-dangerous-direct-browser-access` ضروري: بدونه يرفض
  المتصفح النداء (CORS). اسمه صريح لأن الخطر حقيقي — النداء من المتصفح
  يعني أن المفتاح موجود في المتصفح. مقبول هنا لأن المستعمِل أنت وحدك
  على جهازك.

  📌 النداء كله خلف هذه الدالة: لو أردت لاحقاً نقله إلى Supabase Edge
  Function (فيبقى المفتاح في الخادم ويعمل الزر من أي جهاز) فالتغيير
  محصور هنا.
*/

function saveAiKey() {
  const k = document.getElementById('aiKey').value.trim();
  if (!k) {
    localStorage.removeItem(AI_KEY_STORE);
    document.getElementById('aiKeyState').textContent = '— غير محفوظ';
    return toast('حُذف المفتاح من هذا الجهاز');
  }
  localStorage.setItem(AI_KEY_STORE, k);
  document.getElementById('aiKey').value = '';
  document.getElementById('aiKeyState').textContent = '✅ محفوظ في هذا الجهاز';
  toast('حُفظ المفتاح في هذا الجهاز فقط', 'success');
}

async function generateDescription() {
  const key = localStorage.getItem(AI_KEY_STORE);
  if (!key) return toast('الصق مفتاح Claude API أولاً (في أسفل اللوحة)', 'error');

  const name = document.getElementById('pName').value.trim();
  const tagline = document.getElementById('pTagline').value.trim();
  const url = document.getElementById('pUrl').value.trim();
  const tags = document.getElementById('pTags').value.trim();
  const hint = document.getElementById('pDesc').value.trim();

  if (!name) return toast('اكتب اسم المشروع أولاً', 'error');

  const btn = document.getElementById('aiBtn');
  btn.disabled = true; btn.textContent = '✨ يكتب…';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-opus-5',
        max_tokens: 400,
        // مهمة قصيرة: جهد منخفض أسرع وأرخص وبلا فرق ملموس هنا
        output_config: { effort: 'low' },
        system: 'أنت تكتب أوصاف مشاريع لبوابة شخصية عربية. اكتب فقرة واحدة بالعربية الفصحى المبسّطة، من جملتين إلى ثلاث، تصف ما يفعله المشروع ولمن هو. بلا عناوين، بلا نقاط، بلا مبالغة تسويقية، وبلا كلمات مثل «ثوري» و«الأفضل». ابدأ بالوصف مباشرة — لا تقل «هذا مشروع» ولا تكرّر الاسم في أول كلمة. أعِد الفقرة وحدها بلا أي مقدمة أو تعليق.',
        messages: [{
          role: 'user',
          content:
            `اسم المشروع: ${name}\n` +
            (tagline ? `السطر التعريفي: ${tagline}\n` : '') +
            (url ? `الرابط: ${url}\n` : '') +
            (tags ? `الوسوم: ${tags}\n` : '') +
            (hint ? `\nملاحظات مني عن المشروع (اعتمد عليها):\n${hint}` : '')
        }]
      })
    });

    if (!res.ok) {
      const body = await res.text();
      // 401 = مفتاح خاطئ، 400 = طلب معطوب، 429 = تجاوزت الحد
      throw new Error(`${res.status} — ${body.slice(0, 200)}`);
    }

    const data = await res.json();

    // ⚠️ الفحص قبل القراءة: المصنّفات قد ترفض الطلب فيرجع 200 و
    // stop_reason = refusal بمحتوى فارغ — وقراءة content[0] مباشرةً تنهار
    if (data.stop_reason === 'refusal') {
      throw new Error('رُفض الطلب من مصنّفات السلامة');
    }

    const text = (data.content || [])
      .filter(b => b.type === 'text').map(b => b.text).join('').trim();

    if (!text) throw new Error('رجع رد فارغ');

    document.getElementById('pDesc').value = text;
    toast('كُتب الوصف ✨ — عدّله زي ما تبي', 'success');
  } catch (err) {
    toast(`تعذّر التوليد: ${err.message}`, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '✨ اكتب الوصف';
  }
}

/* ------------------------------ الربط ------------------------------ */

function initAdmin() {
  document.getElementById('adminBtn')?.addEventListener('click', openAdmin);
  document.getElementById('adminClose')?.addEventListener('click', closeAdmin);
  document.getElementById('loginForm')?.addEventListener('submit', adminLogin);
  document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);
  document.getElementById('newBtn')?.addEventListener('click', newProject);
  document.getElementById('projectForm')?.addEventListener('submit', saveProject);
  document.getElementById('cancelBtn')?.addEventListener('click', cancelForm);
  document.getElementById('aiBtn')?.addEventListener('click', generateDescription);
  document.getElementById('aiKeySave')?.addEventListener('click', saveAiKey);

  // النقر خارج الصندوق أو Escape يغلق
  document.getElementById('adminModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'adminModal') closeAdmin();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAdmin();
  });

  // جلسة محفوظة؟ نتحقق من الصفة بهدوء بلا مطالبة بالدخول
  restoreAdminSession();
}

async function restoreAdminSession() {
  if (!supa) return;
  try {
    // ⚠️ getSession لا getUser: الأولى قراءة محلية بلا شبكة، فلا تتعثّر
    // لحظة الفتح ولا تُخرجك بلا سبب (نفس درس البند 16 في تحدي رجا)
    const { data: { session } } = await supa.auth.getSession();
    if (!session) return;
    const { data: ok } = await supa.rpc('is_admin');
    if (ok === true) {
      isAdmin = true;
      document.getElementById('adminBtn')?.classList.add('is-admin');
      // ⚠️ await: `showPanel` تقرأ `tableMissing`، ولو فُتحت اللوحة قبل
      // انتهاء هذا النداء لقرأتها قديمة فأظهرت قائمة لا تعمل
      await reloadForAdmin();
    }
  } catch (_) { /* لا يضرّ الزائر: يبقى وضع القراءة */ }
}
