/**
 * Biophysical Life-Support & Consumables Model for Mars Surface EVA
 * Repository: martian-map
 * 
 * References:
 * - NASA/TP-2015-218570: Life Support Baseline Values and Assumptions Document (BVAD)
 * - Santee et al. (2001): Metabolic Cost of Locomotion on Slopes in Partial Gravity (0.38g)
 * 
 * Thermodynamic & Energy Balance Boundaries:
 * 1. Spacesuit Joint Resistance (suitJointResistanceWatts = 70.0 W):
 *    - In a gas-pressurized suit (29.6 - 34.5 kPa), moving suit joints requires mechanical work.
 *    - This muscular work is performed by the human astronaut, raising human metabolic rate.
 *    - INCLUDED IN:
 *      * Metabolic Power (P_met) -> directly drives Oxygen Consumption (Rate_O2 = P_met / k_O2)
 *      * Total Metabolic Heat generated inside suit envelope
 *      * Sublimator Cooling Water loss (since sublimator removes all heat from the suit loop)
 *    - EXCLUDED FROM:
 *      * Suit Electrical Battery Drain (the suit battery does not power human muscles;
 *        battery powers electrical fans, pumps, radio, sensors, and heaters only).
 * 
 * 2. Suit Electrical Avionics Baseload (SUIT_AVIONICS_BASELOAD_WATTS = 180.0 W):
 *    - Continuous electrical draw for ventilation fan, LCG pump, avionics, radio, and display.
 *    - INCLUDED IN:
 *      * Battery electrical depletion rate
 *      * Sublimator Cooling Water loss (electrical power degrades to heat inside the suit)
 *    - EXCLUDED FROM:
 *      * Human Metabolic Rate and Oxygen Consumption (astronaut does not breathe to power electronics).
 */

export const LIFE_SUPPORT_CONSTANTS = {
  // Energetic equivalent of oxygen: 20.1 kJ / Liter O2 (at STP)
  O2_ENERGY_EQUIVALENT_J_PER_L: 20100.0,
  // Latent heat of sublimation of water ice at vacuum: 2.83 MJ / kg
  ICE_SUBLIMATION_LATENT_HEAT_J_PER_KG: 2.83e6,
  // Suit avionics baseline electrical power draw (Watts)
  SUIT_AVIONICS_BASELOAD_WATTS: 180.0,
  // Suit joint mechanical resistance penalty for pressurized suit locomotion (Watts)
  SUIT_JOINT_RESISTANCE_WATTS: 70.0,
  // Default primary oxygen capacity in Liters (STP)
  DEFAULT_O2_CAPACITY_LITERS: 1200.0,
  // Default sublimator water capacity in kg
  DEFAULT_WATER_CAPACITY_KG: 8.0,
  // Default battery capacity in Watt-hours
  DEFAULT_BATTERY_CAPACITY_WH: 1000.0,
  // Default mandatory safety reserve fraction (25%)
  DEFAULT_RESERVE_FACTOR: 0.25
};

/**
 * Calculates human metabolic power expenditure on Mars (0.38g partial gravity)
 * using the Santee-Gonzalez modified Pandolf model.
 * 
 * @param {number} velocity - Walking speed in m/s (nominal suited: 0.56 m/s = 2.0 km/h)
 * @param {number} slopeDegrees - Terrain slope angle in degrees (positive = uphill)
 * @param {number} totalMassKg - Total mass of astronaut + suit (default: 210 kg = 80 kg human + 130 kg suit)
 * @returns {number} Metabolic power in Watts (J/s)
 */
export function calculateMetabolicPowerWatts(velocity = 0.56, slopeDegrees = 0, totalMassKg = 210) {
  const gMars = 3.72076;
  const slopeRad = (slopeDegrees * Math.PI) / 180.0;
  
  if (velocity <= 0.05) {
    // Standing rest in pressurized suit (NASA BVAD baseline)
    return 160.0;
  }

  // Horizontal kinetic term + gravitational potential term scaled for Mars partial gravity
  const terrainFactor = 1.2; // Moderate regolith terrain impedance
  const baseStandingWattage = 1.5 * totalMassKg * 0.5; // ~157.5 W
  // Pressurized spacesuit joint resistance penalty (NASA BVAD / Apollo EVA baseline)
  const suitJointResistanceWatts = LIFE_SUPPORT_CONSTANTS.SUIT_JOINT_RESISTANCE_WATTS;
  const kineticTerm = terrainFactor * totalMassKg * (0.179 * velocity * velocity + 0.32 * velocity);
  const slopeTerm = terrainFactor * totalMassKg * (1.33 * gMars * velocity * Math.sin(slopeRad));

  const totalWattage = baseStandingWattage + suitJointResistanceWatts + kineticTerm + Math.max(0, slopeTerm);
  // Clamp to realistic human aerobic capacity in spacesuit (140W to 750W)
  return Math.min(750.0, Math.max(140.0, totalWattage));
}

/**
 * Calculates primary oxygen consumption rate from metabolic power.
 * Based on energetic equivalent k_O2 = 20,100 J/L.
 * 
 * @param {number} metabolicPowerWatts - Metabolic power in Watts (J/s)
 * @returns {number} Oxygen consumption rate in Liters/minute (STP)
 */
export function calculateOxygenRateLitersPerMin(metabolicPowerWatts) {
  return (metabolicPowerWatts * 60.0) / LIFE_SUPPORT_CONSTANTS.O2_ENERGY_EQUIVALENT_J_PER_L;
}

/**
 * Calculates sublimator cooling water loss rate.
 * Heat rejection load = human metabolic heat + avionics electrical heat.
 * 
 * @param {number} metabolicPowerWatts - Metabolic heat in Watts (including suit joint work)
 * @param {number} avionicsWatts - Avionics electrical heat in Watts
 * @returns {number} Cooling water sublimation rate in kg/hour
 */
export function calculateWaterLossRateKgPerHour(
  metabolicPowerWatts,
  avionicsWatts = LIFE_SUPPORT_CONSTANTS.SUIT_AVIONICS_BASELOAD_WATTS
) {
  const totalHeatWatts = metabolicPowerWatts + avionicsWatts;
  return (totalHeatWatts * 3600.0) / LIFE_SUPPORT_CONSTANTS.ICE_SUBLIMATION_LATENT_HEAT_J_PER_KG;
}

/**
 * Calculates suit electrical battery power drain.
 * Battery powers electrical systems only; it does NOT power the human metabolic load.
 * 
 * @param {number} avionicsWatts - Baseline electrical load (fans, pumps, avionics, radio)
 * @param {number} heaterWatts - Active thermal heater pulse power (e.g. glove/visor heaters)
 * @returns {number} Electrical drain in Watts
 */
export function calculateBatteryPowerWatts(
  avionicsWatts = LIFE_SUPPORT_CONSTANTS.SUIT_AVIONICS_BASELOAD_WATTS,
  heaterWatts = 0.0
) {
  return avionicsWatts + heaterWatts;
}

/**
 * Evaluates the normalized, dimensionless Point of No Return (PNR) margin percentage.
 * 
 * Formula:
 * PNR_Margin = ((C_remaining - (1 + reserveFactor) * C_return) / C_capacity) * 100%
 * 
 * @param {number} remaining - Current remaining consumable amount
 * @param {number} returnCost - Estimated consumable cost to traverse back to base camp
 * @param {number} capacity - Total usable capacity of the consumable
 * @param {number} reserveFactor - Mandatory reserve factor (default: 0.25 = 25%)
 * @returns {{marginPercent: number, status: 'NOMINAL'|'CAUTION'|'CRITICAL_ABORT'}}
 */
export function calculatePnrMargin(
  remaining,
  returnCost,
  capacity,
  reserveFactor = LIFE_SUPPORT_CONSTANTS.DEFAULT_RESERVE_FACTOR
) {
  const requiredWithReserve = (1.0 + reserveFactor) * returnCost;
  const marginAmount = remaining - requiredWithReserve;
  const marginPercent = (marginAmount / capacity) * 100.0;

  let status = 'NOMINAL';
  if (marginPercent <= 0.0) {
    status = 'CRITICAL_ABORT';
  } else if (marginPercent <= 15.0) {
    status = 'CAUTION';
  }

  return {
    marginPercent,
    status
  };
}
