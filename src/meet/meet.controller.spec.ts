import { Test, TestingModule } from '@nestjs/testing';
import { MeetController } from './meet.controller';
import { MeetService } from './meet.service';

describe('MeetController', () => {
  let controller: MeetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetController],
      providers: [MeetService],
    }).compile();

    controller = module.get<MeetController>(MeetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
