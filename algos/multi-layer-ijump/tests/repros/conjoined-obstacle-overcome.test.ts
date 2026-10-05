import { expect, test } from "bun:test"
import { getDistanceToOvercomeObstacle } from "algos/infinite-grid-ijump-astar/v2/lib/getDistanceToOvercomeObstacle"
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
  const obstacles = new ObstacleList3d(
    2,
    [firstObstacle, secondObstacle] as any,
  )

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
