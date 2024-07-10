import { Test, TestingModule } from "@nestjs/testing";
import { CompteGroupeService } from "./compte_groupe.service";

describe('CompteGroupeService', () => {
  let service: CompteGroupeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompteGroupeService],
    }).compile();

    service = module.get<CompteGroupeService>(CompteGroupeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
