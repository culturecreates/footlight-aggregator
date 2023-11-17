import * as jsonld from 'jsonld';
import { SchemaOrgUrl } from '../enum/json-ld.enum';

export class JsonLdServiceHelper{
    static async compactJsonLd(jsonLdData: any){
        return await jsonld.compact(jsonLdData, SchemaOrgUrl.SCHEMA_ORG)
    }
}