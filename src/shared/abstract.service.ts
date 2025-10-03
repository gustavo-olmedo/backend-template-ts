import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EntityManager,
  EntityTarget,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';

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
    const take = 7;
    const [data, total] = await this.repository.findAndCount({
      take,
      skip: (page - 1) * take,
      relations,
    });
    return {
      data,
      meta: {
        total,
        page: Number(page),
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

  async updateAndReturn(
    where: FindOptionsWhere<T>,
    mutate: (entity: T) => void | Promise<void>,
  ): Promise<T> {
    const entity = await this.repository.findOne({ where });
    if (!entity) throw new NotFoundException('Entity not found');

    await mutate(entity);
    return this.repository.save(entity);
  }

  /** Run a function inside a DB transaction and get a scoped Repository<T>. */
  async withTransaction<R>(
    fn: (repo: Repository<T>, em: EntityManager) => Promise<R> | R,
    isolationLevel?: IsolationLevel,
  ): Promise<R> {
    const run = async (em: EntityManager) => {
      const target = this.repository.metadata.target as EntityTarget<T>;
      const txRepo = em.getRepository<T>(target);
      return fn(txRepo, em);
    };

    return isolationLevel
      ? this.repository.manager.transaction(isolationLevel, run)
      : this.repository.manager.transaction(run);
  }
}
