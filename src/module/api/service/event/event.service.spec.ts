import { EventService, PlaceService, PersonOrganizationService, OrganizationService, PersonService, PostalAddressService, SharedService, LoggerService } from "../../service"
import { Test, TestingModule } from "@nestjs/testing";
import { TaxonomyService } from "../taxonomy";
import { EventProperty, OfferCategory } from "../../enum";


describe("Event service tests", () => {

    jest.setTimeout(20000);

    let eventService: EventService;
    let placeService: PlaceService;
    let organizationService: OrganizationService;
    let personService: PersonService;
    let postalAddressService: PostalAddressService;
    let taxonomyService: TaxonomyService;
    let sharedService: SharedService;
    let loggerService: LoggerService;
    let personOrganizationService: PersonOrganizationService;


    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [EventService, PlaceService, OrganizationService, PersonService, PostalAddressService,
            TaxonomyService, SharedService, LoggerService , PersonOrganizationService],
        }).compile();
    
        eventService = module.get<EventService>(EventService);
        placeService = module.get<PlaceService>(PlaceService);
        organizationService = module.get<OrganizationService>(OrganizationService);
        personService = module.get<PersonService>(PersonService);
        postalAddressService = module.get<PostalAddressService>(PostalAddressService);
        taxonomyService = module.get<TaxonomyService>(TaxonomyService);
        sharedService = module.get<SharedService>(SharedService);
        loggerService = module.get<LoggerService>(LoggerService);
        personOrganizationService = module.get<PersonOrganizationService>(PersonOrganizationService);

    });

    //Data recieved from ArtsData
    function createMockEventWithSingleOffer(){ 
        return(
            {
                "uri": "http://kg.artsdata.ca/resource/K23-599",
                "type": "Event",
                "audience": [
                  "Tous"
                ],
                "description": {
                  "fr": "André Lemire met en scène une galerie d’automates fragiles, incomplets et partiellement dysfonctionnels, relégués dans un lieu d’entreposage. \n\nLa cour des ossements est cet espace où on dépose ce qui ne sert plus. C’est l’endroit où les décors se reposent d’un spectacle en perpétuel déplacement, là où s’alignent les avions retirés de la circulation, le matériel militaire tombé en désuétude. C’est un lieu de transition, d’oubli et parfois d’abandon.\n\nCe qui hier encore nous émerveillait, à quoi ressemble-t-il, une fois tombé en désuétude?\n\nL’exposition se veut une réflexion sur ce que nous ne terminons pas, sur le temps qui s’arrête parfois au mauvais moment, sur la marche imparfaite de toute chose.\n\nLe vernissage de l'exposition aura lieu le mercredi, 11 octobre 2023, de 18 h à 20 h.\n\nImage : André Lemire, La cour des ossements, 2022.\n"
                },
                "endDate": "2023-12-10",
                "image": {
                  "uri": "http://kg.footlight.io/resource/gatineau-cloud_33145#imageObject",
                  "url": {
                    "uri": "https://calendrier.gatineau.cloud/upload/calendrier/8a265dc3-b460-41a5-8ffc-42d96919bfb9.jpg"
                  }
                },
                "keywords": [
                  "[\"Galeries d'art et expositions\", \"Expositions\", \"Exposition\"]"
                ],
                "location": {
                  "Place": "http://kg.artsdata.ca/resource/K5-13"
                },
                "name": {
                  "fr": "La Cour des ossements, une exposition d'André Lemire"
                },
                "offers": {
                  "uri": "http://kg.footlight.io/resource/gatineau-cloud_33145#AggregateOffer",
                  "type": "AggregateOffer",
                  "additionalType": "Free",
                },
                "organizer": [
                  "http://kg.artsdata.ca/resource/K16-114"
                ],
                "sameAs": [
                  {
                    "uri": "http://kg.artsdata.ca/resource/K23-599"
                  },
                  {
                    "uri": "http://kg.footlight.io/resource/gatineau-cloud_33145"
                  }
                ],
                "startDate": "2023-10-11",
                "url": {
                  "uri": "https://calendrier.gatineau.cloud/calendrier/evenement.aspx?langue=fr-ca&id_evenement=33145"
                }
              }
            )
    }

    function createMockEventWithExcludedTaxonomy(){
      return(
        {
            "uri": "http://kg.artsdata.ca/resource/K23-599",
            "type": "Event",
            "audience": [
              "Tous"
            ],
            "description": {
              "fr": "André Lemire met en scène une galerie d’automates fragiles, incomplets et partiellement dysfonctionnels, relégués dans un lieu d’entreposage. \n\nLa cour des ossements est cet espace où on dépose ce qui ne sert plus. C’est l’endroit où les décors se reposent d’un spectacle en perpétuel déplacement, là où s’alignent les avions retirés de la circulation, le matériel militaire tombé en désuétude. C’est un lieu de transition, d’oubli et parfois d’abandon.\n\nCe qui hier encore nous émerveillait, à quoi ressemble-t-il, une fois tombé en désuétude?\n\nL’exposition se veut une réflexion sur ce que nous ne terminons pas, sur le temps qui s’arrête parfois au mauvais moment, sur la marche imparfaite de toute chose.\n\nLe vernissage de l'exposition aura lieu le mercredi, 11 octobre 2023, de 18 h à 20 h.\n\nImage : André Lemire, La cour des ossements, 2022.\n"
            },
            "endDate": "2023-12-10",
            "image": {
              "uri": "http://kg.footlight.io/resource/gatineau-cloud_33145#imageObject",
              "url": {
                "uri": "https://calendrier.gatineau.cloud/upload/calendrier/8a265dc3-b460-41a5-8ffc-42d96919bfb9.jpg"
              }
            },
            "keywords": [
              "Boxe"
            ],
            "location": {
              "Place": "http://kg.artsdata.ca/resource/K5-13"
            },
            "name": {
              "fr": "La Cour des ossements, une exposition d'André Lemire"
            },
            "offers": {
              "uri": "http://kg.footlight.io/resource/gatineau-cloud_33145#AggregateOffer",
              "type": "AggregateOffer",
              "additionalType": "Free",
            },
            "organizer": [
              "http://kg.artsdata.ca/resource/K16-114"
            ],
            "sameAs": [
              {
                "uri": "http://kg.artsdata.ca/resource/K23-599"
              },
              {
                "uri": "http://kg.footlight.io/resource/gatineau-cloud_33145"
              }
            ],
            "startDate": "2023-10-11",
            "url": {
              "uri": "https://calendrier.gatineau.cloud/calendrier/evenement.aspx?langue=fr-ca&id_evenement=33145"
            }
          }
        )
    }


    it('should set offerconfiguration.category as `FREE` if aggregator.additionalType is `FREE`', async () => {
      const mockPlaceService = {
        getFootlightIdentifier: jest.fn().mockResolvedValue('645bd8f67db98f0065dd251b'),
      };

      const mockPersonOrganizationService = {
        fetchPersonOrganizationFromFootlight: jest.fn().mockResolvedValue('performers'),
      };

      jest.spyOn(placeService, 'getFootlightIdentifier').mockImplementation(mockPlaceService.getFootlightIdentifier);
      jest.spyOn(personOrganizationService, 'fetchPersonOrganizationFromFootlight').mockImplementation(mockPersonOrganizationService.fetchPersonOrganizationFromFootlight);

      const sampleEvent = createMockEventWithSingleOffer()

      const formattedEvent = await eventService.formatEvent(
        'calendarId',
        'token',
        sampleEvent,
        'footlightBaseUrl',
        'currentUserId',
        undefined,
        'Canada/Eastern',
        undefined,
        undefined
      );

      const offerConfiguration = formattedEvent.offerConfiguration

      expect(offerConfiguration.category).toEqual(OfferCategory.FREE)

    });

    it('should set offerconfiguration.category as `PAID` if aggregator.additionalType is `PAID`', async () => {
      const mockPlaceService = {
        getFootlightIdentifier: jest.fn().mockResolvedValue('645bd8f67db98f0065dd251b'),
      };

      const mockPersonOrganizationService = {
        fetchPersonOrganizationFromFootlight: jest.fn().mockResolvedValue('performers'),
      };

      jest.spyOn(placeService, 'getFootlightIdentifier').mockImplementation(mockPlaceService.getFootlightIdentifier);
      jest.spyOn(personOrganizationService, 'fetchPersonOrganizationFromFootlight').mockImplementation(mockPersonOrganizationService.fetchPersonOrganizationFromFootlight);

      const sampleEvent = createMockEventWithSingleOffer()
      sampleEvent.offers.additionalType = "Paid"

      const formattedEvent = await eventService.formatEvent(
        'calendarId',
        'token',
        sampleEvent,
        'footlightBaseUrl',
        'currentUserId',
        undefined,
        'Canada/Eastern',
        undefined,
        undefined
      );

      const offerConfiguration = formattedEvent.offerConfiguration
      expect(offerConfiguration.category).toEqual(OfferCategory.PAYING)

    });

    it('should prevent event from being synced with CMS if excluded taxonomy is present', async () => {
      const patternToConceptIdMapping = [
        {
          "fieldName": "additionalType",
          "inputProperty": [
            "keywords"
          ],
          "mapping": {
            "Arts visuels": [
              "63bc57dd1c6b6c005aad5778"
            ],
            "Art numérique": [
              "63c01a771c6b6c005aad85c0"
            ],
            "Cinéma": [
              "63c01a771c6b6c005aad85b8"
            ],
            "Cirque": [
              "63c01a771c6b6c005aad85ba"
            ],
            "Culture scientifique": [
              "63c01a771c6b6c005aad85c6"
            ]
          },
          "excludeValues": [
            "Boxe"
          ]
        }
      ]
      expect(() => eventService.checkExcludedValues(createMockEventWithExcludedTaxonomy(), patternToConceptIdMapping, EventProperty.ADDITIONAL_TYPE)).toThrow();    
    })
})