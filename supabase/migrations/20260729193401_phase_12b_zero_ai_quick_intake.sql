-- Phase 12B keeps quick intake independent from the formal catalog while
-- raising one batch to fifty images/items and supplying deterministic copy
-- whenever the owner leaves optional text blank.
create or replace function public.admin_create_showcase_batch(
  p_batch_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  item jsonb;
  image jsonb;
  tag_value jsonb;
  item_id uuid;
  image_id uuid;
  item_code text;
  title_zh text;
  title_en text;
  description_zh text;
  description_en text;
  price_value numeric(10, 2);
  image_index integer;
  item_index integer := 0;
  total_images integer := 0;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if p_batch_id is null or p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise check_violation using message = 'A showcase batch must contain between one and fifty items';
  end if;

  insert into public.showcase_batches (id, created_by) values (p_batch_id, actor_id);

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_id := (item ->> 'id')::uuid;
    item_code := 'HB-' || upper(substr(md5(item_id::text), 1, 12));
    title_zh := coalesce(nullif(btrim(item ->> 'titleZh'), ''), '今日到店 · ' || item_code);
    title_en := coalesce(nullif(btrim(item ->> 'titleEn'), ''), 'New arrival · ' || item_code);
    description_zh := coalesce(
      nullif(btrim(item ->> 'descriptionZh'), ''),
      'Happy Beans 最近到店的新鲜好物，欢迎联系我们了解更多。'
    );
    description_en := coalesce(
      nullif(btrim(item ->> 'descriptionEn'), ''),
      'A new arrival at Happy Beans. Contact us to learn more.'
    );
    price_value := nullif(item ->> 'priceCad', '')::numeric;

    if char_length(title_zh) > 120
      or char_length(title_en) > 120
      or char_length(description_zh) > 500
      or char_length(description_en) > 500
      or (price_value is not null and price_value <= 0)
      or jsonb_typeof(item -> 'images') <> 'array'
      or jsonb_array_length(item -> 'images') not between 1 and 10
      or jsonb_typeof(coalesce(item -> 'tagIds', '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(item -> 'tagIds', '[]'::jsonb)) > 10
    then
      raise check_violation using message = 'Invalid showcase item';
    end if;

    total_images := total_images + jsonb_array_length(item -> 'images');
    if total_images > 50 then
      raise check_violation using message = 'A showcase batch can contain at most fifty images';
    end if;

    insert into public.showcase_items (id, batch_id, short_code, price_cad, sort_order)
    values (item_id, p_batch_id, item_code, price_value, item_index);
    insert into public.showcase_item_translations (item_id, locale, title, description)
    values (item_id, 'zh', title_zh, description_zh), (item_id, 'en', title_en, description_en);

    for tag_value in select value from jsonb_array_elements(coalesce(item -> 'tagIds', '[]'::jsonb))
    loop
      insert into public.showcase_item_tags (item_id, tag_id)
      values (item_id, (tag_value #>> '{}')::uuid);
    end loop;

    image_index := 0;
    for image in select value from jsonb_array_elements(item -> 'images')
    loop
      image_id := (image ->> 'id')::uuid;
      if image ->> 'storagePath' !~ (
        '^showcase/' || p_batch_id::text ||
        '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
      ) then
        raise check_violation using message = 'Invalid showcase image path';
      end if;
      insert into public.showcase_item_images (id, item_id, storage_path, sort_order, width, height)
      values (
        image_id,
        item_id,
        image ->> 'storagePath',
        image_index,
        nullif(image ->> 'width', '')::integer,
        nullif(image ->> 'height', '')::integer
      );
      insert into public.showcase_image_translations (image_id, locale, alt_text)
      values
        (image_id, 'zh', title_zh || ' 图片 ' || (image_index + 1)),
        (image_id, 'en', title_en || ', image ' || (image_index + 1));
      image_index := image_index + 1;
    end loop;
    item_index := item_index + 1;
  end loop;

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.batch.publish',
    'showcase_batch',
    p_batch_id::text,
    jsonb_build_object(
      'item_count', jsonb_array_length(p_items),
      'image_count', total_images,
      'intake_mode', 'zero_ai'
    )
  );
  return p_batch_id;
end;
$$;

comment on function public.admin_create_showcase_batch(uuid, jsonb) is
  'Publishes one admin-only zero-AI quick-intake batch with 1-50 items/images and deterministic safe copy for blank text.';
