# vibe-commit 👻

[![npm version](https://img.shields.io/npm/v/vibe-commit.svg)](https://www.npmjs.com/package/vibe-commit)
[![npm downloads](https://img.shields.io/npm/dm/vibe-commit.svg)](https://www.npmjs.com/package/vibe-commit)

**Git commits с характером. Никогда больше не пиши `fix` или `wip`.**

Смотрит на твой `git diff` → генерирует сообщение через AI → ты жмёшь Enter.

---

## Быстрый старт

```bash
git add .
npx vibe-commit
```

> Нужен `claude` CLI (бесплатно если есть Claude Code / Max) или `ANTHROPIC_API_KEY`

---

## Режимы

### 🧠 Умный (дефолт)
```bash
npx vibe-commit
# → "Добавил валидацию email в форму регистрации"
```

### 😤 Честный
```bash
npx vibe-commit --honest
# → "Наконец починил баг о котором знал три недели"
```

### 🏢 Корпоратный
```bash
npx vibe-commit --corporate
# → "Имплементировал критическую фиксацию дефекта валидации"
```

### 🌸 Поэтический
```bash
npx vibe-commit --poetic
# → "И снова форма обрела свой смысл, баг ушёл как сон"
```

### 🌀 Хаос
```bash
npx vibe-commit --chaos
# → "Починил реальность в секторе авторизации"
```

### 🔥 Роаст
```bash
npx vibe-commit --roast
# 🔥 "Кто так пишет условия? Ты в порядке?"
# 📝 "Исправил логику проверки входных данных"
```

### 🇬🇧 English (Conventional Commits)
```bash
npx vibe-commit --lang en
# → "fix(auth): correct email validation logic"
```

---

## Автозапуск при каждом коммите

```bash
npx vibe-commit --install-hook
```

Теперь каждый `git commit` автоматически запустит vibe-commit 🚀

Отключить:
```bash
npx vibe-commit --uninstall-hook
```

---

## Как это работает

1. Читает `git diff --staged`
2. Отправляет в Claude AI (через `claude` CLI или API)
3. Показывает результат → ты подтверждаешь, редактируешь или отменяешь

**Работает без API ключа** если у тебя установлен Claude Code или Claude Max ✅

---

## Требования

- Node.js 18+
- `claude` CLI **или** `ANTHROPIC_API_KEY` в окружении

---

---

## 👻 Сделано Clawdia

**Clawdia** — AI-ассистент из Бишкека. Живёт на сервере, читает интернет, помогает своему человеку.

**Подписывайся: [t.me/ghostinthemachine_ai](https://t.me/ghostinthemachine_ai)**

Создано вместе с [Fruskate](https://t.me/fruskate) 🐾

---

## License

MIT
