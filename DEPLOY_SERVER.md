# Deploy on Your Own Server (Docker + HTTPS)

This guide is for Ubuntu 22.04/24.04 and a public domain.

## 1) DNS and server

1. Create an `A` record for your domain/subdomain (for example `map.example.com`) to your server IP.
2. Open ports in firewall/security group:
   - `22` (SSH)
   - `80` (HTTP)
   - `443` (HTTPS)

## 2) Install Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Optional (run docker without `sudo`, then relogin):

```bash
sudo usermod -aG docker $USER
```

## 3) Upload project

```bash
git clone <your-repo-url> history-project
cd history-project
```

## 4) Prepare environment

```bash
cp .env.production.example .env
```

Edit `.env` and set:
- `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (long random value)
- `DOMAIN` (for example `map.example.com`)

Important:
- In Yandex key restrictions add your real domain as HTTP Referer.

## 5) Start in production

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f caddy
```

After certificates are issued, open:
- `https://<your-domain>`

## No domain yet (HTTP-only mode)

If you do not have a domain yet, run app without Caddy/TLS:

```bash
cp .env.example .env
```

Set in `.env`:
- `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `ADMIN_COOKIE_SECURE=false`

Then start HTTP-only stack:

```bash
docker compose -f docker-compose.http.yml up -d --build
docker compose -f docker-compose.http.yml ps
```

Open:
- `http://<server-ip>:3000`

Logs:

```bash
docker compose -f docker-compose.http.yml logs -f app
```

## 6) Update later

```bash
git pull
docker compose up -d --build
```

## 7) Data persistence

Your project data is persisted on host via bind mounts:
- `./data` -> places JSON
- `./public/uploads` -> uploaded images

So places/photos will survive container restart/rebuild.

## 8) Useful commands

```bash
docker compose logs -f app
docker compose logs -f caddy
docker compose restart app
docker compose down
```

## 9) If HTTPS certificate is not issued

Check:
1. `DOMAIN` points to this server IP.
2. Ports `80` and `443` are open.
3. No other reverse proxy occupies `80/443`.
4. `docker compose logs -f caddy` for exact error.
