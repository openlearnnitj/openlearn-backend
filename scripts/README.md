# OpenLearn Backend Scripts

This directory contains various utility scripts organized by category for easy maintenance and discovery.

## Directory Structure

### 🧪 Testing Scripts (`./testing/`)
Scripts for testing various aspects of the platform functionality.

**Authentication & Authorization**
- Authorization flow testing
- Hierarchical permissions validation
- Role-based access control verification
- Security testing and penetration tests

**Feature Testing**
- Email verification flows
- Password reset functionality
- League assignment system
- Migration process validation
- Rate limiting verification

**API Testing**
- Endpoint functionality tests
- Integration testing scripts
- Production API validation
- Performance testing

### 🚀 Deployment Scripts (`./deployment/`)
Production deployment and infrastructure management scripts.

**Infrastructure Setup**
- EC2 micro instance setup
- Nginx configuration deployment
- CI/CD pipeline setup
- Environment configuration

**Deployment Management**
- Production deployment scripts
- Blue-green deployment support
- Rollback procedures
- Health check validation

### 💻 Development Scripts (`./development/`)
Local development environment setup and utilities.

**Environment Setup**
- Local development environment initialization
- Database seeding and migration
- Development server configuration
- Docker environment setup

**Development Utilities**
- Code generation scripts
- Database utilities
- Development testing helpers
- Local service management

### 🔧 Maintenance Scripts (`./maintenance/`)
Production maintenance and monitoring utilities.

**Database Management**
- Database backup and restore
- User management utilities
- Data cleanup and optimization
- Migration scripts

**System Monitoring**
- Health monitoring setup
- Performance monitoring
- Log analysis utilities
- System diagnostics

### 🔒 Security Scripts (`./security/`)
Security testing and validation scripts.

**Security Testing**
- Penetration testing automation
- Vulnerability scanning
- Security audit scripts
- Compliance checking

**Access Management**
- User access validation
- Permission testing
- Authentication verification
- Authorization testing

## Usage Guidelines

### Running Scripts
Most scripts should be run from the project root directory:
```bash
# From project root
./scripts/testing/test-authentication.sh
./scripts/deployment/deploy-production.sh
```

### Environment Requirements
- Ensure proper environment variables are set
- Database connection should be configured
- Required dependencies should be installed
- Proper permissions for script execution

### Best Practices
1. **Test Before Production**: Always test scripts in development first
2. **Backup Data**: Create backups before running maintenance scripts
3. **Monitor Execution**: Watch script output for errors or warnings
4. **Document Changes**: Update documentation when modifying scripts
5. **Version Control**: Keep scripts under version control

### Script Naming Convention
- Use descriptive names with hyphens for separation
- Include script purpose in filename
- Add `.sh` extension for shell scripts
- Group related scripts in appropriate directories

## Contributing

When adding new scripts:
1. Place in appropriate category directory
2. Follow existing naming conventions
3. Include proper error handling
4. Add usage comments at script top
5. Update this README if adding new categories
6. Test thoroughly before committing

## Security Considerations

- **Sensitive Data**: Never hardcode credentials in scripts
- **Environment Variables**: Use environment variables for configuration
- **Permissions**: Set appropriate file permissions (usually 755 for executable scripts)
- **Logging**: Avoid logging sensitive information
- **Access Control**: Restrict access to production scripts

---

*Scripts organized and maintained as part of OpenLearn Backend infrastructure*
