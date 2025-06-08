import { config } from './src/config/index';

console.log('JWT Config Test:');
console.log('accessSecret:', typeof config.jwt.accessSecret, config.jwt.accessSecret);
console.log('refreshSecret:', typeof config.jwt.refreshSecret, config.jwt.refreshSecret);
console.log('accessExpiresIn:', typeof config.jwt.accessExpiresIn, config.jwt.accessExpiresIn);
console.log('refreshExpiresIn:', typeof config.jwt.refreshExpiresIn, config.jwt.refreshExpiresIn);
