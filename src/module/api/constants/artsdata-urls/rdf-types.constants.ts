export const EntityPredicates = {
  EVENT : "schema:Event",
  PLACE: "schema:Place",
  POSTAL_ADDRESS: "schema:PostalAddress",
  ORGANIZATION: "schema:Organization",
  PERSON: "schema:Person",
  AGGREGATE_OFFER: "schema:AggregateOffer",
  CONTACT_POINT: "schema:ContactPoint",
}

export const EventPredicates = {
    ADDITIONAL_TYPE: "schema:additionalType",
    NAME : "schema:name",
    DESCRIPTION: "schema:description",
    EVENT_STATUS: "schema:eventStatus",
    EVENT_ATTENDANCE_MODE: "schema:eventAttendanceMode",
    START_DATE: "schema:startDate",
    IMAGE: "schema:image",
    END_DATE: "schema:endDate",
    SAME_AS: "schema:sameAs",
    LOCATION: "schema:location",
    ORGANIZER: "schema:organizer",
    PERFORMER: "schema:performer",
    COLLABORATOR: "schema:collaborator",
    VIDEO_URL: "schema:recordedIn",
    EVENT_OFFER: "schema:offers",
    EVENT_CONTACT_POINT: "schema:contactPoint",
    PRICE: "schema:price",
    URL: "schema:url",
    EMAIL: "schema:email",
    TELEPHONE: "schema:telephone"
}

export const EventStatusConstants = {
  CANCELLED: "schema:EventCancelled",
  POSTPONED: "schema:EventPostponed",
  SCHEDULED: "schema:EventScheduled"
};

export const PostalAddressPredicates = {
  ADDRESS_COUNTRY: "schema:addressCountry",
  ADDRESS_LOCALITY: "schema:addressLocality",
  ADDRESS_REGION: "schema:addressRegion",
  POSTAL_CODE: "schema:postalCode",
  STREET_ADDRESS: "schema:streetAddress"
};

export const PlacePredicates = {
  LATITUDE: "schema:latitude",
  LONGITUDE: "schema:longitude",
  ADDRESS: "schema:address"
};