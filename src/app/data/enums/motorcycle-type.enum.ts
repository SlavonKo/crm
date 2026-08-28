export enum MotorcycleType {
  SPORT        = 'sport',
  NAKED        = 'naked',
  CRUISER      = 'cruiser',
  TOURING      = 'touring',
  ADVENTURE    = 'adventure',
  ENDURO       = 'enduro',
  MOTOCROSS    = 'motocross',
  SCOOTER      = 'scooter',
  CUSTOM       = 'custom',
  OTHER        = 'other',
}

export const MOTORCYCLE_TYPE_LABELS: Record<MotorcycleType, string> = {
  [MotorcycleType.SPORT]:     'Sport',
  [MotorcycleType.NAKED]:     'Naked',
  [MotorcycleType.CRUISER]:   'Cruiser',
  [MotorcycleType.TOURING]:   'Touring',
  [MotorcycleType.ADVENTURE]: 'Adventure',
  [MotorcycleType.ENDURO]:    'Enduro',
  [MotorcycleType.MOTOCROSS]: 'Motocross',
  [MotorcycleType.SCOOTER]:   'Scooter',
  [MotorcycleType.CUSTOM]:    'Custom',
  [MotorcycleType.OTHER]:     'Other',
};
