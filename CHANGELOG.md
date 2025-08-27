# Changelog

All notable changes to the OpenLearn Backend project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive project restructuring for better organization
- League-based hierarchical permissions system
- Enhanced password reset flow with OTP verification
- Structured documentation organization
- Comprehensive testing scripts for authorization flows

### Changed
- Reorganized documentation into logical categories (api, architecture, deployment, development, migration)
- Restructured scripts into functional categories (development, testing, deployment, maintenance)
- Improved authorization middleware for league-based permissions
- Enhanced security for content creation endpoints

### Fixed
- League permission checks in week, section, resource, and assignment controllers
- Password reset flow issues including OTP logic and email template variables
- Docker environment configuration issues
- Redundant authorization checks in route middleware
- Improved CI/CD pipeline to offload building artifacts to gh actions

### Security
- Added explicit league-level authorization for all content CRUD operations
- Enhanced hierarchical permission validation for Chief Pathfinders and Pathfinders
- Improved password reset security with proper OTP validation

## [2.0.0] - 2025-08-25

### Added
- Complete V2 platform migration
- Fine grained role-based & league based access control system
- Email verification system
- Password reset flow
- Bull Queue for background jobs
- Modular email service with multiple providers factory (Resend, Amazon SES)
- Advanced analytics and reporting

### Changed
- Major database schema updates
- Improved API structure and documentation
- Enhanced user interface components

## [1.0.0] - 2025-06-15

### Added
- Initial OpenLearn backend implementation
- JWT authentication system
- Rate Limiting
- User management
- Course and cohort management
- Basic analytics
- Docker containerization
- PostgreSQL database integration
- Prisma ORM setup

### Notes
- This changelog was created during the project restructuring phase
- Previous version entries are reconstructed based on migration history
- Future changes will be documented in real-time
