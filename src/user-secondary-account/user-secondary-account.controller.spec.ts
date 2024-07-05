import { Test, TestingModule } from '@nestjs/testing';
import { UserSecondaryAccountController } from './user-secondary-account.controller';
import { UserSecondaryAccountService } from './user-secondary-account.service';

describe('UserSecondaryAccountController', () => {
  let controller: UserSecondaryAccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSecondaryAccountController],
      providers: [UserSecondaryAccountService],
    }).compile();

    controller = module.get<UserSecondaryAccountController>(UserSecondaryAccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
