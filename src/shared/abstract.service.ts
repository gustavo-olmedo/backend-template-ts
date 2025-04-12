import { Injectable } from '@nestjs/common';
import { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

type allType<T> = {
  options?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  relations?: string[];
};

@Injectable()
export abstract class AbstractService<T extends ObjectLiteral> {
  constructor(protected readonly repository: Repository<T>) {}

  async all({ options, relations }: allType<T> = {}): Promise<T[]> {
    return await this.repository.find({
      where: options,
      relations,
    });
  }

  async paginate(
    page = 1,
    relations?: string[],
  ): Promise<{
    data: Partial<T>[];
    meta: { total: number; page: number; lastPage: number };
  }> {
    const take = 15;
    const [data, total] = await this.repository.findAndCount({
      take,
      skip: (page - 1) * take,
      relations,
    });
    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / take),
      },
    };
  }
  async save(data): Promise<T> {
    return this.repository.save(data);
  }

  async findOne(condition, relations?: string[]): Promise<T | null> {
    return this.repository.findOne({
      where: condition,
      relations,
    });
  }

  async update(uuid: string, data): Promise<unknown> {
    return this.repository.update(uuid, data);
  }

  async delete(uuid: string): Promise<unknown> {
    return this.repository.delete(uuid);
  }
}
