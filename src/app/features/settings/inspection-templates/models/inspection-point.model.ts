import { MongoEntity } from '@shared/models/mongo-entity.model';

export interface InspectionPoint extends MongoEntity {
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

export interface CreateInspectionPointDto {
  name: string;
  inspectionBlockId: string;
  order: number;
  type: 'standard' | 'tyre';
  tyreConfigurationId?: string;
  tyrePosition?: string;
  scriptedComments?: string[];
  mandatory?: boolean;
  mandatoryMedia?: 'required' | 'requiredIfNok' | 'optional';
  mandatoryComment?: 'required' | 'requiredIfNok' | 'optional';
  active?: boolean;
}

export interface UpdateInspectionPointDto {
  name?: string;
  order?: number;
  type?: 'standard' | 'tyre';
  tyreConfigurationId?: string;
  tyrePosition?: string;
  scriptedComments?: string[];
  mandatory?: boolean;
  mandatoryMedia?: 'required' | 'requiredIfNok' | 'optional';
  mandatoryComment?: 'required' | 'requiredIfNok' | 'optional';
  active?: boolean;
}
