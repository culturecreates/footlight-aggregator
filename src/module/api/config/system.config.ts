import * as dotenv from 'dotenv';

dotenv.config();
const {env} = process;

export const APPLICATION: { PORT: number } = {
    PORT: Number(env.APP_PORT) || 3033
};

export const EVENT_CONFIGURATIONS: { DEFAULT_TIMEZONE: string } = {
    DEFAULT_TIMEZONE: env.DEFAULT_TIMEZONE || 'Canada/Eastern'
  };

export const HEADER: { CMS_REFERER_HEADER : string } = {
    CMS_REFERER_HEADER: env.CMS_REFERER_HEADER || "https://cms.footlight.io/"
}