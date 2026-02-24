import { MongoEntity } from '@shared/models/mongo-entity.model';

export interface InspectionTemplate extends MongoEntity {
  name: string;
  active: boolean;
  inspectionBlockIds?: string[];
}

export interface InspectionTemplatePointStructure {
  _id: string;
  name: string;
  inspectionBlockId: string;
  order: number;
  type: 'standard' | 'tyre';
  tyreConfigurationId?: string;
  tyrePosition?: string;
  scriptedComments?: string[];
  mandatory: boolean;
  mandatoryMedia: 'required' | 'requiredIfNok' | 'optional';
  mandatoryComment: 'required' | 'requiredIfNok' | 'optional';
  active: boolean;
}

export interface InspectionTemplateBlockStructure {
  _id: string;
  name: string;
  active: boolean;
  inspectionTemplateId: string;
  order: number;
  inspectionPointIds: string[];
  points: InspectionTemplatePointStructure[];
}

export interface InspectionTemplateStructure {
  _id: string;
  name: string;
  active: boolean;
  inspectionBlockIds: string[];
  blocks: InspectionTemplateBlockStructure[];
}

export interface CreateInspectionTemplateDto {
  name: string;
  active?: boolean;
  inspectionBlockIds?: string[];
}

export interface UpdateInspectionTemplateDto {
  name?: string;
  active?: boolean;
  inspectionBlockIds?: string[];
}

export interface UpsertInspectionTemplateStructurePointDto {
  id?: string;
  name: string;
  type: 'standard' | 'tyre';
  tyreConfigurationId?: string;
  tyrePosition?: string;
  scriptedComments?: string[];
  mandatory?: boolean;
  mandatoryMedia?: 'required' | 'requiredIfNok' | 'optional';
  mandatoryComment?: 'required' | 'requiredIfNok' | 'optional';
  active?: boolean;
  order?: number;
}

export interface UpsertInspectionTemplateStructureBlockDto {
  id?: string;
  name: string;
  active?: boolean;
  order?: number;
  points: UpsertInspectionTemplateStructurePointDto[];
}

export interface UpsertInspectionTemplateStructureDto {
  templateId?: string;
  name: string;
  active?: boolean;
  blocks: UpsertInspectionTemplateStructureBlockDto[];
}

export interface InspectionTemplateSearchRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedInspectionTemplatesResponse {
  data: InspectionTemplate[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}
