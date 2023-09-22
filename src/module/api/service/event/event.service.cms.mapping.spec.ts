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
      const patternToConceptIdMapping = [
        {
          "fieldName": "additionalType",
          "inputProperty": [
            "keywords"
          ],
          "mapping": { 
            "*BadRegEx*": [
              "BadRegExID"
            ],
            "Musique": [
              "MusicID"
            ],
            ".*Blues.*": [
              "BluesID"
            ],
            ".*Rock.*": [
              "RockID"
            ],
            "DEFAULT": [
              "DefaultID"
            ]
          }
        },
        {
          "fieldName": "audience",
          "inputProperty": [
            "audience"
          ],
          "mapping": {
            "Adulte": [
              "AdulteID"
            ],
            "Adolescent": [
              "AdolescentID"
            ],
            "Famille": [
              "FamilleAndEnfantID"
            ],
            "Enfant": [
              "FamilleAndEnfantID"
            ]
          }
        }
      ]
      return patternToConceptIdMapping;
    }

    // Mocking event type concept ids from taxonomy
    function createMockexistingEventTypeConceptIDs(){
      const existingEventTypeConceptIDs  = [
        "MusicID",
        "BluesID",
        "RockID",
        "DefaultID"
      ]    
      return existingEventTypeConceptIDs;
    }

    // Mocking audience concept ids from taxonomy
    function createMockexistingAudienceConceptIDs(){
      const existingAudienceConceptIDs = [
        "AdulteID",
        "AdolescentID",
        "FamilleAndEnfantID",
        "FamilleAndEnfantID"
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
    function createMockTestEventWithBluesRockKeyword(){ 
      return(
        {
            "uri": "http://kg.artsdata.ca/resource/K23-599",
            "type": "Event",
            "description": {
              "fr": "André Lemire met en scène une galerie d’automates fragiles, incomplets et partiellement dysfonctionnels, relégués dans un lieu d’entreposage. \n\nLa cour des ossements est cet espace où on dépose ce qui ne sert plus. C’est l’endroit où les décors se reposent d’un spectacle en perpétuel déplacement, là où s’alignent les avions retirés de la circulation, le matériel militaire tombé en désuétude. C’est un lieu de transition, d’oubli et parfois d’abandon.\n\nCe qui hier encore nous émerveillait, à quoi ressemble-t-il, une fois tombé en désuétude?\n\nL’exposition se veut une réflexion sur ce que nous ne terminons pas, sur le temps qui s’arrête parfois au mauvais moment, sur la marche imparfaite de toute chose.\n\nLe vernissage de l'exposition aura lieu le mercredi, 11 octobre 2023, de 18 h à 20 h.\n\nImage : André Lemire, La cour des ossements, 2022.\n"
            },
            "endDate": "2023-12-10",
            "keywords": [
              "[\"Musique\", \"Blues / rock\"]"
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
            { entityId: 'MusicID' },
            { entityId: 'BluesID' },
            { entityId: 'RockID' }
          ],
          audience: [ { entityId: 'FamilleAndEnfantID' } ]
        },
        {
          description: "When only keyword is provided",
          event: createMockTestEventWithKeyword(),
          additionalType: [
            { entityId: 'MusicID' },
            { entityId: 'BluesID' },
            { entityId: 'RockID' }
          ],
          audience: []
        },
        {
          description: "When only audience is provided",
          event: createMockTestEventWithAudience(),
          additionalType: [ { entityId: 'DefaultID' } ],
          audience: [ { entityId: 'FamilleAndEnfantID' } ]
        },
        {
          description: "When keyword has Blues and Rock together",
          event: createMockTestEventWithBluesRockKeyword(),
          additionalType: [
            { entityId: 'MusicID' },
            { entityId: 'BluesID' },
            { entityId: 'RockID' }
          ],
          audience: []
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