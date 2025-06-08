import { Router } from 'express';
import authRouter from './auth';

// Re-export individual routers for specific imports
export { default as authRouter } from './auth';

/**
 * Main router that combines all application routes
 * This provides a single point to mount all API routes
 */
const apiRouter = Router();

// Mount authentication routes at /api/auth
apiRouter.use('/auth', authRouter);

// TODO: Add other route modules as they are created
// apiRouter.use('/users', userRouter);
// apiRouter.use('/blogs', blogRouter);
// apiRouter.use('/projects', projectRouter);
// apiRouter.use('/admin', adminRouter);

export default apiRouter;
