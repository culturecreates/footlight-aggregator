import { EventService, PlaceService, PersonOrganizationService, OrganizationService, PersonService, PostalAddressService, SharedService, LoggerService } from ".."
import { Test, TestingModule } from "@nestjs/testing";
import { TaxonomyService } from "../taxonomy";


describe("Testing cms mapping data", () => {

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

    async function createMockPatternToConceptIdMapping(){
      const mappingUrl = "https://raw.githubusercontent.com/culturecreates/footlight-aggregator/main/data/co-motion-cms-mapping.json"
      const patternToConceptIdMapping = (await SharedService.fetchJsonFromUrl(mappingUrl))?.data;
      return patternToConceptIdMapping;
    }

    // Mocking event type concept ids from taxonomy
    function createMockexistingEventTypeConceptIDs(){
      const existingEventTypeConceptIDs  = [
        "63bc57dd1c6b6c005aad5778",
        "63c01a771c6b6c005aad85c0",
        "63c01a771c6b6c005aad85b8",
        "63c01a771c6b6c005aad85ba",
        "63c01a771c6b6c005aad85c6",
        "63c01a771c6b6c005aad85bc",
        "643eb7866f70e40064e0e7a0",
        "63c01a771c6b6c005aad85c4",
        "63bf00421c6b6c005aad80a2",
        "63c01e911c6b6c005aad89a6",
        "63c01a771c6b6c005aad85c2",
        "63bc57dd1c6b6c005aad577c",
        "63bc57dd1c6b6c005aad577a",
        "643eb7866f70e40064e0e7a7",
        "63c01b741c6b6c005aad86c0",
        "643d95811639f100642b4ba7",
        "63c01b741c6b6c005aad86c4",
        "63c84d71230627006f5655d0",
        "64651bdcad41e50064355b0c",
        "643eb7866f70e40064e0e7fc",
        "643d95811639f100642b4b8f",
        "643d95811639f100642b4b8b",
        "643d95811639f100642b4b95",
        "643d95811639f100642b4b9f",
        "643d95811639f100642b4b99"
      ]    
      return existingEventTypeConceptIDs;
    }

    // Mocking audience concept ids from taxonomy
    function createMockexistingAudienceConceptIDs(){
      const existingAudienceConceptIDs = [
        "63bc55b31c6b6c005aad56c2",
        "63bc55b31c6b6c005aad56c0",
        "63bc55b31c6b6c005aad56be",
        "64413a0d7a2993006450baa6"
      ]
      return existingAudienceConceptIDs;
    }

    //Event data recieved from ArtsData
    function createMockTestEventWithKeywordAndAudience(){ 
      return(
          {
              "uri": "http://kg.artsdata.ca/resource/K23-599",
              "type": "Event",
              "audience": [
                "Famille",
                "Enfant"
              ],
              "description": {
                "fr": "André Lemire met en scène une galerie d’automates fragiles, incomplets et partiellement dysfonctionnels, relégués dans un lieu d’entreposage. \n\nLa cour des ossements est cet espace où on dépose ce qui ne sert plus. C’est l’endroit où les décors se reposent d’un spectacle en perpétuel déplacement, là où s’alignent les avions retirés de la circulation, le matériel militaire tombé en désuétude. C’est un lieu de transition, d’oubli et parfois d’abandon.\n\nCe qui hier encore nous émerveillait, à quoi ressemble-t-il, une fois tombé en désuétude?\n\nL’exposition se veut une réflexion sur ce que nous ne terminons pas, sur le temps qui s’arrête parfois au mauvais moment, sur la marche imparfaite de toute chose.\n\nLe vernissage de l'exposition aura lieu le mercredi, 11 octobre 2023, de 18 h à 20 h.\n\nImage : André Lemire, La cour des ossements, 2022.\n"
              },
              "endDate": "2023-12-10",
              "keywords": [
                "[\"Musique\", \"Blues\", \"Rock\"]"
              ],
              "location": {
                "Place": "http://kg.artsdata.ca/resource/K5-13"
              },
              "offers": {
                "uri": "http://kg.footlight.io/resource/gatineau-cloud_33145#AggregateOffer",
                "type": "AggregateOffer",
                "additionalType": "Free",
              },
              "name": {
                "fr": "La Cour des ossements, une exposition d'André Lemire"
              },
              "sameAs": [
                {
                  "uri": "http://kg.artsdata.ca/resource/K23-599"
                }
              ],
              "startDate": "2023-10-11",
            }
          )
    }
    function createMockTestEventWithAudience(){ 
      return(
        {
            "uri": "http://kg.artsdata.ca/resource/K23-599",
            "type": "Event",
            "description": {
              "fr": "André Lemire met en scène une galerie d’automates fragiles, incomplets et partiellement dysfonctionnels, relégués dans un lieu d’entreposage. \n\nLa cour des ossements est cet espace où on dépose ce qui ne sert plus. C’est l’endroit où les décors se reposent d’un spectacle en perpétuel déplacement, là où s’alignent les avions retirés de la circulation, le matériel militaire tombé en désuétude. C’est un lieu de transition, d’oubli et parfois d’abandon.\n\nCe qui hier encore nous émerveillait, à quoi ressemble-t-il, une fois tombé en désuétude?\n\nL’exposition se veut une réflexion sur ce que nous ne terminons pas, sur le temps qui s’arrête parfois au mauvais moment, sur la marche imparfaite de toute chose.\n\nLe vernissage de l'exposition aura lieu le mercredi, 11 octobre 2023, de 18 h à 20 h.\n\nImage : André Lemire, La cour des ossements, 2022.\n"
            },
            "audience": [
              "Famille",
              "Enfant"
            ],
            "endDate": "2023-12-10",
            "location": {
              "Place": "http://kg.artsdata.ca/resource/K5-13"
            },
            "offers": {
              "uri": "http://kg.footlight.io/resource/gatineau-cloud_33145#AggregateOffer",
              "type": "AggregateOffer",
              "additionalType": "Free",
            },
            "name": {
              "fr": "La Cour des ossements, une exposition d'André Lemire"
            },
            "sameAs": [
              {
                "uri": "http://kg.artsdata.ca/resource/K23-599"
              }
            ],
            "startDate": "2023-10-11",
          }
        )
    }
    function createMockTestEventWithKeyword(){ 
      return(
        {
            "uri": "http://kg.artsdata.ca/resource/K23-599",
            "type": "Event",
            "description": {
              "fr": "André Lemire met en scène une galerie d’automates fragiles, incomplets et partiellement dysfonctionnels, relégués dans un lieu d’entreposage. \n\nLa cour des ossements est cet espace où on dépose ce qui ne sert plus. C’est l’endroit où les décors se reposent d’un spectacle en perpétuel déplacement, là où s’alignent les avions retirés de la circulation, le matériel militaire tombé en désuétude. C’est un lieu de transition, d’oubli et parfois d’abandon.\n\nCe qui hier encore nous émerveillait, à quoi ressemble-t-il, une fois tombé en désuétude?\n\nL’exposition se veut une réflexion sur ce que nous ne terminons pas, sur le temps qui s’arrête parfois au mauvais moment, sur la marche imparfaite de toute chose.\n\nLe vernissage de l'exposition aura lieu le mercredi, 11 octobre 2023, de 18 h à 20 h.\n\nImage : André Lemire, La cour des ossements, 2022.\n"
            },
            "endDate": "2023-12-10",
            "keywords": [
              "[\"Musique\", \"Blues\", \"Rock\"]"
            ],
            "location": {
              "Place": "http://kg.artsdata.ca/resource/K5-13"
            },
            "offers": {
              "uri": "http://kg.footlight.io/resource/gatineau-cloud_33145#AggregateOffer",
              "type": "AggregateOffer",
              "additionalType": "Free",
            },
            "name": {
              "fr": "La Cour des ossements, une exposition d'André Lemire"
            },
            "sameAs": [
              {
                "uri": "http://kg.artsdata.ca/resource/K23-599"
              }
            ],
            "startDate": "2023-10-11",
          }
        )
    }

    describe("Format events from arts data", ()=>{
      const testCases = [
        {
          description: "When both keywords and audience data is provoided",
          event: createMockTestEventWithKeywordAndAudience(),
          additionalType: [
            { entityId: '63bc57dd1c6b6c005aad577c' },
            { entityId: '643d95811639f100642b4b8b' },
            { entityId: '643d95811639f100642b4b9f' }
          ],
          audience: [ { entityId: '63bc55b31c6b6c005aad56be' } ]
        },
        {
          description: "When only keyword is provided",
          event: createMockTestEventWithKeyword(),
          additionalType: [
            { entityId: '63bc57dd1c6b6c005aad577c' },
            { entityId: '643d95811639f100642b4b8b' },
            { entityId: '643d95811639f100642b4b9f' }
          ],
          audience: []
        },
        {
          description: "When only audience is provoided",
          event: createMockTestEventWithAudience(),
          additionalType: [ { entityId: '63c84d71230627006f5655d0' } ],
          audience: [ { entityId: '63bc55b31c6b6c005aad56be' } ]
        }
      ]
      for(const testEvent of testCases){
        it(testEvent.description, async () => {
        const mockPlaceService = {
          getFootlightIdentifier: jest.fn().mockResolvedValue('645bd8f67db98f0065dd251b'),
        };

        const mockPersonOrganizationService = {
          fetchPersonOrganizationFromFootlight: jest.fn().mockResolvedValue('performers'),
        };

        jest.spyOn(placeService, 'getFootlightIdentifier').mockImplementation(mockPlaceService.getFootlightIdentifier);
        jest.spyOn(personOrganizationService, 'fetchPersonOrganizationFromFootlight').mockImplementation(mockPersonOrganizationService.fetchPersonOrganizationFromFootlight);

        const sampleEvent = testEvent.event
        const patternToConceptIdMapping = await createMockPatternToConceptIdMapping();
        const existingEventTypeConceptIDs = createMockexistingEventTypeConceptIDs();
        const existingAudienceConceptIDs = createMockexistingAudienceConceptIDs()

        const formattedEvent = await eventService.formatEvent(
          'calendarId',
          'token',
          sampleEvent,
          'footlightBaseUrl',
          'currentUserId',
          patternToConceptIdMapping,
          existingEventTypeConceptIDs,
          existingAudienceConceptIDs
        );

        expect(formattedEvent.additionalType).toEqual(testEvent.additionalType);
        expect(formattedEvent.audience).toEqual(testEvent.audience);

        });
      }

    })
})