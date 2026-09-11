/* ============================= الإعدادات ============================= */

// نفس مشروع Supabase الذي تستعمله تحدي رجا — فحساب الإدارة ودالة
// is_admin() موجودان هناك، ولا حاجة لمشروع ثانٍ ولا لحساب ثانٍ.
//
// المفتاح `publishable` منشور عمداً وهذا طبيعي: الحماية في سياسات
// RLS لا في إخفاء المفتاح (راجع supabase-projects.sql).
const SUPABASE_URL = 'https://rqcltlleqpppeywxbkpo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wtm3EsnJl5CGa8or1egt1g_ZLj_qw6N';

let supa = null;

function initSupabase() {
  try {
    if (typeof supabase === 'undefined') return false;
    supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage }
    });
    return true;
  } catch (e) {
    console.error('Supabase init failed:', e);
    return false;
  }
}

/*
  نسخة احتياطية تُعرض إذا تعذّر الوصول لقاعدة البيانات.

  ⚠️ ليست تحسيناً تجميلياً: بدونها تصبح بوابتك صفحة فارغة لحظة تعطّل
  Supabase أو انقطاع الشبكة — وهي الصفحة التي تعطي رابطها للناس.
  المشروعان هنا مطابقان لما في الدفعة 4 من السكربت.
*/
const FALLBACK_PROJECTS = [
  {
    name: 'تحدي رجا',
    tagline: 'لعبة أسئلة جماعية بفريقين',
    description: 'لوحة من ست فئات وثلاثة مستويات، فريقان يتنافسان على النقاط. تُلعب على جهاز واحد أو أونلاين بروم بكود، والحالة تتزامن لحظياً على كل الأجهزة.',
    url: 'https://rajaxdx.github.io/raja-challenge/',
    image: 'assets/raja-challenge.png',
    emoji: '🎯',
    accent: '#D4AF37',
    status: 'live',
    tags: ['أونلاين', 'فريقان', 'عربي']
  },
  {
    name: 'حروف مع رجا',
    tagline: 'لعبة حروف على خلية سداسية',
    description: 'خلية سداسية من الحروف العربية، وفريقان يتسابقان على وصل طرف باللوحة بطرفها الآخر. بلا إنترنت ولا حساب — تفتحها وتلعب.',
    url: 'https://rajaxdx.github.io/huroof-raja/',
    image: 'assets/huroof-raja.png',
    emoji: '🔤',
    accent: '#86EFAC',
    status: 'live',
    tags: ['محلي', 'فريقان', 'عربي']
  },
  {
    name: 'توب تن',
    tagline: 'لعبة قوائم العشرة بين شخصين',
    description: 'كل سؤال قائمة من عشرة مرتّبة، ولاعبان يتناوبان على ذكر ما يعرفانه. النقاط برقم المركز — المركز العاشر يعطي عشر نقاط لأنه أصعب تذكّراً. أنشئ روم وأرسل الكود، وكل واحد يلعب من جواله.',
    url: 'https://rajaxdx.github.io/top-ten/',
    image: 'assets/top-ten.png',
    emoji: '🔟',
    accent: '#FBBF24',
    status: 'live',
    tags: ['أونلاين', 'شخصان', 'عربي']
  },
  {
    name: 'فكّها',
    tagline: 'لعبة كلمات فردية بمئة مستوى',
    description: 'كلمة مخفية ولوحة حروف: الحرف الصحيح يظهر في كل مواضعه، والخاطئ يأكل محاولة. مئة مستوى تتصاعد صعوبتها، ولكل مستوى خمس نقاط وثلاثة تلميحات — وكل تلميح يحسم نقطة. بلا إنترنت ولا حساب.',
    url: 'https://rajaxdx.github.io/fakkaha-raja/',
    image: 'assets/fakkaha-raja.png',
    emoji: '🔓',
    accent: '#3FE0B0',
    status: 'live',
    tags: ['فردي', 'محلي', 'عربي']
  },
  {
    name: 'صقر الوطن',
    tagline: 'لعبة طيران لليوم الوطني',
    description: 'أنت صقر يعبر المملكة من رمال النَّفُود إلى البحر الأحمر: خمس مناطق لكل واحدة سماؤها وتضاريسها وعوائقها. المس لترتفع وارفع إصبعك لتنزلق، واجمع التمر والبيارق وتفادَ الصخور والعواصف. كل شيء مولَّد لحظياً — حتّى الموسيقى، فالمقام يتبدّل مع كل منطقة. بلا إنترنت ولا حساب.',
    url: 'https://rajaxdx.github.io/saqr-alwatan/',
    image: 'assets/saqr-alwatan.png',
    emoji: '🦅',
    accent: '#006C35',
    status: 'live',
    tags: ['فردي', 'محلي', 'عربي']
  },
  {
    name: 'اكتشف وطنك مع رجا',
    tagline: 'لعبة أسئلة جماعية لليوم الوطني',
    description: 'لوحة من ست فئات وثلاثة مستويات عن الوطن: التوحيد والرموز والجغرافيا والملوك وولي العهد ورؤية ٢٠٣٠ والتراث. فريقان على جهاز واحد، ولكل فريق ثلاث وسائل مساعدة — الفخ يسرق نقاط خصمك، والحفرة تمنعه منها. تسعة وستون سؤالاً جاهزاً بلوحة إدارة تضيف وتعدّل عليها، وكل خانة تسحب سؤالها عشوائياً فما تتكرر الجولة. بلا إنترنت ولا حساب.',
    url: 'https://rajaxdx.github.io/ektashef-watanak-m3-raja/',
    image: 'assets/ektashef-watanak-m3-raja.png',
    emoji: '🌴',
    accent: '#17A65C',
    status: 'live',
    tags: ['فريقان', 'محلي', 'عربي']
  }
];
