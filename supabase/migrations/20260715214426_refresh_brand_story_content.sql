update public.homepage_section_translations as translations
set
  heading = case translations.locale
    when 'en' then 'Bringing Kawaii Culture to Life'
    when 'zh' then '让 Kawaii 可爱文化走进生活'
    else translations.heading
  end,
  body = case translations.locale
    when 'en' then E'Welcome to Happy Beans (福豆), where East meets pure joy! We\'re passionate about sharing the beautiful, kawaii world of Japanese and Korean culture through carefully curated items that spark happiness and wonder in every heart. ✨\n\nFrom traditional tea ceremony treasures to modern kawaii accessories, each product in our collection tells a story of craftsmanship, culture, and the simple joy of beautiful, adorable things. 🌸\n\nOur name "福豆" (Happy Beans) represents good fortune and prosperity - values we hope to share with every customer who becomes part of our kawaii family! 💕'
    when 'zh' then E'欢迎来到 Happy Beans（福豆），一个让东方文化与纯粹快乐相遇的地方！我们热爱日本与韩国文化中美好又可爱的世界，精心挑选每一件能为每颗心带来幸福与惊喜的物品。✨\n\n从承载传统茶道之美的珍品，到充满现代感的可爱配饰，我们收藏中的每件商品，都诉说着匠心、文化，以及美好可爱之物带来的简单快乐。🌸\n\n“福豆”这个名字象征着好运与兴旺——我们也希望把这份祝福分享给每一位加入 Happy Beans 可爱大家庭的顾客！💕'
    else translations.body
  end
from public.homepage_sections as sections
where sections.id = translations.section_id
  and sections.section_type = 'brand_story'
  and translations.locale in ('en', 'zh');
