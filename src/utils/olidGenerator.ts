import { prisma } from '../config/database';

/**
 * OpenLearn ID (OLID) Generator
 * 
 * Format: OL{YYY}{NNNNNN}
 * - OL: OpenLearn prefix
 * - YYY: Last 3 digits of current year (e.g., 025 for 2025)
 * - NNNNNN: 6-digit zero-padded sequence number for the year
 * 
 * Examples:
 * - OL025000001 (1st user in 2025)
 * - OL025000200 (200th user in 2025)
 * - OL026000001 (1st user in 2026)
 * 
 * This format supports:
 * - Up to 999,999 users per year (scalable)
 * - Easy year identification
 * - Memorable and professional format
 */

export class OLIDGenerator {
  /**
   * Generate a unique OLID for the current year
   */
  static async generateOLID(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-3); // Last 3 digits (e.g., "025")
    
    // Get the next sequence number for this year
    const sequenceNumber = await this.getNextSequenceNumber(currentYear);
    
    // Format: OL + year + 6-digit padded sequence
    const olid = `OL${yearSuffix}${sequenceNumber.toString().padStart(6, '0')}`;
    
    return olid;
  }

  /**
   * Get the next sequence number for the given year
   * This ensures sequential numbering within each year
   */
  private static async getNextSequenceNumber(year: number): Promise<number> {
    const yearPrefix = `OL${year.toString().slice(-3)}`;
    
    try {
      // Find the highest sequence number for this year
      const latestUser = await prisma.user.findFirst({
        where: {
          olid: {
            startsWith: yearPrefix,
          },
        },
        orderBy: {
          olid: 'desc',
        },
        select: {
          olid: true,
        },
      });

      if (!latestUser || !latestUser.olid) {
        // First user of the year
        return 1;
      }

      // Extract sequence number from the latest OLID
      // Format: OL025000123 -> extract "000123" -> 123
      const sequencePart = latestUser.olid.slice(-6); // Last 6 digits
      const lastSequence = parseInt(sequencePart, 10);
      
      return lastSequence + 1;
    } catch (error) {
      console.error('Error getting next sequence number:', error);
      // Fallback: use timestamp-based approach to avoid conflicts
      const timestamp = Date.now();
      const fallbackSequence = parseInt(timestamp.toString().slice(-6)) % 999999;
      return Math.max(1, fallbackSequence);
    }
  }

  /**
   * Validate OLID format
   */
  static validateOLID(olid: string): boolean {
    // Format: OL + 3 digits (year) + 6 digits (sequence)
    const olidRegex = /^OL\d{3}\d{6}$/;
    return olidRegex.test(olid);
  }

  /**
   * Extract year from OLID
   */
  static extractYear(olid: string): number | null {
    if (!this.validateOLID(olid)) {
      return null;
    }
    
    const yearSuffix = olid.slice(2, 5); // Extract "025" from "OL025000123"
    const fullYear = 2000 + parseInt(yearSuffix, 10); // 025 -> 2025
    
    return fullYear;
  }

  /**
   * Extract sequence number from OLID
   */
  static extractSequence(olid: string): number | null {
    if (!this.validateOLID(olid)) {
      return null;
    }
    
    const sequencePart = olid.slice(-6); // Last 6 digits
    return parseInt(sequencePart, 10);
  }

  /**
   * Generate analytics-friendly OLID info
   */
  static parseOLID(olid: string): { year: number; sequence: number; isValid: boolean } | null {
    if (!this.validateOLID(olid)) {
      return null;
    }

    const year = this.extractYear(olid);
    const sequence = this.extractSequence(olid);

    if (year === null || sequence === null) {
      return null;
    }

    return {
      year,
      sequence,
      isValid: true,
    };
  }
}

/**
 * Utility function for easy import
 */
export const generateOLID = OLIDGenerator.generateOLID;
export const validateOLID = OLIDGenerator.validateOLID;
export const parseOLID = OLIDGenerator.parseOLID;
