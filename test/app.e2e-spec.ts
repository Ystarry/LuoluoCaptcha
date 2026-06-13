import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/captcha/spec (GET) should return PNG', () => {
    return request(app.getHttpServer())
      .get('/captcha/spec')
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect(res => {
        expect(res.headers['x-captcha-text']).toBeDefined();
      });
  });

  it('/captcha/arithmetic (GET) should return PNG with computed result', () => {
    return request(app.getHttpServer())
      .get('/captcha/arithmetic')
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect(res => {
        const text = decodeURIComponent(res.headers['x-captcha-text']);
        expect(text).toMatch(/^\d+$/);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
