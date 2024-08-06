import { Test, TestingModule } from '@nestjs/testing';
import { VirementSepaController } from './virement-sepa.controller';
import { VirementSepaService } from './virement-sepa.service';

describe('VirementSepaController', () => {
  let controller: VirementSepaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VirementSepaController],
      providers: [VirementSepaService],
    }).compile();

    controller = module.get<VirementSepaController>(VirementSepaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
