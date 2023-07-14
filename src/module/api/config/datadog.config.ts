import * as dotenv from 'dotenv';
dotenv.config();
const { env } = process;

export const DATA_DOG: { CLIENT_TOKEN: string; LOG_TO_DATA_DOG: Boolean } = {
  CLIENT_TOKEN: String (env.DATA_DOG_CLIENT_TOKEN),
  LOG_TO_DATA_DOG: Boolean(env.ENABLING_LOG_TO_DATA_DOG === 'true'? true : false)
};
