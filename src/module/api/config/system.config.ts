import * as dotenv from 'dotenv';

dotenv.config();
const {env} = process;

export const SERVER: { BASE_URL: string } = {
    BASE_URL: env.BASE_URL || '127.0.0.1/api',
};


export const APPLICATION: { PORT: number } = {
    PORT: Number(env.APP_PORT) || 3033
};