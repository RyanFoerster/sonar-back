import { Test, TestingModule } from '@nestjs/testing';
import { UserSecondaryAccountService } from './user-secondary-account.service';

describe('UserSecondaryAccountService', () => {
  let service: UserSecondaryAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSecondaryAccountService],
    }).compile();

    service = module.get<UserSecondaryAccountService>(UserSecondaryAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
