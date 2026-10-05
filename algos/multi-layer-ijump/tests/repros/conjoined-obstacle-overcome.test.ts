import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import type { Obstacle } from "autorouting-dataset/lib/types"
import { getDebugSvg } from "algos/infinite-grid-ijump-astar/tests/fixtures/get-debug-svg"
import { getDistanceToOvercomeObstacle } from "algos/infinite-grid-ijump-astar/v2/lib/getDistanceToOvercomeObstacle"
import { MultilayerIjump } from "../../MultilayerIjump"
import { ObstacleList3d } from "../../ObstacleList3d"

test("multilayer overcome lookup continues past a conjoined obstacle", () => {
  const firstObstacle = {
    type: "rect",
    layers: ["top"],
    center: { x: 0.35, y: 0 },
    width: 0.4,
    height: 1,
    connectedTo: [],
  }
  const secondObstacle = {
    type: "rect",
    layers: ["top"],
    center: { x: 0.35, y: 0.9 },
    width: 0.4,
    height: 0.8,
    connectedTo: [],
  }
  const obstacles = new ObstacleList3d(2, [
    firstObstacle,
    secondObstacle,
  ] as any)

  const distance = getDistanceToOvercomeObstacle({
    node: { x: 0, y: 0 },
    travelDir: { dx: 0, dy: 1, wallDistance: Infinity },
    wallDir: { dx: 1, dy: 0, wallDistance: 0.15 },
    obstacle: firstObstacle as any,
    obstacles,
    OBSTACLE_MARGIN: 0.15,
    SHOULD_DETECT_CONJOINED_OBSTACLES: true,
    getObstacleAt: (x, y) => obstacles.getObstacleAt(x, y, 0),
  })

  // The first obstacle is cleared at 0.65. The second begins where it ends,
  // so layer-aware conjoined-obstacle detection must continue to 1.45.
  expect(distance).toBeCloseTo(1.45)
})

test("multilayer routing clears a conjoined wall before turning", () => {
  const firstObstacle: Obstacle = {
    type: "rect",
    layers: ["top"],
    center: { x: 0.35, y: 0 },
    width: 0.4,
    height: 1,
    connectedTo: [],
  }
  const obstacles: Obstacle[] = [
    firstObstacle,
    { ...firstObstacle, center: { x: 0.35, y: 0.9 }, height: 0.8 },
    { ...firstObstacle, center: { x: 0.35, y: -3.5 }, height: 6 },
  ]
  const autorouter = new MultilayerIjump({
    input: {
      layerCount: 2,
      minTraceWidth: 0.1,
      obstacles,
      connections: [
        {
          name: "trace",
          pointsToConnect: [
            { x: -1, y: 0, layer: "top" },
            { x: 1.5, y: 0, layer: "top" },
          ],
        },
      ],
      bounds: { minX: -2, maxX: 2, minY: -7, maxY: 2 },
    },
    OBSTACLE_MARGIN: 0.15,
    marginsWithCosts: [{ margin: 0.15, enterCost: 0, travelCostFactor: 1 }],
    debug: true,
  })
  // Keep the reproduction on one copper layer so vias cannot bypass the bug.
  autorouter.allowLayerChange = false

  const solution = autorouter.solveAndMapToTraces()
  expect(solution).toHaveLength(1)
  expect(solution[0].route).toHaveLength(5)
  expect(solution[0].route[2].y).toBeCloseTo(1.45)

  const inputCircuitJson: AnyCircuitElement[] = obstacles.map(
    (obstacle, i) => ({
      type: "pcb_smtpad",
      pcb_smtpad_id: `obstacle_${i}`,
      pcb_component_id: "obstacles",
      shape: "rect",
      x: obstacle.center.x,
      y: obstacle.center.y,
      width: obstacle.width,
      height: obstacle.height,
      layer: "top",
    }),
  )
  expect(
    getDebugSvg({
      inputCircuitJson,
      autorouter,
      solution,
      rowHeight: 10,
      colWidth: 8,
      colCount: 5,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
