import { Test, TestingModule } from '@nestjs/testing';
import { BceService } from './bce.service';

describe('BceService', () => {
  let service: BceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BceService],
    }).compile();

    service = module.get<BceService>(BceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
