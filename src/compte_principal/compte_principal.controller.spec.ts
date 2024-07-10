import { Test, TestingModule } from "@nestjs/testing";
import { ComptePrincipalController } from "./compte_principal.controller";
import { ComptePrincipalService } from "./compte_principal.service";

describe('ComptePrincipalController', () => {
  let controller: ComptePrincipalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComptePrincipalController],
      providers: [ComptePrincipalService],
    }).compile();

    controller = module.get<ComptePrincipalController>(ComptePrincipalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
