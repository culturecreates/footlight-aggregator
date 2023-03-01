import {NestFactory} from '@nestjs/core';
import {ExpressAdapter} from '@nestjs/platform-express';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import * as express from 'express';
import * as http from 'http';
import {AppModule} from './app.module';
import {APPLICATION} from "./module/api/config";

async function bootstrap() {

    const server = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {cors: true});
    const config = new DocumentBuilder()
        .setTitle('Footlight ETL Tool')
        .setDescription('The footlight etl tool')
        .setVersion('v0.0.0')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.init();

    http.createServer(server).listen(APPLICATION.PORT);
}

bootstrap();