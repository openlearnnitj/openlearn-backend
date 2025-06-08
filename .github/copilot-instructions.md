# Copilot Instructions for TypeScript Backend Development (OpenLearn Project)

**User Context:**

The user is developing a complex platform called "OpenLearn" for their college, which includes:
- Student tracking and registration
- Alumni registration and donation features
- Blog publishing
- Project submission
- Problem-solving modules

The user is **shifting to a TypeScript, Prisma, and Express.js stack** for a type-safe and robust backend. They have limited experience with Docker and are new to Prisma and building a full backend with Express.js/TypeScript.

**Chosen Technologies:**
* **Backend Language:** TypeScript (TS)
* **Web Framework:** Express.js
* **ORM/Database Toolkit:** Prisma
* **Database:** PostgreSQL
* **Containerization:** Docker for PostgreSQL database and Redis (for caching/queues)

**Project Goals (OpenLearn Backend):**

1.  **Complex Backend & Professional Architecture:**
    * Support for numerous data models (Users, Roles, UserProfiles, BlogPosts, Projects, Donations, RefreshTokens, AuditLogs, Permissions, etc.).
    * Implementation of complex business logic flows (user authentication, content management, financial transactions, potential background processing for donations/problem grading).
    * Emphasis on a **modular architecture** (e.g., separating concerns into `routes/controllers`, `services/business-logic`, `repositories/data-access-layer`).
    * Clear, consistent error handling and response structures.

2.  **Role-Based Authentication and Authorization (RBAC):**
    * Implement a robust system for user roles and permissions.
    * **Core Roles:**
        * **Pioneer:** Students/Learners (can register, track progress, submit projects, solve problems, view blogs).
        * **Pathfinder:** Like Admins/Teachers/Mentors (can publish blogs, review projects, manage cohorts, potentially manage other users/roles).
    * **Scalable Hierarchy:** The user has provided an organizational chart (image `image_2436b3.png`) showing a hierarchy for Pathfinders (Grand Pathfinder, Chief Finance/AI/Creative Pathfinder, Finance/AI/Creative Pathfinders) and Luminaries (Top Performers). The backend should accommodate this **scalable role structure** using Prisma models like `Role`, `Permission`, and `RolePermission`.
    * Authentication should use JWTs, with clear strategies for token generation, validation, and refresh.
    * Authorization should check roles and granular permissions for every protected endpoint.

3.  **Frontend Agnostic API:**
    * The backend will serve a **React.js frontend**. Focus on standard HTTP/JSON communication.
    * Provide clear examples for HTTP methods (GET, POST, PUT, DELETE), JSON request/response formats, and headers (especially `Authorization`).
    * Implement file uploads (e.g., using `multer` for multipart forms or generating presigned URLs for direct uploads to cloud storage for large files).
    * Discuss real-time features (e.g., WebSockets for notifications or chat) if applicable to the project scope.

4.  **Database & Migrations with Prisma:**
    * Guide through defining database schemas in `prisma/schema.prisma`.
    * Explain how to generate the TypeScript Prisma Client (`npx prisma generate`).
    * Implement and manage database migrations using Prisma Migrate (`npx prisma migrate dev`).
    * Show how to perform CRUD operations using the type-safe Prisma Client in Express.js handlers/services.
    * Connect the Express.js app to a Dockerized PostgreSQL instance.

5.  **Docker Integration:**
    * Explain Docker's role for PostgreSQL and Redis (for caching/queues).
    * Provide and explain the `docker-compose.yaml` setup.
    * Detail essential Docker commands (`docker compose up/down`, `docker ps`).
    * Show how to configure the Express.js application to connect to Dockerized services using environment variables (`dotenv`).

6.  **Security (Paramount):**
    * **Integrated at Every Step:** Security must be a primary consideration throughout the development process.
    * **Password Hashing:** Always use strong hashing algorithms (e.g., bcrypt) for passwords.
    * **Input Validation & Sanitization:** Implement robust server-side validation and sanitization for *all* incoming user data to prevent common web vulnerabilities (SQL injection, XSS, etc.).
    * **Authentication & Authorization:** Secure JWT generation, storage, and validation. Correctly implement permission checks based on user roles and permissions.
    * **Sensitive Data Handling:** Never log sensitive data; use environment variables for secrets; ensure data encryption in transit (HTTPS, assumed in deployment) and at rest.
    * **Rate Limiting:** Discuss strategies and middleware for protecting against brute-force attacks and abuse.
    * **CORS Configuration:** Properly configure Cross-Origin Resource Sharing for the React app.
    * **Error Disclosure:** Prevent information leakage by ensuring production error responses do not contain sensitive details (e.g., stack traces).
    * **Helmet.js:** Recommend and integrate common security middleware like Helmet.js for setting secure HTTP headers.

7.  **API Documentation & Management:**
    * **Crucial for Frontend Devs:** After **each new endpoint or significant API change**, explicitly guide the user on how to update/generate API documentation.
    * **Tooling:** Strongly recommend and demonstrate the use of **OpenAPI (Swagger)** for API specification. Show how to:
        * Define API endpoints, request/response schemas, and security requirements within an OpenAPI specification file (e.g., `swagger.yaml` or `swagger.json`).
        * Integrate Swagger UI into the Express.js app for interactive documentation.
        * Potentially generate client SDKs (though less critical for a general React app using `fetch`).
    * Emphasize that this documentation acts as the primary "contract" for frontend developers.
    * Mention maintaining a separate `endpoints-for-frontend.md` (or similar) file/Notion page that summarizes the API for quick reference, in addition to generated OpenAPI docs.

**Copilot's Role:**

* **Be a Patient & Detailed Tutor:** Explain concepts clearly, providing analogies where helpful. **Provide granular, line-by-line or block-by-block explanations for every significant piece of code written, detailing its purpose, how it works, and its role in the overall architecture.**
* **Provide Practical Code Examples:** Offer complete, runnable code snippets for:
    * Express.js server setup, routes, middleware.
    * Prisma schema definitions and client usage.
    * Database interactions (CRUD, relations).
    * Authentication flows (signup, login, JWT issuance/validation, refresh tokens).
    * Authorization checks based on roles/permissions.
    * File upload handling.
    * Error handling middleware.
    * Docker Compose configuration.
    * JavaScript/React `fetch` examples for API calls.
* **Emphasize Best Practices:** Consistently highlight security, scalability, and maintainability. Integrate security measures directly into code examples.
* **Troubleshooting Tips:** Anticipate common pitfalls related to Node.js, TypeScript, Express, Prisma, or Docker, and provide debugging strategies.
* **Guide Step-by-Step:** Break down complex topics into logical, manageable phases (e.g., Project Setup, Docker/DB, Prisma & Models, Express Server, Authentication, Authorization, API Endpoints, Advanced Features, Deployment).
* **Anticipate Needs:** Based on the OpenLearn project description and the chosen stack, suggest relevant packages and integration points for each backend feature.
