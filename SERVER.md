# Сервер JustRouter

Этот файл не должен содержать пароли, токены, SSH-ключи или реальные админские учётные данные.

## Доступ

Данные подключения хранятся вне репозитория:

- SSH host/user: в локальном password manager или у владельца инфраструктуры.
- SSH password/key: только в локальном secret storage.
- Админский логин/пароль: через переменные `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.

Если реальные доступы уже попадали в git, их нужно считать скомпрометированными и заменить.

## Деплой

**Путь на сервере:** `/var/www/justrouter.ru`
**Демо-сайты:** `/var/www/justrouter.ru/dist/demos/`

**Локальный деплой-скрипт:**
```bash
SSHPASS='***' ./scripts/deploy.sh user@example.com
```

## Админ-панель

**URL:** `/admin`

Логин и пароль задаются через `.env`, не через документацию.

## PM2 процессы

| Процесс | Статус | Команда |
|---|---|---|
| `justrouter` | online | `server/index.js` (Express) |
| `openclaw-worker` | online | `scripts/openclaw-report-worker.mjs` |

## Переменные окружения

Файл `.env` — на сервере по пути `/var/www/justrouter.ru/.env`.
