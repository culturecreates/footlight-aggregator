import { Command, CommandRunner, Option } from "nest-commander";
import { AuthenticationService, LoggerService, EventService } from "../service";
import { forwardRef, Inject } from "@nestjs/common";

interface BasicCommandOptions {
  userName: string;
  password: string;
  calendar: string;
  mappingFile: string;
  footlightBaseUrl: string;
}

@Command({ name: "import:caligram", description: "Import caligram entities to footlight-calendar" })
export class ImportCaligramEntities extends CommandRunner {
  constructor(
    @Inject(forwardRef(() => AuthenticationService))
    private readonly _authService: AuthenticationService,
    @Inject(forwardRef(() => EventService))
    private readonly _eventService: EventService,
    @Inject(forwardRef(() => LoggerService))
    private readonly _loggerService: LoggerService
  ) {
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
        this._loggerService.infoLogs("Authentication successful");
        await this._eventService.importCaligram(authenticationResponse.accessToken, options?.footlightBaseUrl, options?.calendar, options?.mappingFile);
      } else {
        this._loggerService.errorLogs("Authentication failed");
        process.exit(1)
      }
    } catch(e){
      this._loggerService.errorLogs(` Something went wrong. ${e.message}`);
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
    flags: "-m, --mapping-file [string]",
    description: "Mapping file url",
    required: true
  })
  parseMappingFile(val: string): string {
    return val;
  }
}