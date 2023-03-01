import * as dotenv from 'dotenv';

dotenv.config();
const {env} = process;

export const SERVER: { FOOTLIGHT_API_BASE_URL: string } = {
    FOOTLIGHT_API_BASE_URL: env.FOOTLIGHT_API_BASE_URL || '127.0.0.1:3000',
};


export const APPLICATION: { PORT: number } = {
    PORT: Number(env.APP_PORT) || 3033
};