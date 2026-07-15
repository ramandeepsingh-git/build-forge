/**
 * compatibility.js
 * The compatibility engine. Every exported check function takes the
 * relevant selected component object(s) — already resolved from the
 * JSON catalogue, not bare ids — and returns a CompatibilityResult:
 *
 *   { status: 'good' | 'warning' | 'error', message: string }
 *
 * status maps directly to the badge--good / badge--warn / badge--error
 * classes already defined in components.css, so the UI layer can
 * render a result with zero extra translation logic.
 *
 * This module is pure: no DOM access, no localStorage, no fetch.
 * builder.js is responsible for resolving ids to component objects
 * (via storage.js / utils.js loadJSON) and for rendering the results
 * this module returns. That separation is what the project brief
 * calls "separate UI logic from business logic."
 */

const STATUS = {
  GOOD: 'good',
  WARNING: 'warning',
  ERROR: 'error',
};

/** Helper to build a result object consistently. */
function result(status, message) {
  return { status, message };
}

/** Used by checks that have nothing to evaluate yet (a required part is missing). */
function notApplicable(message) {
  return result(STATUS.GOOD, message);
}

/* ============================================================
   INDIVIDUAL CHECKS
   Each function is defensive: if either argument is missing
   (the user hasn't picked that part yet), it returns a neutral
   "good" result with an explanatory message rather than throwing,
   since an incomplete build is the normal state while planning.
   ============================================================ */

/**
 * CPU socket <-> Motherboard socket.
 * This is the single most common build-breaking mistake, so the
 * message always names both the CPU's socket and the board's
 * supported socket explicitly, per the spec's example format.
 */
export function checkCpuSocket(cpu, motherboard) {
  if (!cpu || !motherboard) {
    return notApplicable('Select a CPU and motherboard to check socket compatibility.');
  }
  if (cpu.socket === motherboard.socket) {
    return result(STATUS.GOOD, `${cpu.model} (${cpu.socket}) is compatible with ${motherboard.model}.`);
  }
  return result(
    STATUS.ERROR,
    `This motherboard supports only ${motherboard.socket} processors, but ${cpu.model} uses ${cpu.socket}. These parts cannot physically be paired.`
  );
}

/**
 * RAM generation (DDR4/DDR5) <-> Motherboard memory type.
 * DDR4 and DDR5 modules are not interchangeable — different
 * physical notch position — so a mismatch is always an error.
 */
export function checkRamGeneration(ram, motherboard) {
  if (!ram || !motherboard) {
    return notApplicable('Select RAM and a motherboard to check memory compatibility.');
  }
  if (ram.memoryType === motherboard.memoryType) {
    return result(STATUS.GOOD, `${ram.model} (${ram.memoryType}) matches this motherboard's memory type.`);
  }
  return result(
    STATUS.ERROR,
    `${motherboard.model} only supports ${motherboard.memoryType} memory, but ${ram.model} is ${ram.memoryType}. The module notch won't even fit in the slot.`
  );
}

/**
 * RAM speed vs the motherboard's rated maximum.
 * Not a hard failure — most boards simply run the kit at their own
 * max supported speed instead of the kit's rated speed — so this is
 * a warning, not an error.
 */
export function checkRamSpeed(ram, motherboard) {
  if (!ram || !motherboard) {
    return notApplicable('Select RAM and a motherboard to check memory speed.');
  }
  if (ram.memoryType !== motherboard.memoryType) {
    // Already flagged by checkRamGeneration; avoid a redundant second error here.
    return notApplicable('Memory speed check skipped due to a memory type mismatch.');
  }
  if (ram.speedMHz <= motherboard.maxMemorySpeedMHz) {
    return result(STATUS.GOOD, `${ram.model} runs within this motherboard's rated ${motherboard.maxMemorySpeedMHz}MHz limit.`);
  }
  return result(
    STATUS.WARNING,
    `${ram.model} is rated for ${ram.speedMHz}MHz, but ${motherboard.model} only supports up to ${motherboard.maxMemorySpeedMHz}MHz. It will still work, just clocked down to the board's limit.`
  );
}

/**
 * RAM module count <-> motherboard RAM slot count.
 */
export function checkRamSlots(ram, motherboard) {
  if (!ram || !motherboard) {
    return notApplicable('Select RAM and a motherboard to check slot capacity.');
  }
  if (ram.modules <= motherboard.ramSlots) {
    return result(STATUS.GOOD, `${motherboard.model} has ${motherboard.ramSlots} memory slots, enough for this ${ram.modules}-module kit.`);
  }
  return result(
    STATUS.ERROR,
    `${ram.model} is a ${ram.modules}-module kit, but ${motherboard.model} only has ${motherboard.ramSlots} memory slots.`
  );
}

/**
 * Total RAM capacity <-> motherboard's max supported capacity.
 */
export function checkRamCapacity(ram, motherboard) {
  if (!ram || !motherboard) {
    return notApplicable('Select RAM and a motherboard to check capacity limits.');
  }
  if (ram.capacityGB <= motherboard.maxMemoryGB) {
    return result(STATUS.GOOD, `${ram.capacityGB}GB is within this motherboard's ${motherboard.maxMemoryGB}GB maximum.`);
  }
  return result(
    STATUS.ERROR,
    `${motherboard.model} supports a maximum of ${motherboard.maxMemoryGB}GB of memory, but this kit totals ${ram.capacityGB}GB.`
  );
}

/**
 * Storage interface (SATA/NVMe) <-> motherboard's available slots.
 * NVMe drives need a free M.2 slot; SATA drives need a free SATA port.
 * Since the builder only tracks a single selected storage drive at a
 * time (per the project's part-slot model), this checks that the
 * motherboard has at least one of the relevant slot type at all.
 */
export function checkStorageInterface(storage, motherboard) {
  if (!storage || !motherboard) {
    return notApplicable('Select a storage drive and a motherboard to check interface compatibility.');
  }
  if (storage.interface === 'NVMe') {
    if (motherboard.m2Slots > 0) {
      return result(STATUS.GOOD, `${motherboard.model} has ${motherboard.m2Slots} M.2 slot(s) for this NVMe drive.`);
    }
    return result(
      STATUS.ERROR,
      `${storage.model} is an NVMe M.2 drive, but ${motherboard.model} has no M.2 slots.`
    );
  }
  // SATA SSD or HDD.
  if (motherboard.sataSlots > 0) {
    return result(STATUS.GOOD, `${motherboard.model} has ${motherboard.sataSlots} SATA port(s) available for this drive.`);
  }
  return result(
    STATUS.ERROR,
    `${storage.model} uses a SATA connection, but ${motherboard.model} has no SATA ports.`
  );
}

/**
 * Storage PCIe generation vs motherboard PCIe generation (NVMe only).
 * An NVMe drive on an older PCIe bus still works, just slower — warning, not error.
 */
export function checkStoragePcie(storage, motherboard) {
  if (!storage || !motherboard || storage.interface !== 'NVMe' || !storage.pcieVersion) {
    return notApplicable('PCIe generation check applies only to NVMe drives.');
  }
  const driveGen = parseFloat(storage.pcieVersion.replace(/[^\d.]/g, ''));
  const boardGen = parseFloat(motherboard.pcieVersion.replace(/[^\d.]/g, ''));
  if (Number.isNaN(driveGen) || Number.isNaN(boardGen) || driveGen <= boardGen) {
    return result(STATUS.GOOD, `${storage.model} (${storage.pcieVersion}) is fully supported by this motherboard.`);
  }
  return result(
    STATUS.WARNING,
    `${storage.model} is a ${storage.pcieVersion} drive, but ${motherboard.model} only supports up to ${motherboard.pcieVersion}. It will still work, running at the board's lower PCIe speed.`
  );
}

/**
 * GPU length vs case maximum GPU clearance.
 */
export function checkGpuCaseClearance(gpu, pcCase) {
  if (!gpu || !pcCase) {
    return notApplicable('Select a GPU and a case to check physical clearance.');
  }
  if (gpu.lengthMM <= pcCase.maxGpuLengthMM) {
    const margin = pcCase.maxGpuLengthMM - gpu.lengthMM;
    if (margin < 15) {
      return result(
        STATUS.WARNING,
        `${gpu.model} (${gpu.lengthMM}mm) fits in ${pcCase.model}, but only with ${margin}mm of clearance to spare. Double-check cable routing space.`
      );
    }
    return result(STATUS.GOOD, `${gpu.model} (${gpu.lengthMM}mm) fits comfortably in ${pcCase.model} (max ${pcCase.maxGpuLengthMM}mm).`);
  }
  return result(
    STATUS.ERROR,
    `${gpu.model} is ${gpu.lengthMM}mm long, but ${pcCase.model} only supports GPUs up to ${pcCase.maxGpuLengthMM}mm. The card will not physically fit.`
  );
}

/**
 * Motherboard form factor vs case supported form factors.
 */
export function checkMotherboardCaseFit(motherboard, pcCase) {
  if (!motherboard || !pcCase) {
    return notApplicable('Select a motherboard and a case to check form factor compatibility.');
  }
  if (pcCase.formFactorSupport.includes(motherboard.formFactor)) {
    return result(STATUS.GOOD, `${pcCase.model} supports ${motherboard.formFactor} motherboards.`);
  }
  return result(
    STATUS.ERROR,
    `${motherboard.model} is ${motherboard.formFactor}, but ${pcCase.model} only supports ${pcCase.formFactorSupport.join(', ')}.`
  );
}

/**
 * PSU form factor vs case supported PSU form factor.
 * Most cases take standard ATX PSUs; small-form-factor cases often
 * require SFX/SFX-L instead.
 */
export function checkPsuCaseFit(psu, pcCase) {
  if (!psu || !pcCase) {
    return notApplicable('Select a PSU and a case to check power supply form factor.');
  }
  if (psu.formFactor === pcCase.psuFormFactor) {
    return result(STATUS.GOOD, `${psu.model} (${psu.formFactor}) fits this case's power supply bay.`);
  }
  return result(
    STATUS.ERROR,
    `${pcCase.model} requires an ${pcCase.psuFormFactor} power supply, but ${psu.model} is ${psu.formFactor}. It will not physically mount.`
  );
}

/**
 * PSU wattage vs total estimated system power draw.
 * `totalDrawWatts` should come from calculator.js's total, not be
 * recomputed here, to keep power math in exactly one place.
 * A healthy build keeps the PSU at or below ~80% load for headroom
 * and efficiency, matching common builder guidance.
 */
export function checkPsuWattage(psu, totalDrawWatts) {
  if (!psu || typeof totalDrawWatts !== 'number') {
    return notApplicable('Select a PSU and complete your power estimate to check wattage headroom.');
  }
  const loadPercent = (totalDrawWatts / psu.wattage) * 100;

  if (totalDrawWatts > psu.wattage) {
    return result(
      STATUS.ERROR,
      `This build draws an estimated ${totalDrawWatts}W, which exceeds the ${psu.model}'s ${psu.wattage}W rating. Choose a higher-wattage PSU.`
    );
  }
  if (loadPercent > 80) {
    return result(
      STATUS.WARNING,
      `This build draws an estimated ${totalDrawWatts}W, about ${Math.round(loadPercent)}% of the ${psu.model}'s ${psu.wattage}W capacity. It will work, but a higher-wattage PSU would give more headroom and run cooler.`
    );
  }
  return result(
    STATUS.GOOD,
    `This build draws an estimated ${totalDrawWatts}W, a comfortable ${Math.round(loadPercent)}% load on the ${psu.model}'s ${psu.wattage}W capacity.`
  );
}

/**
 * GPU's own recommended PSU wattage vs the selected PSU.
 * Distinct from checkPsuWattage: this uses the GPU manufacturer's
 * own stated recommendation, which usually bakes in headroom for
 * the rest of a typical system, as a second opinion.
 */
export function checkGpuPsuRecommendation(gpu, psu) {
  if (!gpu || !psu) {
    return notApplicable('Select a GPU and a PSU to check the manufacturer-recommended wattage.');
  }
  if (psu.wattage >= gpu.recommendedPsuWatts) {
    return result(STATUS.GOOD, `${psu.wattage}W meets ${gpu.model}'s recommended minimum of ${gpu.recommendedPsuWatts}W.`);
  }
  return result(
    STATUS.WARNING,
    `${gpu.model} recommends at least a ${gpu.recommendedPsuWatts}W PSU, but ${psu.model} is ${psu.wattage}W. The build may still run, but is below the manufacturer's recommendation.`
  );
}

/**
 * CPU cooler socket support, IF a cooler has been selected.
 * The current catalogue (data/) does not yet include a coolers.json
 * file, so a cooler object here is expected to optionally carry a
 * `supportedSockets: string[]` array once that category exists.
 * Until then this check safely no-ops with a clear status message
 * rather than assuming compatibility or throwing.
 */
export function checkCoolerSocket(cooler, cpu) {
  if (!cooler || !cpu) {
    return notApplicable('Select a CPU cooler to check socket support.');
  }
  if (!Array.isArray(cooler.supportedSockets)) {
    return result(STATUS.WARNING, `Unable to verify ${cooler.model}'s socket support — no socket data available for this cooler yet.`);
  }
  if (cooler.supportedSockets.includes(cpu.socket)) {
    return result(STATUS.GOOD, `${cooler.model} supports the ${cpu.socket} socket.`);
  }
  return result(
    STATUS.ERROR,
    `${cooler.model} does not list support for the ${cpu.socket} socket used by ${cpu.model}. Check the cooler's included mounting hardware.`
  );
}

/**
 * Cooler height vs case maximum cooler clearance, IF a cooler is selected.
 * Same forward-compatible treatment as checkCoolerSocket.
 */
export function checkCoolerCaseClearance(cooler, pcCase) {
  if (!cooler || !pcCase) {
    return notApplicable('Select a CPU cooler to check case clearance.');
  }
  if (typeof cooler.heightMM !== 'number') {
    return result(STATUS.WARNING, `Unable to verify ${cooler.model}'s height — no clearance data available for this cooler yet.`);
  }
  if (cooler.heightMM <= pcCase.maxCoolerHeightMM) {
    return result(STATUS.GOOD, `${cooler.model} (${cooler.heightMM}mm) fits within ${pcCase.model}'s ${pcCase.maxCoolerHeightMM}mm cooler clearance.`);
  }
  return result(
    STATUS.ERROR,
    `${cooler.model} is ${cooler.heightMM}mm tall, but ${pcCase.model} only clears ${pcCase.maxCoolerHeightMM}mm. The side panel won't close.`
  );
}

/* ============================================================
   AGGREGATE REPORT
   Runs every applicable check against a full build's selected
   parts and returns a flat list of labeled results, plus an
   overall status (the worst individual status found) for a
   single-glance build health indicator.
   ============================================================ */

/**
 * @param {object} parts - selected component objects, already
 *   resolved from ids. Expected keys: cpu, gpu, motherboard, ram,
 *   storage, psu, case, cooler. Any key may be null/undefined if
 *   the user hasn't picked that part yet.
 * @param {number} [totalDrawWatts] - the build's total estimated
 *   power draw, computed by calculator.js. Optional; if omitted,
 *   the PSU wattage check is skipped rather than guessed at here.
 * @returns {{ overallStatus: string, checks: Array<{label: string, status: string, message: string}> }}
 */
export function runCompatibilityReport(parts, totalDrawWatts) {
  const { cpu, gpu, motherboard, ram, storage, psu, case: pcCase, cooler } = parts || {};

  const checks = [
    { label: 'CPU Socket', ...checkCpuSocket(cpu, motherboard) },
    { label: 'RAM Generation', ...checkRamGeneration(ram, motherboard) },
    { label: 'RAM Speed', ...checkRamSpeed(ram, motherboard) },
    { label: 'RAM Slots', ...checkRamSlots(ram, motherboard) },
    { label: 'RAM Capacity', ...checkRamCapacity(ram, motherboard) },
    { label: 'Storage Interface', ...checkStorageInterface(storage, motherboard) },
    { label: 'Storage PCIe Generation', ...checkStoragePcie(storage, motherboard) },
    { label: 'GPU / Case Clearance', ...checkGpuCaseClearance(gpu, pcCase) },
    { label: 'Motherboard / Case Fit', ...checkMotherboardCaseFit(motherboard, pcCase) },
    { label: 'PSU / Case Fit', ...checkPsuCaseFit(psu, pcCase) },
    { label: 'PSU Wattage', ...checkPsuWattage(psu, totalDrawWatts) },
    { label: 'GPU Recommended PSU', ...checkGpuPsuRecommendation(gpu, psu) },
    { label: 'CPU Cooler Socket', ...checkCoolerSocket(cooler, cpu) },
    { label: 'CPU Cooler Clearance', ...checkCoolerCaseClearance(cooler, pcCase) },
  ];

  const overallStatus = checks.reduce((worst, check) => {
    if (check.status === STATUS.ERROR) return STATUS.ERROR;
    if (check.status === STATUS.WARNING && worst !== STATUS.ERROR) return STATUS.WARNING;
    return worst;
  }, STATUS.GOOD);

  return { overallStatus, checks };
}

export { STATUS };
