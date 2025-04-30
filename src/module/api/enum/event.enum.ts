export enum EventStatus {
    CANCELLED = 'CANCELLED',
    POSTPONED = 'POSTPONED',
    SCHEDULED = 'SCHEDULED'
}

export enum PersonOrganizationType {
    PERSON = "Person",
    ORGANIZATION = "Organization"
}

export enum OfferCategory {
    FREE = 'FREE',
    PAYING = 'PAYING',
    REGISTRATION = "REGISTRATION",
}

export enum EventProperty {
    ADDITIONAL_TYPE = 'additionalType',
    AUDIENCE = 'audience',
    DISCIPLINE = 'discipline'
}

export enum EventPropertyMappedToField {
    ADDITIONAL_TYPE = 'EventType',
    AUDIENCE = 'Audience',
    DISCIPLINE = 'EventDiscipline'
}

export enum Languages {
    ENGLISH  = 'en',
    FRENCH = 'fr'
}

export enum RecurringEventFrequency {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    CUSTOM = "CUSTOM"
  }