import {IdentifierString, UriString} from "../../model";

export class Image {
    original?: IdentifierString;
    large?: IdentifierString;
    thumbnail?: IdentifierString;
    url?: UriString;
}