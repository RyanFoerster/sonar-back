import { Test, TestingModule } from '@nestjs/testing';
import { GroupeInvitationService } from './groupe-invitation.service';

describe('GroupeInvitationService', () => {
  let service: GroupeInvitationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupeInvitationService],
    }).compile();

    service = module.get<GroupeInvitationService>(GroupeInvitationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
