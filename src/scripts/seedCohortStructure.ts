import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCohortStructure() {
  try {
    console.log('🌱 Seeding cohort structure for testing...');

    // Create a cohort
    const cohort = await prisma.cohort.create({
      data: {
        name: 'Cohort 1.0',
        description: 'First cohort of OpenLearn platform',
        isActive: true,
      },
    });

    console.log('✅ Created cohort:', cohort.name);

    // Create leagues
    const aiLeague = await prisma.league.create({
      data: {
        name: 'AI/ML',
        description: 'Artificial Intelligence and Machine Learning track',
      },
    });

    const financeLeague = await prisma.league.create({
      data: {
        name: 'Finance',
        description: 'Financial technology and analysis track',
      },
    });

    console.log('✅ Created leagues:', aiLeague.name, financeLeague.name);

    // Create specialization
    const specialization = await prisma.specialization.create({
      data: {
        name: 'AI/ML + Finance Specialist',
        description: 'Combined specialization in AI and Finance',
        cohortId: cohort.id,
      },
    });

    console.log('✅ Created specialization:', specialization.name);

    // Link leagues to specialization
    await prisma.specializationLeague.createMany({
      data: [
        {
          specializationId: specialization.id,
          leagueId: aiLeague.id,
          order: 1,
        },
        {
          specializationId: specialization.id,
          leagueId: financeLeague.id,
          order: 2,
        },
      ],
    });

    console.log('✅ Linked leagues to specialization');

    // Create weeks for AI/ML league
    await prisma.week.createMany({
      data: [
        {
          name: 'Week 1: Python Fundamentals',
          description: 'Introduction to Python programming',
          order: 1,
          leagueId: aiLeague.id,
        },
        {
          name: 'Week 2: Data Science Basics',
          description: 'Introduction to data science with pandas',
          order: 2,
          leagueId: aiLeague.id,
        },
        {
          name: 'Week 3: Machine Learning',
          description: 'ML algorithms and implementation',
          order: 3,
          leagueId: aiLeague.id,
        },
      ],
    });

    // Create weeks for Finance league
    await prisma.week.createMany({
      data: [
        {
          name: 'Week 1: Financial Markets',
          description: 'Understanding financial markets and instruments',
          order: 1,
          leagueId: financeLeague.id,
        },
        {
          name: 'Week 2: Portfolio Management',
          description: 'Investment strategies and portfolio optimization',
          order: 2,
          leagueId: financeLeague.id,
        },
      ],
    });

    console.log('✅ Created weeks for both leagues');

    console.log('Sample cohort structure created successfully!');
    console.log('Test the endpoint: GET /api/public/cohorts-structure');

  } catch (error) {
    console.error('❌ Error seeding cohort structure:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCohortStructure();
