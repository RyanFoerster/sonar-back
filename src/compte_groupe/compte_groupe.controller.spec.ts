import { Test, TestingModule } from "@nestjs/testing";
import { CompteGroupeController } from "./compte_groupe.controller";
import { CompteGroupeService } from "./compte_groupe.service";

describe('CompteGroupeController', () => {
  let controller: CompteGroupeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompteGroupeController],
      providers: [CompteGroupeService],
    }).compile();

    controller = module.get<CompteGroupeController>(CompteGroupeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
