import {Command, CommandRunner, Option} from "nest-commander";
import {ArtsdataChangeLogService, AuthenticationService, LoggerService} from "../service";
import {forwardRef, Inject} from "@nestjs/common";

interface NotifyChangesCommandOptions {
    userName: string;
    password: string;
    source: string;
    calendar: string;
    footlightBaseUrl: string;
    since?: string;
    lookbackHours?: number;
}

const DEFAULT_LOOKBACK_HOURS = 24;

@Command({
    name: "notify:artsdata-changes",
    description: "Notify the CMS about Artsdata changes on Footlight events of a calendar"
})
export class NotifyArtsdataChanges extends CommandRunner {
    constructor(
        @Inject(forwardRef(() => AuthenticationService))
        private readonly _authService: AuthenticationService,
        @Inject(forwardRef(() => ArtsdataChangeLogService))
        private readonly _changeLogService: ArtsdataChangeLogService,
        @Inject(forwardRef(() => LoggerService))
        private readonly _loggerService: LoggerService) {
        super();
    }

    async run(
        passedParam: string[],
        options?: NotifyChangesCommandOptions
    ): Promise<void> {
        try {
            const since = this._getSince(options);
            const authenticationResponse = await this._authService.login({
                email: options.userName,
                password: options.password
            }, options.footlightBaseUrl);
            if (authenticationResponse?.accessToken) {
                await this._loggerService.infoLogs("Authentication successful");
                await this._changeLogService.notifyEventChanges(authenticationResponse.accessToken, options.calendar,
                    options.source, options.footlightBaseUrl, since);
            } else {
                await this._loggerService.errorLogs("Authentication failed");
                process.exit(1)
            }
        } catch (e) {
            await this._loggerService.errorLogs(` Something went wrong. ${e.message}`);
            process.exit(1)
        }
    }

    private _getSince(options: NotifyChangesCommandOptions): Date {
        if (options?.since) {
            const since = new Date(options.since);
            if (isNaN(since.getTime())) {
                throw new Error(`Invalid --since date: ${options.since}`);
            }
            return since;
        }
        const lookbackHours = options?.lookbackHours || DEFAULT_LOOKBACK_HOURS;
        return new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
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
        description: "Source graph of the aggregator in Artsdata",
        required: true
    })
    parseSource(val: string): string {
        return val;
    }

    @Option({
        flags: "-c, --calendar [string]",
        description: "Calendar id or slug",
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
        flags: "--since [string]",
        description: "Only report changes made after this ISO date-time",
        required: false
    })
    parseSince(val: string): string {
        return val;
    }

    @Option({
        flags: "--lookback-hours [number]",
        description: `Hours to look back when --since is not given (default ${DEFAULT_LOOKBACK_HOURS})`,
        required: false
    })
    parseLookbackHours(val: string): number {
        return Number.parseInt(val);
    }
}
