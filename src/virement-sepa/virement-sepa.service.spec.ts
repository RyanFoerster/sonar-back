import { Test, TestingModule } from '@nestjs/testing';
import { VirementSepaService } from './virement-sepa.service';

describe('VirementSepaService', () => {
  let service: VirementSepaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VirementSepaService],
    }).compile();

    service = module.get<VirementSepaService>(VirementSepaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
