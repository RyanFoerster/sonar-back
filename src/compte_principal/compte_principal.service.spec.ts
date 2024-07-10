import { Test, TestingModule } from "@nestjs/testing";
import { ComptePrincipalService } from "./compte_principal.service";

describe('ComptePrincipalService', () => {
  let service: ComptePrincipalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComptePrincipalService],
    }).compile();

    service = module.get<ComptePrincipalService>(ComptePrincipalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
