/**
 * calculator.js
 * Power draw estimation and PSU recommendation logic.
 *
 * Design contract:
 *   - Pure functions only. No DOM, no localStorage, no fetch.
 *   - builder.js calls calculateBuildPower(parts) to get the full
 *     breakdown, then passes result.totalWatts to
 *     compatibility.js → checkPsuWattage().
 *   - All watt values from component objects use their `powerWatts`
 *     field, which represents realistic load draw (not TDP peak).
 *   - Fans not individually catalogued use a fixed 5W-per-fan
 *     estimate derived from the case's `includedFans` count.
 *   - A CPU cooler without a `powerWatts` field gets a conservative
 *     25W estimate (covers most air coolers; AIO pumps are similar).
 *   - PSU recommendation rounds up to the nearest standard wattage
 *     tier with a minimum 20% overhead margin on total draw.
 */

/* ============================================================
   CONSTANTS
   ============================================================ */

/** Watts estimated per case fan (typical 120–140mm fan at moderate load). */
const WATTS_PER_FAN = 5;

/** Estimated watts for a CPU cooler when no powerWatts field is present. */
const COOLER_FALLBACK_WATTS = 25;

/** Baseline motherboard overhead included even when no mobo is selected,
 *  because VRM, chipset, and onboard peripherals draw something regardless. */
const MOTHERBOARD_FALLBACK_WATTS = 30;

/** Fixed "other devices" overhead: USB controllers, LEDs, audio codec, etc. */
const SYSTEM_OVERHEAD_WATTS = 15;

/** Standard retail PSU wattage tiers, ascending.
 *  recommendPsu() picks the first tier that satisfies the headroom check. */
const PSU_TIERS = [350, 450, 550, 650, 750, 850, 1000, 1200, 1600];

/** Minimum fraction of PSU capacity the draw should occupy.
 *  Keeping load ≤ 80% is the standard builder rule of thumb:
 *  it keeps the PSU in its efficient operating band and leaves
 *  headroom for transient spikes. */
const PSU_HEADROOM_FACTOR = 0.80;

/* ============================================================
   INDIVIDUAL COMPONENT ESTIMATORS
   ============================================================ */

/**
 * Return the CPU's estimated draw in watts.
 * We use `powerWatts` (realistic load draw) over `tdpWatts` (Intel/AMD
 * thermal envelope) because `powerWatts` was set in the JSON to reflect
 * actual observed sustained power — a more honest number for builders.
 */
export function cpuWatts(cpu) {
  if (!cpu) return 0;
  return cpu.powerWatts ?? 0;
}

/** Return the GPU's estimated draw in watts. */
export function gpuWatts(gpu) {
  if (!gpu) return 0;
  return gpu.powerWatts ?? 0;
}

/**
 * Return the RAM kit's estimated draw in watts.
 * If the kit has a `powerWatts` value, use it; otherwise fall back
 * to a conservative 3W-per-module estimate (accurate for DDR4/DDR5
 * consumer sticks at stock voltage).
 */
export function ramWatts(ram) {
  if (!ram) return 0;
  if (typeof ram.powerWatts === 'number') return ram.powerWatts;
  return (ram.modules ?? 2) * 3;
}

/** Return the storage device's estimated draw in watts. */
export function storageWatts(storage) {
  if (!storage) return 0;
  return storage.powerWatts ?? 0;
}

/** Return the motherboard's estimated draw in watts. */
export function motherboardWatts(motherboard) {
  if (!motherboard) return MOTHERBOARD_FALLBACK_WATTS;
  return motherboard.powerWatts ?? MOTHERBOARD_FALLBACK_WATTS;
}

/**
 * Return the CPU cooler's estimated draw in watts.
 * CPU air coolers and AIO pump+fans are typically 5–30W combined.
 * If the cooler object has `powerWatts`, use it; otherwise use the
 * conservative fallback so we slightly over-estimate rather than under.
 */
export function coolerWatts(cooler) {
  if (!cooler) return 0;
  return cooler.powerWatts ?? COOLER_FALLBACK_WATTS;
}

/**
 * Estimate total wattage from case fans.
 * The case JSON has `includedFans` (fans that ship with the case).
 * We don't track additional fans the user might add independently,
 * so this is a minimum estimate. 5W per fan is realistic for
 * 120–140mm fans at medium speed.
 */
export function fansWatts(pcCase) {
  if (!pcCase) return 0;
  const count = pcCase.includedFans ?? 0;
  return count * WATTS_PER_FAN;
}

/* ============================================================
   AGGREGATE CALCULATOR
   ============================================================ */

/**
 * @typedef {Object} PowerBreakdown
 * @property {number} cpu        - CPU draw in watts
 * @property {number} gpu        - GPU draw in watts
 * @property {number} ram        - RAM draw in watts
 * @property {number} storage    - Storage draw in watts
 * @property {number} motherboard - Motherboard draw in watts
 * @property {number} cooler     - CPU cooler draw in watts
 * @property {number} fans       - Case fans draw in watts
 * @property {number} overhead   - Fixed system overhead in watts
 * @property {number} totalWatts - Sum of all the above
 */

/**
 * Calculate the full power breakdown for a set of selected parts.
 *
 * @param {object} parts - Keys: cpu, gpu, motherboard, ram, storage,
 *   psu, case, cooler. Any may be null/undefined (not yet selected).
 * @returns {PowerBreakdown}
 */
export function calculateBuildPower(parts) {  
  const { cpu, gpu, motherboard, ram, storage, cooler, case: pcCase } = parts || {};

  const breakdown = {
    cpu: cpuWatts(cpu),
    gpu: gpuWatts(gpu),
    ram: ramWatts(ram),
    storage: storageWatts(storage),
    motherboard: motherboardWatts(motherboard),
    cooler: coolerWatts(cooler),
    fans: fansWatts(pcCase),
    overhead: SYSTEM_OVERHEAD_WATTS,
  };

  breakdown.totalWatts = Object.values(breakdown).reduce((sum, w) => sum + w, 0);

  return breakdown;
}

/* ============================================================
   PSU RECOMMENDATION
   ============================================================ */

/**
 * Given a total draw in watts, return the recommended PSU wattage
 * from the standard tier list. The recommended tier is the smallest
 * tier that keeps load at or below PSU_HEADROOM_FACTOR (80%).
 *
 * Example: 560W draw ÷ 0.80 = 700W minimum → next tier is 750W.
 *
 * @param {number} totalWatts - Total estimated build draw.
 * @returns {number} Recommended PSU wattage.
 */
export function recommendPsuWattage(totalWatts) {
  if (!totalWatts || totalWatts <= 0) return PSU_TIERS[0];
  const minimumPsu = totalWatts / PSU_HEADROOM_FACTOR;
  const tier = PSU_TIERS.find((t) => t >= minimumPsu);
  // If draw exceeds even the highest tier, return the highest tier
  // (the UI should flag this as an unusual/enthusiast build).
  return tier ?? PSU_TIERS[PSU_TIERS.length - 1];
}

/**
 * Return the efficiency margin: what percentage of the selected PSU's
 * rated capacity this build will consume.
 * Below 80% is healthy; above 80% means the PSU is being pushed hard;
 * above 100% means compatibility.js will raise an error.
 *
 * @param {number} totalWatts - Total build draw.
 * @param {number} psuWattage - Selected PSU's rated wattage.
 * @returns {number} Load percentage (0–100+), rounded to 1 decimal place.
 */
export function psuEfficiencyMargin(totalWatts, psuWattage) {
  if (!psuWattage || psuWattage <= 0) return 0;
  return Math.round((totalWatts / psuWattage) * 1000) / 10; // 1 d.p.
}

/* ============================================================
   FULL POWER REPORT
   Returns everything the Build Summary panel needs in one call.
   ============================================================ */

/**
 * @typedef {Object} PowerReport
 * @property {PowerBreakdown} breakdown   - Per-component wattage
 * @property {number} totalWatts          - Total estimated draw
 * @property {number} recommendedPsu      - Minimum recommended PSU wattage
 * @property {number|null} efficiencyPct  - Load on selected PSU as %, or null
 */

/**
 * Run the full power calculation and return a structured report.
 * This is the primary function `builder.js` should call.
 *
 * @param {object} parts - Same shape as calculateBuildPower.
 * @returns {PowerReport}
 */
export function buildPowerReport(parts) {
  const breakdown = calculateBuildPower(parts);
  const { totalWatts } = breakdown;
  const recommendedPsu = recommendPsuWattage(totalWatts);

  const psu = parts?.psu;
  const efficiencyPct = psu?.wattage ? psuEfficiencyMargin(totalWatts, psu.wattage) : null;

  return {
    breakdown,
    totalWatts,
    recommendedPsu,
    efficiencyPct,
  };
}
