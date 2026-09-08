-- ============================================================================
--  بوابة رجا — جدول المشاريع
-- ============================================================================
--
--  شغّله على **نفس مشروع Supabase** الذي تستعمله تحدي رجا
--  (rqcltlleqpppeywxbkpo) — فحساب الإدارة ودالة is_admin() موجودان هناك،
--  ولا داعي لإنشاء مشروع ثانٍ ولا لحساب ثانٍ.
--
--  ⚠️ شغّل كل دفعة وحدها (محرر Supabase ينفّذ اللصقة كمعاملة واحدة،
--  فخطأ في أمر واحد يُلغي كل شيء بصمت).
--
-- ============================================================================


-- ======================== الدفعة 1: الجدول ========================

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  tagline     TEXT,                       -- سطر واحد تحت الاسم
  description TEXT,                       -- الوصف (يولّده الذكاء الاصطناعي أو تكتبه)
  url         TEXT NOT NULL,
  image       TEXT,                       -- مسار نسبي أو data URL
  emoji       TEXT DEFAULT '🎮',          -- بديل الصورة إن لم توجد
  accent      TEXT DEFAULT '#D4AF37',     -- لون هوية المشروع
  status      TEXT DEFAULT 'live',        -- live | wip | hidden
  tags        JSONB DEFAULT '[]',         -- ["أونلاين","عربي"]
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_order ON projects(sort_order, created_at DESC);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;


-- ======================== الدفعة 2: السياسات ========================
--
-- القراءة عامة (الزوّار يشوفون البوابة بلا حساب) لكن **المخفي لا يُقرأ**.
-- ⚠️ الشرط في السياسة نفسها لا في الكود: لو كان في الكود وحده لصار
-- `status='hidden'` مجرّد إخفاء بصري يكشفه أي أحد من أدوات المطوّر.
--
-- والكتابة للإدارة وحدها عبر is_admin() — نفس الدالة التي تحرس
-- game_settings في تحدي رجا، مفروضة في قاعدة البيانات لا في المتصفح.

DROP POLICY IF EXISTS "projects_read_public"  ON projects;
DROP POLICY IF EXISTS "projects_read_admin"   ON projects;
DROP POLICY IF EXISTS "projects_write_admin"  ON projects;

CREATE POLICY "projects_read_public" ON projects
  FOR SELECT TO anon, authenticated
  USING (status <> 'hidden');

-- الإدارة تقرأ المخفي أيضاً (لتعديله وإظهاره من اللوحة)
CREATE POLICY "projects_read_admin" ON projects
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "projects_write_admin" ON projects
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ======================== الدفعة 3: تحديث الطابع الزمني ========================

CREATE OR REPLACE FUNCTION public.touch_projects_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_projects_updated_at();


-- ======================== الدفعة 4: المشروعان ========================
--
-- ⚠️ الإدراج من هنا لا من المتصفح: السياسة تشترط is_admin()، ومحرّر
-- Supabase يعمل بصلاحية المالك فيتجاوزها. لو حاولت إضافتهما من اللوحة
-- قبل تسجيل الدخول بحساب الإدارة لرُفض الإدراج.

INSERT INTO projects (name, tagline, description, url, image, emoji, accent, status, tags, sort_order)
VALUES
  (
    'تحدي رجا',
    'لعبة أسئلة جماعية بفريقين',
    'لوحة من ست فئات وثلاثة مستويات، فريقان يتنافسان على النقاط. تُلعب على جهاز واحد أو أونلاين بروم بكود من ستّ خانات، والحالة تتزامن لحظياً على كل الأجهزة. فيها بنك أسئلة عربي كبير، ووسائل مساعدة، ومؤقّت، وشات، وحسابات لاعبين بإحصاءات.',
    'https://rajaxdx.github.io/raja-challenge/',
    'assets/raja-challenge.png',
    '🎯',
    '#D4AF37',
    'live',
    '["أونلاين","فريقان","عربي"]'::jsonb,
    1
  ),
  (
    'حروف مع رجا',
    'لعبة حروف على خلية سداسية',
    'خلية سداسية من الحروف العربية، وفريقان يتسابقان على وصل طرف باللوحة بطرفها الآخر. تُلعب على جهاز واحد بلا إنترنت ولا حساب — تفتحها وتلعب.',
    'https://rajaxdx.github.io/huroof-raja/',
    'assets/huroof-raja.png',
    '🔤',
    '#86EFAC',
    'live',
    '["محلي","فريقان","عربي"]'::jsonb,
    2
  )
ON CONFLICT DO NOTHING;


-- ======================== الدفعة 5: التحقق ========================
-- المتوقّع: صفّان، وثلاث سياسات.

SELECT name, status, sort_order FROM projects ORDER BY sort_order;

SELECT policyname, cmd, roles FROM pg_policies
WHERE tablename = 'projects' ORDER BY policyname;


-- ==================== إضافة لاحقة: «فكّها» ====================
--
-- المشاريع التي تُضاف بعد الإعداد الأول تدخل عادةً من لوحة الإدارة في
-- الموقع، وهذا الإدراج هنا للحالتين اللتين لا تكفي فيهما اللوحة:
-- إعادة بناء قاعدة البيانات من الصفر، أو إضافةٌ بلا تسجيل دخول.
-- شغّله من محرّر Supabase (يعمل بصلاحية المالك فيتجاوز is_admin()).
--
-- ⚠️ عدّل معه FALLBACK_PROJECTS في js/config.js — النسختان يجب أن
-- تتطابقا، وإلا اختلفت البوابة عن نفسها لحظة تعطّل قاعدة البيانات.

INSERT INTO projects (name, tagline, description, url, image, emoji, accent, status, tags, sort_order)
VALUES
  (
    'فكّها',
    'لعبة كلمات فردية بمئة مستوى',
    'كلمة مخفية ولوحة حروف: الحرف الصحيح يظهر في كل مواضعه، والخاطئ يأكل محاولة. مئة مستوى تتصاعد صعوبتها كلمةً ومحاولاتٍ، ولكل مستوى خمس نقاط وثلاثة تلميحات — وكل تلميح يحسم نقطة، فمن أخذها كلها بقيت له نقطتان. تُلعب على جهاز واحد بلا إنترنت ولا حساب، والتقدّم محفوظ في المتصفح.',
    'https://rajaxdx.github.io/fakkaha-raja/',
    'assets/fakkaha-raja.png',
    '🔓',
    '#3FE0B0',
    'live',
    '["فردي","محلي","عربي"]'::jsonb,
    4
  )
ON CONFLICT DO NOTHING;

