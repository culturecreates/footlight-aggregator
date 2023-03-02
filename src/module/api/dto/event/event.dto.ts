import {IdentifierString, MultilingualString, SameAs, UriString} from "../../model";
import {ContactPointDTO} from "../contact-point";
import {PersonOrganizationWithRole} from "../../model/personOrganizationWithRole.model";
import {EventStatus} from "../../enum/event.enum";
import {Location} from "../../model/location.model";

export class EventDTO {

    constructor(name: MultilingualString, description: MultilingualString, locationId: Location, sameAs: SameAs[], url: UriString,
                startDateTime: Date, organizers: PersonOrganizationWithRole[], performers: PersonOrganizationWithRole[],
                collaborators: PersonOrganizationWithRole[]) {
        this.name = name;
        this.description = description;
        this.locationId = locationId;
        this.sameAs = sameAs;
        this.url = url;
        this.startDateTime = startDateTime;
        this.organizers = organizers;
        this.performers = performers;
        this.collaborators = collaborators;
    }

    name: MultilingualString;
    description: MultilingualString;
    // image?: Image;
    sameAs: SameAs[];
    locationId: Location;
    url: UriString;
    alternateName: MultilingualString[];
    duration: string;
    startDate: string;
    endDate: string;
    startDateTime: Date;
    endDateTime: Date;
    eventStatus: EventStatus;
    organizers: PersonOrganizationWithRole[];
    performers: PersonOrganizationWithRole[];
    collaborators: PersonOrganizationWithRole[];
    superEvent: IdentifierString;
    workFeatured: string[];
    type: MultilingualString[];
    additionalType: IdentifierString[];
    accessibility: IdentifierString[];
    accessibilityNote: MultilingualString;
    audience: IdentifierString[];
    eventAttendanceMode: string;
    contactPoint: ContactPointDTO;
    isRepresentationOf: UriString;
    isTopLevelEvent: boolean;
    isFeaturedEvent: boolean;
    // recurringEvent: RecurringEvent;
    // offerConfiguration: OfferDTO;
    scheduleTimezone: string;
    facebookUrl: string;
    videoUrl: string;
    inLanguage: IdentifierString[];
    keywords: string[];
}
