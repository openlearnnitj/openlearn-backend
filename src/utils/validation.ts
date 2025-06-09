export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate required fields
   */
  static validateRequired(fields: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    Object.entries(fields).forEach(([key, value]) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${key} is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate signup data
   */
  static validateSignupData(data: { email: string; password: string; name: string }) {
    const errors: string[] = [];

    // Check required fields
    const requiredValidation = this.validateRequired(data);
    if (!requiredValidation.isValid) {
      errors.push(...requiredValidation.errors);
    }

    // Validate email
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    // Validate name length
    if (data.name && data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate login data
   */
  static validateLoginData(data: { email: string; password: string }) {
    const errors: string[] = [];

    // Check required fields
    const requiredValidation = this.validateRequired(data);
    if (!requiredValidation.isValid) {
      errors.push(...requiredValidation.errors);
    }

    // Validate email
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
