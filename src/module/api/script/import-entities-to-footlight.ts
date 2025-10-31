import {Command, CommandRunner, Option} from "nest-commander";
import {AuthenticationService, LoggerService, EventService} from "../service";
import {forwardRef, Inject} from "@nestjs/common";
import {QueryVersion} from "../enum";

interface BasicCommandOptions {
    userName: string;
    password: string;
    source: string;
    calendar: string;
    footlightBaseUrl: string;
    batchSize: number;
    mappingUrl?: string;
    queryVersion?: QueryVersion;
}

@Command({name: "import:entities", description: "Import entities to footlight-calendar"})
export class ImportEntities extends CommandRunner {
    constructor(
        @Inject(forwardRef(() => AuthenticationService))
        private readonly _authService: AuthenticationService,
        @Inject(forwardRef(() => EventService))
        private readonly _eventService: EventService,
        @Inject(forwardRef(() => LoggerService))
        private readonly _loggerService: LoggerService) {
        super();
    }

    async run(
        passedParam: string[],
        options?: BasicCommandOptions
    ): Promise<void> {
        try {
            const authenticationResponse = await this._authService.login({
                email: options.userName,
                password: options.password
            }, options.footlightBaseUrl);
            if (authenticationResponse?.accessToken) {
                await this._loggerService.infoLogs("Authentication successful");
                await this._eventService.syncEntities(authenticationResponse.accessToken, options?.calendar,
                    options?.source, options?.footlightBaseUrl, options?.batchSize, options?.mappingUrl,
                    options?.queryVersion);
            } else {
                await this._loggerService.errorLogs("Authentication failed");
                process.exit(1)
            }
        } catch (e) {
            await this._loggerService.errorLogs(` Something went wrong. ${e.message}`);
            process.exit(1)
        }

    }

    @Option({
        flags: "-u, --user-name [string]",
        description: "User name",
        required: true
    })
    parseUserName(val: string): string {
        return val;
    }

    @Option({
        flags: "-p, --password [string]",
        description: "Password",
        required: true
    })
    parsePassword(val: string): string {
        return val;
    }

    @Option({
        flags: "-s, --source [string]",
        description: "Source Url",
        required: true
    })
    parseSource(val: string): string {
        return val;
    }

    @Option({
        flags: "-c, --calendar [string]",
        description: "Calendar",
        required: true
    })
    parseCalendar(val: string): string {
        return val;
    }

    @Option({
        flags: "-i, --footlight-base-url [string]",
        description: "Footlight base url",
        required: true
    })
    parseFootlightBaseUrl(val: string): string {
        return val;
    }

    @Option({
        flags: "-b, --batch-size [number]",
        description: "Batch size",
        required: true
    })
    parseBatchSize(val: string): number {
        return Number.parseInt(val);
    }

    @Option({
        flags: "-m, --mapping-url [string]",
        description: "Mapping Url",
        required: false
    })
    parseMappingUrl(val: string): string {
        return val;
    }

    @Option({
        flags: "-q, --query-version [string]",
        description: "Query version",
        required: false
    })
    parseQueryVersion(val: string): string {
        if (QueryVersion.hasOwnProperty(val)) {
            return QueryVersion[val];
        }
        return undefined;
    }

}