import { describe, expect, it } from "@jest/globals";

import { buildHaEntities } from "@/lib/knx/export";

describe("name-based fallback for group addresses without datapoint type", () => {
  const catalog = {
    project_name: "GermanNameFixture",
    group_addresses: [
      { id: "ga-1", name: "Helligkeit Außen", address: "31/0/3" },
      { id: "ga-2", name: "EG CO Wohnzimmer", address: "31/0/4" },
      { id: "ga-3", name: "EG CO Esszimmer", address: "31/0/5" },
      { id: "ga-4", name: "Niederschlag", address: "31/0/6" },
      { id: "ga-5", name: "Szene 4 Essen", address: "8/0/3" },
    ],
  };

  it("recognises brightness and CO sensors, rain as binary sensor and scenes", () => {
    const ent = buildHaEntities(catalog);

    const sensors = new Map(ent.sensors.map((s) => [s.state_address, s.type]));
    expect(sensors.get("31/0/3")).toBe("illuminance");
    expect(sensors.get("31/0/4")).toBe("ppm");
    expect(sensors.get("31/0/5")).toBe("ppm");

    expect(ent.binarySensors.map((b) => b.state_address)).toEqual(["31/0/6"]);

    expect(ent.scenes).toHaveLength(1);
    expect(ent.scenes[0].scene_number).toBe(4);
    expect(ent.unknowns).toHaveLength(0);
  });
});
