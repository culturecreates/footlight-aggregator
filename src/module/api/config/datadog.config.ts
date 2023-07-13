import * as dotenv from 'dotenv';
dotenv.config();
const { env } = process;

export const DATA_DOG = {
    clientToken: env.DATA_DOG_CLIENT_TOKEN,
    forwardErrorsToLogs: Boolean(env.ENABLING_LOG_TO_DATA_DOG)
};
