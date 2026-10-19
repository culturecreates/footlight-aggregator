import { ArtsdataChangeLogService } from "./artsdata-change-log.service";

const SRC = "http://lod.footlight.io/resource/691ea2236278b1919c520853";
const EVENT = "http://kg.artsdata.ca/resource/K23-7813";
const ACTIVITY = "http://kg.artsdata.ca/resource/K23-7813_refresh_2026-10-01T15:59:22+00:00";
const CHANGED_AT = "2026-10-01T15:59:22+00:00";

function row(property: string, change: string, value: any, extra: any = {}) {
    return {
        changedAt: {type: "literal", value: CHANGED_AT},
        activity: {type: "uri", value: ACTIVITY},
        event: {type: "uri", value: EVENT},
        src: {type: "uri", value: SRC},
        property: {type: "uri", value: `http://schema.org/${property}`},
        change: {type: "literal", value: change},
        value,
        ...extra
    };
}

describe("ArtsdataChangeLogService", () => {

    it("pairs removed and added values of the same refresh into one change", () => {
        const result = ArtsdataChangeLogService.groupChanges([
            row("name", "added", {type: "literal", "xml:lang": "fr", value: "Record NºV"}),
            row("name", "removed", {type: "literal", "xml:lang": "fr", value: "Bleu Jeans Bleu Record NºV"}),
        ]);
        expect(result).toEqual([{
            id: "691ea2236278b1919c520853",
            artsdataUri: EVENT,
            changes: [{
                property: "name",
                changedAt: CHANGED_AT,
                removed: [{value: "Bleu Jeans Bleu Record NºV", language: "fr"}],
                added: [{value: "Record NºV", language: "fr"}],
            }]
        }]);
    });

    it("adds place names to location values and removes duplicate rows", () => {
        const place = {type: "uri", value: "http://kg.artsdata.ca/resource/K11-1"};
        const result = ArtsdataChangeLogService.groupChanges([
            row("location", "added", place, {valueName: {type: "literal", "xml:lang": "fr", value: "Salle André-Mathieu"}}),
            row("location", "added", place, {valueName: {type: "literal", "xml:lang": "en", value: "André-Mathieu Hall"}}),
        ]);
        expect(result[0].changes[0].added).toEqual([{
            value: "http://kg.artsdata.ca/resource/K11-1",
            name: {fr: "Salle André-Mathieu", en: "André-Mathieu Hall"}
        }]);
    });

    it("shortens event status values", () => {
        const result = ArtsdataChangeLogService.groupChanges([
            row("eventStatus", "added", {type: "uri", value: "http://schema.org/EventCancelled"}),
        ]);
        expect(result[0].changes[0].added).toEqual([{value: "EventCancelled"}]);
    });

    it("ignores rows that are not Footlight events", () => {
        const result = ArtsdataChangeLogService.groupChanges([
            row("name", "added", {type: "literal", value: "x"}, {src: {type: "uri", value: "http://kg.footlight.io/resource/x"}}),
        ]);
        expect(result).toEqual([]);
    });

    it("normalises graph URIs and rejects unsafe ones", () => {
        expect(ArtsdataChangeLogService.normaliseGraphUri("kg.artsdata.ca/culture-creates/footlight/crowstheatre-com"))
            .toBe("http://kg.artsdata.ca/culture-creates/footlight/crowstheatre-com");
        expect(() => ArtsdataChangeLogService.normaliseGraphUri("http://x> } DROP ALL #")).toThrow();
    });
});
