import { Router } from 'express';
import { prisma } from '../config/database';

const router = Router();

/**
 * GET /api/public/cohorts-structure
 * 
 * Fetch all cohorts with their leagues and weeks
 * Public endpoint - no authentication required
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "cohort-id",
 *       "name": "Cohort Name",
 *       "description": "Description",
 *       "isActive": true,
 *       "leagues": [
 *         {
 *           "id": "league-id",
 *           "name": "League Name",
 *           "description": "Description",
 *           "weeks": [
 *             {
 *               "id": "week-id",
 *               "name": "Week Name",
 *               "description": "Description",
 *               "order": 1
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.get('/cohorts-structure', async (req, res) => {
  try {
    // Debug: Let's first check what we have in the database step by step
    const debugMode = req.query.debug === 'true';
    
    if (debugMode) {
      // Step 1: Check cohorts
      const cohorts = await prisma.cohort.findMany({
        where: { isActive: true }
      });
      
      // Step 2: Check specializations
      const specializations = await prisma.specialization.findMany({
        include: { cohort: true }
      });
      
      // Step 3: Check specialization-league relationships
      const specLeagues = await prisma.specializationLeague.findMany({
        include: {
          specialization: true,
          league: true
        }
      });
      
      // Step 4: Check leagues
      const leagues = await prisma.league.findMany();
      
      // Step 5: Check weeks
      const weeks = await prisma.week.findMany({
        include: { league: true }
      });
      
      return res.json({
        success: true,
        debug: {
          cohorts: cohorts.length,
          specializations: specializations.length,
          specializationLeagues: specLeagues.length,
          leagues: leagues.length,
          weeks: weeks.length,
          data: {
            cohorts,
            specializations,
            specializationLeagues: specLeagues,
            leagues,
            weeks
          }
        }
      });
    }

    // Single optimized query with nested includes
    const cohorts = await prisma.cohort.findMany({
      where: {
        isActive: true, // Only return active cohorts
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        specializations: {
          select: {
            id: true,
            name: true,
            description: true,
            leagues: {
              select: {
                league: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    weeks: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        order: true,
                      },
                      orderBy: {
                        order: 'asc', // Order weeks by their sequence
                      },
                    },
                  },
                },
              },
              orderBy: {
                order: 'asc', // Order leagues by their sequence in specialization
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc', // Order cohorts alphabetically
      },
    });

    // Transform the data to flatten the structure for frontend consumption
    const transformedCohorts = cohorts.map(cohort => {
      // Get unique leagues from all specializations in this cohort
      const leaguesMap = new Map();
      
      cohort.specializations.forEach(specialization => {
        specialization.leagues.forEach(specLeague => {
          const league = specLeague.league;
          if (!leaguesMap.has(league.id)) {
            leaguesMap.set(league.id, {
              id: league.id,
              name: league.name,
              description: league.description,
              weeks: league.weeks,
            });
          }
        });
      });

      return {
        id: cohort.id,
        name: cohort.name,
        description: cohort.description,
        isActive: cohort.isActive,
        leagues: Array.from(leaguesMap.values()),
      };
    });

    res.json({
      success: true,
      data: transformedCohorts,
      message: 'Cohorts structure fetched successfully',
      meta: {
        timestamp: new Date().toISOString(),
        totalCohorts: transformedCohorts.length,
        totalLeagues: transformedCohorts.reduce((sum, cohort) => sum + cohort.leagues.length, 0),
        totalWeeks: transformedCohorts.reduce((sum, cohort) => 
          sum + cohort.leagues.reduce((weekSum, league) => weekSum + league.weeks.length, 0), 0
        ),
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching cohorts structure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cohorts structure',
      message: 'Internal server error',
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
