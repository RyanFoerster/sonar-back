import { Test, TestingModule } from '@nestjs/testing';
import { GroupeInvitationController } from './groupe-invitation.controller';

describe('GroupeInvitationController', () => {
  let controller: GroupeInvitationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupeInvitationController],
    }).compile();

    controller = module.get<GroupeInvitationController>(GroupeInvitationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
