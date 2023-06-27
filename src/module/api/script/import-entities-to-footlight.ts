import { Command, CommandRunner, Option } from "nest-commander";
import { AuthenticationService, EventService, ShutdownService } from "../service";
import { forwardRef, Inject } from "@nestjs/common";

interface BasicCommandOptions {
  userName: string;
  password: string;
  source: string;
  calendar: string;
  footlightBaseUrl: string;
}

@Command({ name: "import:entities", description: "Import entities to footlight-calendar" })
export class ImportEntities extends CommandRunner {
  constructor(
    @Inject(forwardRef(() => AuthenticationService))
    private readonly _authService: AuthenticationService,
    @Inject(forwardRef(() => EventService))
    private readonly _eventService: EventService,
    @Inject(forwardRef(() => ShutdownService))
    private readonly _shutDownService: ShutdownService
  ) {
    super();
  }

  async run(
    passedParam: string[],
    options?: BasicCommandOptions
  ): Promise<void> {
    console.log(`username:${options.userName}, password:${options.password}, source:${options.source},url:${options.footlightBaseUrl}`);
    const authenticationResponse = await this._authService.login({
      email: options.userName,
      password: options.password
    }, options.footlightBaseUrl);
    if (authenticationResponse?.accessToken) {
      console.log("Authentication successful");
      console.log(`authToken:${authenticationResponse?.accessToken}`);
      await this._eventService.syncEntities(authenticationResponse.accessToken, options?.calendar, options?.source, options?.footlightBaseUrl);
    } else {
      console.error("Authentication failed");
    }
    await this._shutDownService.shutdown();
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

}