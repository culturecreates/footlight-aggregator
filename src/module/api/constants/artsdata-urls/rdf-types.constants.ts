export const EventPredicates = {
    EVENT : "schema:Event",
    PLACE: "schema:Place",
    POSTAL_ADDRESS: "schema:PostalAddress",
    ORGANIZATION: "schema:Organization",
    PERSON: "schema:Person",
    ADDITIONAL_TYPE: "schema:additionalType",
    NAME : "schema:name",
    EVENT_STATUS: "schema:eventStatus",
    EVENT_ATTENDANCE_MODE: "schema:eventAttendanceMode",
    START_DATE: "schema:startDate",
    SAME_AS: "schema:sameAs",
    LOCATION: "schema:location",
    ORGANIZER: "schema:organizer",
    PERFORMER: "schema:performer",
    COLLABORATOR: "schema:collaborator",
    URL: "schema:url"
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