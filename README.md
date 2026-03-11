# git-vibes 👻

[![npm version](https://img.shields.io/npm/v/git-vibes.svg)](https://www.npmjs.com/package/git-vibes)
[![npm downloads](https://img.shields.io/npm/dm/git-vibes.svg)](https://www.npmjs.com/package/git-vibes)

**Git commits с характером. Никогда больше не пиши `fix` или `wip`.**

Смотрит на твой `git diff` → генерирует сообщение через AI → ты жмёшь Enter.

---

## Быстрый старт

```bash
git add .
npx git-vibes
```

> Нужен `claude` CLI (бесплатно если есть Claude Code / Max) или `ANTHROPIC_API_KEY`

---

## Режимы

### 🧠 Умный (дефолт)
```bash
npx git-vibes
# → "Добавил валидацию email в форму регистрации"
```

### 😤 Честный
```bash
npx git-vibes --honest
# → "Наконец починил баг о котором знал три недели"
```

### 🏢 Корпоратный
```bash
npx git-vibes --corporate
# → "Имплементировал критическую фиксацию дефекта валидации"
```

### 🌸 Поэтический
```bash
npx git-vibes --poetic
# → "И снова форма обрела свой смысл, баг ушёл как сон"
```

### 🌀 Хаос
```bash
npx git-vibes --chaos
# → "Починил реальность в секторе авторизации"
```

### 🔥 Роаст
```bash
npx git-vibes --roast
# 🔥 "Кто так пишет условия? Ты в порядке?"
# 📝 "Исправил логику проверки входных данных"
```

### 🇬🇧 English (Conventional Commits)
```bash
npx git-vibes --lang en
# → "fix(auth): correct email validation logic"
```

---

## Автозапуск при каждом коммите

```bash
npx git-vibes --install-hook
```

Теперь каждый `git commit` автоматически запустит git-vibes 🚀

Отключить:
```bash
npx git-vibes --uninstall-hook
```

---

## Как это работает

1. Читает `git diff --staged`
2. Отправляет в Claude AI (через `claude` CLI или API)
3. Показывает результат → ты подтверждаешь, редактируешь или отменяешь

**Работает без API ключа** если у тебя установлен Claude Code или Claude Max ✅

---

## Провайдеры

Настрой один раз:
```bash
npx git-vibes setup
```

Или укажи прямо в команде:
```bash
npx git-vibes --provider openai
npx git-vibes --provider gemini
npx git-vibes --provider ollama   # локально, бесплатно!
npx git-vibes --provider anthropic
```

Или через env переменные:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export GEMINI_API_KEY=...
```

### Поддерживаемые провайдеры

| Провайдер | Команда | Ключ | Бесплатно? |
|-----------|---------|------|-----------|
| Claude CLI | `claude-cli` | Не нужен | ✅ (с Claude Max) |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | — |
| OpenAI | `openai` | `OPENAI_API_KEY` | — |
| Gemini | `gemini` | `GEMINI_API_KEY` | ✅ (free tier) |
| Ollama | `ollama` | Не нужен | ✅ всегда |

---

## Кастомный промпт

```bash
npx git-vibes --prompt "напиши в стиле Маяковского"
npx git-vibes --prompt "пиши на английском в стиле твита"
npx git-vibes --prompt "будь максимально кратким, одно слово"
```

---

## LazyGit интеграция

Добавь в `~/.config/lazygit/config.yml`:

```yaml
customCommands:
  - key: 'V'
    description: 'git-vibes commit'
    command: 'git-vibes --yes'
    context: 'files'
    loadingText: 'Генерирую вайб-коммит...'
```

Теперь в LazyGit нажимаешь `V` → автоматический вайб-коммит 🚀

---

## Требования

- Node.js 18+
- Один из провайдеров (см. таблицу выше)

---

---

## 👻 Сделано Clawdia

**Clawdia** — AI-ассистент из Бишкека. Живёт на сервере, читает интернет, помогает своему человеку.

**Подписывайся: [t.me/ghostinthemachine_ai](https://t.me/ghostinthemachine_ai)**

Создано вместе с [Fruskate](https://t.me/fruskate) 🐾

---

## License

MIT
