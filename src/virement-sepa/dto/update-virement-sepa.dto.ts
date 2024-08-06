import { PartialType } from '@nestjs/mapped-types';
import { CreateVirementSepaDto } from './create-virement-sepa.dto';

export class UpdateVirementSepaDto extends PartialType(CreateVirementSepaDto) {}
