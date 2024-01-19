export const RdfTypes = {
    EVENT : "schema:Event",
    PLACE: "schema:Place",
    POSTAL_ADDRESS: "schema:PostalAddress",
    ORGANIZATION: "schema:Organization",
    PERSON: "schema:Person",
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

export const RdfEventStatus = {
    CANCELLED: "schema:EventCancelled",
    POSTPONED: "schema:EventPostponed",
    SCHEDULED: "schema:EventScheduled"
}

export const RdfPostalAddressTypes = {
    ADDRESS_COUNTRY: "schema:addressCountry",
    ADDRESS_LOCALITY: "schema:addressLocality",
    ADDRESS_REGION: "schema:addressRegion",
    POSTAL_CODE: "schema:postalCode",
    STREET_ADDRESS: "schema:streetAddress"
}

export const RdfPlaceTypes = {
    LATITUDE: "schema:latitude",
    LONGITUDE: "schema:longitude",
    ADDRESS: "schema:address"
}