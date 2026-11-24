# FitBite Pal

FitBite Pal is a mobile fitness and diet management application built with React Native and Spring Boot. It supports user onboarding, workout and meal planning, check-in records, progress tracking, bilingual content, and a lightweight web-based admin interface.

The repository is organized as a full-stack project:

- `FitBitePal-Mobile`: React Native / Expo mobile client
- `FitBitePal-Backend`: Spring Boot REST API and admin page
- `docker-compose.yml`: local MySQL, Redis, and backend runtime

## Features

- User registration, login, password reset, and JWT-based authentication
- Profile setup for age, gender, height, weight, activity level, goal, and available training time
- Workout plan generation, exercise details, training records, and completion tracking
- Diet plan management, food records, calorie estimation, and meal set support
- Progress views for weight, calories, check-ins, and training history
- Pose session recording and feedback endpoints
- Admin management for users, foods, meal sets, user stats, and system configuration
- Chinese and English interface text

## Tech Stack

### Mobile

- React Native with Expo SDK 54
- React Navigation
- React Context for application state
- `i18n-js` and `expo-localization`
- Expo camera and image picker modules

### Backend

- Java 17+
- Spring Boot 3.2
- Spring Security with JWT
- Spring Data JPA / Hibernate
- MySQL 8.0
- Redis
- Docker support

### External Services

- SMTP email service for verification and password reset
- Optional Ark API integration for food recognition

## Repository Structure

```text
.
├── FitBitePal-Backend/
│   ├── src/main/java/com/fitbitepal/backend/
│   │   ├── config/
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── exception/
│   │   ├── model/
│   │   ├── repository/
│   │   ├── scheduler/
│   │   ├── security/
│   │   └── service/
│   ├── src/main/resources/
│   │   ├── db/migration/
│   │   ├── static/admin/
│   │   ├── application.yml
│   │   ├── application-dev.yml
│   │   ├── application-prod.yml
│   │   └── application-test.yml
│   ├── Dockerfile
│   └── pom.xml
├── FitBitePal-Mobile/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── navigation/
│   │   ├── screens/
│   │   └── utils/
│   ├── assets/
│   ├── i18n/
│   ├── services/
│   ├── app.json
│   └── package.json
├── API_DOCUMENTATION.md
├── DOCKER_DEPLOYMENT.md
├── TEST_REPORT.md
├── USER_MANUAL.md
├── docker-compose.yml
└── env.docker.example
```

## Getting Started

### Prerequisites

- Node.js 18+
- Java 17+
- Maven
- MySQL 8.0+
- Redis 6+
- Docker and Docker Compose, optional but recommended for local services

### Run with Docker Compose

Copy `env.docker.example` to `.env` and set distinct `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` values. Set `JWT_SECRET` to the output of `openssl rand -hex 32`. For the first admin login, also set `FITBITE_ADMIN_EMAIL` to an address you control and `FITBITE_ADMIN_PASSWORD` to a private password. Then run from the repository root:

```bash
docker compose -f docker-compose.yml -f compose.mailpit.yml up -d --build
```

The backend will be available at:

- Local reset email inbox: `http://127.0.0.1:8025` (override with `FITBITE_INBOX_PORT`). See [mail setup](FitBitePal-Backend/EMAIL_CONFIGURATION.md) for authenticated provider delivery.
- API base URL: `http://localhost:8080/api`
- Admin page: `http://localhost:8080/api/admin/index.html`
- Health check: `http://localhost:8080/api/actuator/health`

### Run the Backend Locally

Start MySQL and Redis first, then configure the backend connection values in `FitBitePal-Backend/src/main/resources/application.yml` or through environment variables.

```bash
cd FitBitePal-Backend
mvn spring-boot:run
```

Default backend settings:

| Setting | Default |
| --- | --- |
| Server port | `8080` |
| Context path | `/api` |
| MySQL database | `fitbitepal` |
| Redis host | `localhost` |

### Run the Mobile App

```bash
cd FitBitePal-Mobile
npm install
cp env.example .env
npx expo start
```

Set the mobile API URL in `.env`:

```text
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

When testing on a physical device, replace `localhost` with the LAN IP address of the machine running the backend.

## Configuration

### Backend Environment Variables

Common backend values can be configured through Spring environment variables:

| Variable | Purpose |
| --- | --- |
| `SPRING_DATASOURCE_URL` | MySQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | Database username |
| `SPRING_DATASOURCE_PASSWORD` | Database password |
| `SPRING_DATA_REDIS_HOST` | Redis host |
| `SPRING_DATA_REDIS_PORT` | Redis port |
| `JWT_SECRET` | Required signing key for production and Compose |
| `FITBITE_ADMIN_EMAIL`, `FITBITE_ADMIN_PASSWORD` | Optional first-start credentials for username `admin`. Remove the bootstrap password after provisioning. Existing accounts keep their credentials. |
| `JWT_EXPIRATION` | Token lifetime in milliseconds |
| `MAIL_HOST` | SMTP host |
| `MAIL_PORT` | SMTP port |
| `MAIL_USERNAME` | SMTP username |
| `MAIL_PASSWORD` | SMTP password or app password |
| `ARK_API_KEY` | Optional Ark API key |
| `ARK_ENABLED` | Enable or disable Ark-backed features |

For Docker-based deployment, copy `env.docker.example` to `.env` and adjust the values before starting the services.

### Mobile Environment Variables

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Backend API base URL |

## API Documentation

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for endpoint details.

Main endpoint groups:

- `POST /api/auth/*`
- `/api/users/*`
- `/api/exercises/*`
- `/api/plans/*`
- `/api/records/*`
- `/api/data/*`
- `/api/pose/*`
- `/api/admin/*`

## Additional Documentation

| Document | Description |
| --- | --- |
| [USER_MANUAL.md](USER_MANUAL.md) | User guide for the mobile app and admin interface |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | REST API reference |
| [重构审计](docs/重构审计.md) | Data integrity, authorization, migration and verification evidence (Chinese) |
| [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) | Docker deployment guide |
| [TEST_REPORT.md](TEST_REPORT.md) | Test cases and results |
| [SRS.md](SRS.md) | Software requirements specification |

## Build

### Backend

```bash
cd FitBitePal-Backend
mvn clean package
```

### Android Preview Build

```bash
cd FitBitePal-Mobile
npx eas build -p android --profile preview
```

### iOS Preview Build

```bash
cd FitBitePal-Mobile
npx eas build -p ios --profile preview
```

### Backend verification

Run `mvn verify` in `FitBitePal-Backend` to build the Java 17 application and run its HTTP and persistence regression tests. The default tests use an isolated H2 database. The backend CI job runs the same flows against disposable MySQL 8 and enables Redis 7 tests for expiring and atomically consuming reset codes.

A fresh Compose volume runs the MySQL 8 baseline once. It creates the 13 application tables, including the V8 pose fields and V9 lookup indexes. Spring starts in schema validation mode. For an empty database managed outside Compose, select the target database and run the same SQL before starting the backend. [MySQL baseline](FitBitePal-Backend/src/main/resources/db/baseline/mysql8.sql)

For an existing deployment at V7, take a backup, then apply V8 once and V9 to the application database before starting the updated service. The MySQL image only processes initialization files when its data directory is empty. [V8 pose migration](FitBitePal-Backend/src/main/resources/db/migration/V8__pose_session_lifecycle.sql) · [V9 index migration](FitBitePal-Backend/src/main/resources/db/migration/V9__daily_lookup_indexes.sql)

When reusing a MySQL volume, provision the application account named by `MYSQL_USER` on the FitBite database before switching the backend credentials. The MySQL image provisions this account automatically for an empty volume.

## Security Notes

- For upgrades from the original demo, rotate the previously seeded administrator password and verify its recovery email before exposing the service. Replacing the JWT signing key requires users to sign in again.

- Do not commit real `.env` files, database credentials, SMTP passwords, JWT secrets, or API keys.
- Use strong `JWT_SECRET` values outside local development.
- Keep production database and Redis services private to the deployment network.
- Review CORS settings before production deployment.

## License

This project is for coursework and learning purposes.
