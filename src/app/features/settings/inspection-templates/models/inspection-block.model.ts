import { MongoEntity } from '@shared/models/mongo-entity.model';

export interface InspectionBlock extends MongoEntity {
  name: string;
  active: boolean;
  inspectionTemplateId: string;
  order: number;
  inspectionPointIds: string[];
}

export interface CreateInspectionBlockDto {
  name: string;
  active?: boolean;
  inspectionTemplateId: string;
  order: number;
  inspectionPointIds?: string[];
}

export interface UpdateInspectionBlockDto {
  name?: string;
  active?: boolean;
  order?: number;
  inspectionPointIds?: string[];
}
