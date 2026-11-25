# FitBite Pal

FitBite Pal helps members plan a workout, log meals and check-ins, and see how their weight and calorie balance change over time. The bilingual Chinese/English client runs on Android, iOS and the web. A Spring Boot API serves all three clients and a web console for administrators.

## Try it locally

You need Git, Docker with the Compose plugin, Node.js 24 and npm. The commands below use a POSIX shell. Docker runs the Java API, MySQL 8, Redis 7 and Mailpit. The desktop walkthrough works without a model key or an SMTP account.

```sh
git clone https://github.com/Eeeeye/FitBite-Pal.git
cd FitBite-Pal
cp env.docker.example .env
```

In the root `.env`, set `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` and `JWT_SECRET` to **three different values**. Run `openssl rand -hex 32` separately for each. Then start the services and wait for the API to become ready.

```sh
docker compose -f docker-compose.yml -f compose.mailpit.yml up -d --build --wait
curl -fsS http://127.0.0.1:8080/api/actuator/health/readiness
```

Once readiness reports `UP`, start the web client in the same checkout.

```sh
cd FitBitePal-Mobile
npm ci
EXPO_PUBLIC_API_URL=http://127.0.0.1:8080/api npm run web -- --port 8081
```

Open **http://localhost:8081**, register a member, complete the profile and open today's plan. Record a check-in, then open Progress to see it. To try password recovery, request a code and open the local Mailpit inbox at **http://127.0.0.1:8025**.

The environment template allows both loopback web origins on port 8081. If you change the web port, update `CORS_ALLOWED_ORIGINS` in the root `.env` and rerun the Compose command.

For the admin console, set `FITBITE_ADMIN_EMAIL` and `FITBITE_ADMIN_PASSWORD` before provisioning the first administrator. Sign in as `admin` at **http://127.0.0.1:8080/api/admin/index.html**. Remove the bootstrap password from the environment after provisioning and recreate the backend. To stop the local stack while keeping its data, run `docker compose -f docker-compose.yml -f compose.mailpit.yml down` from the repository root.

## What you can do

| Area | Member experience |
| --- | --- |
| Training and nutrition | Generate daily workout and meal plans, mark items complete, and add food records. Meal completion follows the item when its position in the menu changes. |
| Goals and progress | Set weight and body-fat goals, track check-ins and review seven days of activity and calorie data. |
| AI companion | Chat about training and nutrition or submit a food photo for recognition. On the web, Enter sends, Shift+Enter adds a line, and confirming a Chinese input-method candidate keeps the draft. Long conversations scroll independently of the input box. |
| Account controls | Switch between Chinese and English, reset a password by email, or delete an account from Settings or the web deletion page. Chat history on a shared device is scoped to the signed-in member. |

### Enable AI

The backend calls the provider for chat, nutrition advice and food recognition. To use OpenAI, add these values to the **root** `.env` and supply your own project key with Chat Completions request access. The key belongs only on the server.

```dotenv
AI_ENABLED=true
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Rerun the Compose startup command, sign in and send a message in AI Companion to verify a real model response. `/api/ai/health` checks provider configuration locally. To use Volcengine Ark instead, set `AI_ENABLED=true`, `AI_PROVIDER=ark`, `ARK_API_KEY` and the `ARK_MODEL` available to your account. The client uses the same API for either provider. [Environment template](env.docker.example)

## Engineering and performance

The [Expo client](FitBitePal-Mobile) uses React Native and React Navigation. The [Java 17 API](FitBitePal-Backend) uses Spring Boot 4.1, Spring Security and JPA. MySQL stores member records and plans. Redis caches reads and holds expiring password-reset codes.

One example is the daily training plan. On a cache miss, the API queries MySQL for an existing plan. If the plan is missing, it locks the member row and checks again before generating one. This lets readers open a published plan while another transaction holds that row lock. [Plan reader](FitBitePal-Backend/src/main/java/com/fitbitepal/backend/service/PublishedPlanReader.java)

The following figures come from controlled before/after runs on one ARM64 host with MySQL 8.0.44 and Redis 7.2.7.

| Scenario | Before | After | What changed |
| --- | ---: | ---: | --- |
| Home data load, 32 concurrent clients | 44 HTTP calls, 737 ms p95 | 4 calls, 87 ms p95 | Load today's data first and fetch history when opened. [Home benchmark](docs/performance/home-plan.md) |
| Seven-day progress view, 32 concurrent clients | 4 HTTP calls, 127.5 ms p95 | 1 call, 52.4 ms p95 | Aggregate the same seven days in one authenticated request. [Progress benchmark](docs/performance/progress.md) |
| Published-plan cache miss during a controlled 100 ms row lock | 0 of 432 reads finished before unlock | 432 of 432 finished before unlock | Read published plans directly. Acquire the member lock only when a plan must be generated. [Lock experiment](docs/performance/home-plan.md#数据库锁) |
| First authenticated profile reads after an API restart | 286 of 320 succeeded | 320 of 320 succeeded | Initialize and reuse the JWT parser before serving traffic. [Cold-start benchmark](docs/performance/jwt-startup.md) |

The page timings cover local HTTP requests through response validation. Home and progress used warmed services. The cold-start experiment restarted the API ten times per version and sent 32 simultaneous first reads each time. Device rendering, external networks and production traffic are outside these measurements. [Reproduce the experiments](scripts/perf/README.md)

## Tests and releases

| Check | How to run it |
| --- | --- |
| Backend regression suite | Run `mvn verify` in `FitBitePal-Backend` with JDK 17 or 21 and Maven. Local tests default to H2. The backend workflow also checks the MySQL baseline and runs integration tests with disposable MySQL, Redis and Mailpit. [Backend workflow](.github/workflows/backend.yml) |
| Client tests and native bundles | After `npm ci` in `FitBitePal-Mobile`, run `node --test tests/*.test.js`. CI also exports Android and iOS bundles. [Mobile workflow](.github/workflows/mobile.yml) |
| Browser and recovery checks | The release rehearsal exercises sign-in, goals, meals, account deletion and chat in a browser. It also upgrades a populated database, rolls back and restores from backup. [Rehearsal workflow](.github/workflows/release-rehearsal.yml) · [Recorded candidate results](docs/release-candidate-results.json) |

For an Android preview APK or iOS simulator build, configure a reachable HTTPS `EXPO_PUBLIC_API_URL` in the EAS preview environment. Use an Expo account with access to the linked project or link your fork to your own EAS project. From `FitBitePal-Mobile`, run the command for your target. [EAS profiles](FitBitePal-Mobile/eas.json)

```sh
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile ios-simulator
```

A fresh MySQL Compose volume installs the [V11 baseline](FitBitePal-Backend/src/main/resources/db/baseline/mysql8.sql). For an existing database, back up first, stop the old writers and apply the [ordered migration scripts](FitBitePal-Backend/src/main/resources/db/migration) after the installed version. An existing V9 database needs V10 followed by V11. Deploy the API before updating the clients.

When upgrading from the original demo, rotate the seeded admin password and verify its recovery email before exposing the console. The release guide covers rollback, restore, alert delivery and the remaining public HTTPS and physical-device checks. [Release guide](docs/release-candidate.md)

## Documentation

[User manual](USER_MANUAL.md) · [API reference](API_DOCUMENTATION.md) · [Email setup](FitBitePal-Backend/EMAIL_CONFIGURATION.md) · [Refactoring audit](docs/重构审计.md) · [Original requirements](SRS.md)

FitBite Pal is a coursework and learning project.
