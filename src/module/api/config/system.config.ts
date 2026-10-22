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

export const CMS: { EVENT_URL_TEMPLATE: string } = {
    EVENT_URL_TEMPLATE: env.CMS_EVENT_URL_TEMPLATE
        || `${HEADER.CMS_REFERER_HEADER.replace(/\/$/, '')}/dashboard/CALENDAR_ID/events/event/EVENT_ID`
}
