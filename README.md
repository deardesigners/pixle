# Pixel-to-3D Studio

Двухпанельная Next.js 14 студия: рисуй пиксель-арт с поддержкой стилуса, превращай в анимированную 3D-модель в одной из 6 стилистик, делись в общей галерее с лайками и ремиксами.

## Стек
- Next.js 14 App Router · TypeScript strict
- Tailwind · shadcn-style UI на Radix
- Zustand
- Pointer Events + getCoalescedEvents (без Pressure.js / Hammer.js)
- @react-three/fiber + drei
- Vercel Blob (модели + превью), Vercel Postgres (метаданные + лайки)
- Meshy AI image-to-3D (опционально — fallback в voxel-демо без ключа)

## Установка
```bash
pnpm i
cp .env.example .env.local
```

## Подготовка инфраструктуры (один раз)
1. **Vercel Blob.** Dashboard → Storage → Blob → создать стор → скопировать `BLOB_READ_WRITE_TOKEN` в `.env.local`.
2. **Vercel Postgres.** Dashboard → Storage → Postgres → создать БД → `vercel link` → `vercel env pull .env.local`.
3. **Schema.** Открой `lib/db/schema.sql` и выполни в `Vercel Postgres → Query` (или `psql $POSTGRES_URL -f lib/db/schema.sql`).
4. **Meshy (опционально).** Зарегистрируйся на [meshy.ai](https://www.meshy.ai/), скопируй API key в `MESHY_API_KEY`. Без ключа приложение работает в demo-режиме.

## Локальный запуск
```bash
pnpm dev
# открой http://localhost:3000
```

## Деплой
```bash
vercel link
vercel env pull .env.local
vercel deploy --prod
```

## Поддержка давления по устройствам

| Устройство | Pressure | Канал | Примечание |
| --- | --- | --- | --- |
| Apple Pencil (iPad / iPad Pro) | ✅ нативно | size + alpha + jitter | через `event.pressure` и `getCoalescedEvents()` |
| Surface Pen (Windows) | ✅ нативно | size + alpha + jitter | через `event.pressure` |
| Galaxy S Pen | ✅ нативно | size + alpha + jitter | через `event.pressure` |
| Wacom Tablet (desktop) | ✅ нативно | size + alpha + jitter | требует Pointer Events драйвер от Wacom |
| Палец (Android / iOS) | ⚠️ velocity-fallback | size + alpha | быстрый штрих → тонко, медленный → толсто |
| Мышь | ❌ pressure=1.0 | — | модуляция отключена |

## Жесты и hotkeys

- 1 палец / стилус — рисование.
- 2 пальца — pinch-zoom канваса (1× → 4×).
- `B/E/G/I` — Brush / Eraser / Fill / Eyedropper.
- `⌘Z` / `⌘⇧Z` — Undo / Redo (глубина 50).
- `⌘0` — сброс зума.

## Архитектура

```
app/             — App Router pages + API routes (Node runtime)
components/      — UI, editor, viewer, gallery
lib/             — store, brush math, styles, meshy client, db, utils
lib/db/          — schema.sql + queries (DAL)
```

## Идентификация
Анонимный `clientId` (UUID v4 в `localStorage`).

## Troubleshooting

**3D не грузится.** Проверь, что Blob публичный и `next.config.mjs` содержит `*.public.blob.vercel-storage.com` в `images.remotePatterns`.

**Давление не работает на iPad.** Pointer Events требуют HTTPS. Локально используй `pnpm dev --experimental-https` или туннель.

**iOS Safari не пишет на канвас.** Убедись что у `<canvas>` стоит `touch-action: none` (класс `pixel-canvas`).

**Generate бесконечно polling-ует.** Meshy задачи занимают 1–4 минуты. Проверь баланс кредитов.

**Лайки не идут в БД.** Проверь, что `schema.sql` применён.

## Чек-лист после клона
1. `pnpm i`
2. Создал Blob и Postgres в Vercel.
3. Выполнил `lib/db/schema.sql` в Postgres.
4. `vercel env pull .env.local`.
5. `pnpm dev` → http://localhost:3000.
6. Нарисовал → Generate 3D → видишь модель (или voxel-демо).
7. Save to gallery → /gallery → Remix.
8. `vercel deploy --prod`.
