import {Module} from '@nestjs/common';
import {ApiModule} from "./module/api/api.module";

@Module({
    controllers: [],
    imports: [ApiModule],
    providers: []
})
export class AppModule {
}
