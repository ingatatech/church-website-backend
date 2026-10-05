import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicationStatus } from '../sermons/entities/sermon.entity';
import { CreateMinistryDto, UpdateMinistryDto } from './dto/ministry.dto';
import { Ministry } from './entities/ministry.entity';
@Injectable()
export class MinistriesService {
  constructor(
    @InjectRepository(Ministry)
    private readonly repository: Repository<Ministry>,
  ) {}
  list() {
    return this.repository.find({
      where: { status: PublicationStatus.PUBLISHED },
      order: { name: 'ASC' },
    });
  }
  async get(id: string) {
    const row = await this.repository.findOne({
      where: { id, status: PublicationStatus.PUBLISHED },
    });
    if (!row) throw new NotFoundException('Published ministry was not found');
    return row;
  }
  create(dto: CreateMinistryDto) {
    return this.repository.save(this.repository.create(dto));
  }
  async update(id: string, dto: UpdateMinistryDto) {
    const row = await this.repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Ministry was not found');
    Object.assign(row, dto);
    return this.repository.save(row);
  }
  async remove(id: string) {
    const row = await this.repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Ministry was not found');
    await this.repository.remove(row);
    return { id };
  }
}
