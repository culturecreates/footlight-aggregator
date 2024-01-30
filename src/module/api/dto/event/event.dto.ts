import {IdentifierString, MultilingualString, SameAs, UriString} from "../../model";
import {ContactPointDTO} from "../contact-point";
import {PersonOrganizationWithRole} from "../../model/personOrganizationWithRole.model";
import {EventStatus, OfferCategory} from "../../enum/event.enum";
import {Location} from "../../model/location.model";
import {Image} from "../shared";
import { PriceCurrency } from "../../enum";

export class EventDTO {

    name: MultilingualString;
    description?: MultilingualString;
    image: Image;
    sameAs: SameAs[];
    locationId?: Location;
    url?: UriString;
    alternateName?: MultilingualString[];
    duration?: string;
    startDate: string;
    endDate: string;
    startDateTime: Date;
    endDateTime: Date;
    eventStatus?: EventStatus;
    organizers?: PersonOrganizationWithRole[];
    performers?: PersonOrganizationWithRole[];
    collaborators?: PersonOrganizationWithRole[];
    superEvent?: IdentifierString;
    workFeatured?: string[];
    type?: MultilingualString[];
    additionalType?: IdentifierString[];
    accessibility?: IdentifierString[];
    accessibilityNote?: MultilingualString;
    audience?: IdentifierString[];
    eventAttendanceMode?: string;
    contactPoint?: ContactPointDTO;
    isRepresentationOf?: UriString;
    isTopLevelEvent?: boolean;
    isFeaturedEvent?: boolean;
    // recurringEvent: RecurringEvent;
    // offerConfiguration: OfferDTO;
    scheduleTimezone?: string;
    facebookUrl?: string;
    videoUrl?: string;
    inLanguage?: IdentifierString[];
    keywords?: string[];
    uri?:string;
}

export class EventDTOCaligram {

    name: MultilingualString;
    description?: MultilingualString;
    image: Image;
    sameAs: SameAs[];
    locationId?: Location;
    url?: UriString;
    alternateName?: MultilingualString[];
    duration?: string;
    startDate: string;
    endDate: string;
    startDateTime: Date;
    endDateTime: Date;
    eventStatus?: EventStatus;
    organizers?: PersonOrganizationWithRole[];
    performers?: PersonOrganizationWithRole[];
    collaborators?: PersonOrganizationWithRole[];
    superEvent?: IdentifierString;
    workFeatured?: string[];
    type?: MultilingualString[];
    additionalType?: IdentifierString[];
    accessibility?: IdentifierString[];
    accessibilityNote?: MultilingualString;
    audience?: IdentifierString[];
    eventAttendanceMode?: string;
    contactPoint?: ContactPointDTO;
    isRepresentationOf?: UriString;
    isTopLevelEvent?: boolean;
    isFeaturedEvent?: boolean;
    offerConfiguration: OfferDTO;
    scheduleTimezone?: string;
    facebookUrl?: string;
    videoUrl?: string;
    inLanguage?: IdentifierString[];
    keywords?: string[];
    uri?:string;
}


export class OfferDTO {
    name?: MultilingualString;
    description?: MultilingualString;
    url?: UriString;
    category?: OfferCategory;
    prices?: OfferPrice[];
    priceCurrency?: PriceCurrency;
    validFrom?: Date;
  }
  
  export class OfferPrice {
    price: number;
    name: MultilingualString;
  }
