import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalCounter } from './entities/global-counter.entity';

@Injectable()
export class GlobalCounterService {
  private readonly logger = new Logger(GlobalCounterService.name);

  constructor(
    @InjectRepository(GlobalCounter)
    private readonly globalCounterRepository: Repository<GlobalCounter>,
  ) {}

  async getNextInvoiceNumber(): Promise<number> {
    let counter = await this.getOrCreateCounter();
    const invoiceNumber = counter.next_invoice_number;

    // Incrémenter le compteur pour la prochaine utilisation
    counter.next_invoice_number += 1;
    await this.globalCounterRepository.save(counter);

    return invoiceNumber;
  }

  async getNextQuoteNumber(): Promise<number> {
    let counter = await this.getOrCreateCounter();
    const quoteNumber = counter.next_quote_number;

    // Incrémenter le compteur pour la prochaine utilisation
    counter.next_quote_number += 1;
    await this.globalCounterRepository.save(counter);

    return quoteNumber;
  }

  private async getOrCreateCounter(): Promise<GlobalCounter> {
    let counter = await this.globalCounterRepository.findOneBy({
      type: 'MAIN',
    });

    if (!counter) {
      counter = new GlobalCounter();
      counter.type = 'MAIN';
      counter.next_invoice_number = 1;
      counter.next_quote_number = 1;
      await this.globalCounterRepository.save(counter);
    }

    return counter;
  }
}
