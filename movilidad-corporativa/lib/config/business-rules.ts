export interface BusinessRulesConfig {
  poolThresholdRatio: number;
  uberThresholdRatio: number;
  requireSpecialApprovalOutsideHours: boolean;
  requireSpecialApprovalWeekend: boolean;
  maxPoolTripDistanceKm: number;
  maxAssignedTripDistanceKm: number;
  maxTripsPerVehiclePerDay: number;
}

export const businessRules: BusinessRulesConfig = {
  poolThresholdRatio: 0.9,
  uberThresholdRatio: 0.9,
  requireSpecialApprovalOutsideHours: true,
  requireSpecialApprovalWeekend: true,
  maxPoolTripDistanceKm: 120,
  maxAssignedTripDistanceKm: 180,
  maxTripsPerVehiclePerDay: 3,
};
