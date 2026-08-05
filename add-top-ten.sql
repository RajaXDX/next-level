-- إضافة «توب تن» إلى بوابة Next Level
-- شغّله على نفس مشروع Supabase — أو أضِفها من لوحة الإدارة، كلاهما يؤدّي الغرض.

INSERT INTO projects (name, tagline, description, url, emoji, accent, status, tags, sort_order)
VALUES (
  'توب تن',
  'لعبة قوائم العشرة بين شخصين',
  'كل سؤال قائمة من عشرة مرتّبة، ولاعبان يتناوبان على ذكر ما يعرفانه. النقاط برقم المركز — المركز العاشر يعطي عشر نقاط لأنه أصعب تذكّراً. تُلعب على جهاز واحد بلا إنترنت ولا حساب.',
  'https://rajaxdx.github.io/top-ten/',
  '🔟',
  '#FBBF24',
  'live',
  '["محلي","شخصان","عربي"]'::jsonb,
  3
);

SELECT name, status, sort_order FROM projects ORDER BY sort_order;
