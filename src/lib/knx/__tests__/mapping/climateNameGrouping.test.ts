import { describe, expect, it } from "@jest/globals";

import {
  addNameBasedOperationModes,
  buildNameBasedClimateAggregates,
} from "@/lib/knx/aggregate";
import type { GroupAddress } from "@/lib/types";

const ga = (
  id: string,
  name: string,
  address: string,
  dpt?: string,
): GroupAddress => ({
  id,
  name,
  address,
  ...(dpt ? { dpt } : {}),
});

describe("name based climate grouping", () => {
  it("groups unlinked room GAs and uses a 1-bit shift only to keep it out of covers", () => {
    const gas = [
      ga("a", "Raum A_H_IST-TEMP", "5/0/1", "9.001"),
      ga("b", "Raum A_H_BASIS-SOLL", "5/0/2", "9.001"),
      ga("c", "Raum A_H_SOLLWERTVERSCHIEBUNG", "5/0/3", "1.007"),
    ];
    const [agg] = buildNameBasedClimateAggregates(gas, new Set());
    expect(agg.name).toBe("Raum A");
    expect(agg.temperature_address).toBe("5/0/1");
    expect(agg.target_temperature_state_address).toBe("5/0/2");
    expect(agg.setpoint_shift_address).toBeUndefined();
    expect([...agg.consumedIds].sort()).toEqual(["b", "c"]);
  });

  it("maps a 9.002 shift and skips rooms already covered or incomplete", () => {
    const gas = [
      ga("a", "Raum B Ist-Temperatur", "5/1/1"),
      ga("b", "Raum B Basis-Sollwert", "5/1/2"),
      ga("c", "Raum B Sollwertverschiebung", "5/1/3", "9.002"),
      ga("d", "Raum C Ist-Temperatur", "5/2/1", "9.001"),
      ga("e", "Zimmername_IST-TEMP", "5/3/1", "9.001"),
      ga("f", "Zimmername_BASIS-SOLL", "5/3/2", "9.001"),
    ];
    const out = buildNameBasedClimateAggregates(gas, new Set());
    expect(out).toHaveLength(1);
    expect(out[0].setpoint_shift_address).toBe("5/1/3");
    expect(out[0].setpoint_shift_mode).toBe("DPT9002");
    expect(
      buildNameBasedClimateAggregates(gas, new Set(["5/1/1"])),
    ).toHaveLength(0);
  });

  it("adds the operation mode by name for untyped or 20.102 GAs only", () => {
    const gas = [
      ga("a", "Office Actual temperature", "6/0/1", "9.001"),
      ga("b", "Office Operation mode", "6/0/2", "20.102"),
      ga("c", "Office Operation mode status", "6/0/3", "20.102"),
      ga("d", "Hall Actual temperature", "6/0/4", "9.001"),
      ga("e", "Hall HVAC mode", "6/0/5", "1.001"),
    ];
    const aggs = [
      {
        name: "Office",
        temperature_address: "6/0/1",
        consumedIds: new Set<string>(),
      },
      {
        name: "Hall",
        temperature_address: "6/0/4",
        consumedIds: new Set<string>(),
      },
    ];
    addNameBasedOperationModes(gas, aggs);
    expect(aggs[0]).toMatchObject({
      operation_mode_address: "6/0/2",
      operation_mode_state_address: "6/0/3",
    });
    expect(aggs[1]).not.toHaveProperty("operation_mode_address");
  });
});
