// Recognizable line icons for the nav stories, rendered via SideNav's #icon slot.
// Paths are Lucide-style (24x24 viewBox, stroked).
import { h } from "vue"

const path = (d) => h("path", { d })
const rect = (attrs) => h("rect", attrs)
const line = (attrs) => h("line", attrs)
const poly = (points) => h("polyline", { points })
const polygon = (points) => h("polygon", { points })

const sets = {
  home: () => [
    path("m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"),
    poly("9 22 9 12 15 12 15 22"),
  ],
  inbox: () => [
    path("M22 12h-6l-2 3h-4l-2-3H2"),
    path("M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"),
  ],
  overview: () => [
    rect({ width: 7, height: 9, x: 3, y: 3, rx: 1 }),
    rect({ width: 7, height: 5, x: 14, y: 3, rx: 1 }),
    rect({ width: 7, height: 9, x: 14, y: 12, rx: 1 }),
    rect({ width: 7, height: 5, x: 3, y: 16, rx: 1 }),
  ],
  intakes: () => [
    path("M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"),
    poly("10 17 15 12 10 7"),
    line({ x1: 15, x2: 3, y1: 12, y2: 12 }),
  ],
  cases: () => [
    rect({ width: 20, height: 14, x: 2, y: 7, rx: 2 }),
    path("M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"),
  ],
  jurisdictions: () => [
    line({ x1: 3, x2: 21, y1: 22, y2: 22 }),
    line({ x1: 6, x2: 6, y1: 18, y2: 11 }),
    line({ x1: 10, x2: 10, y1: 18, y2: 11 }),
    line({ x1: 14, x2: 14, y1: 18, y2: 11 }),
    line({ x1: 18, x2: 18, y1: 18, y2: 11 }),
    polygon("12 2 20 7 4 7"),
  ],
  workflows: () => [
    rect({ width: 8, height: 8, x: 3, y: 3, rx: 2 }),
    path("M7 11v4a2 2 0 0 0 2 2h4"),
    rect({ width: 8, height: 8, x: 13, y: 13, rx: 2 }),
  ],
  forms: () => [
    path("M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"),
    path("M14 2v4a2 2 0 0 0 2 2h4"),
    path("M16 13H8"),
    path("M16 17H8"),
    path("M10 9H8"),
  ],
  evaluations: () => [
    rect({ width: 8, height: 4, x: 8, y: 2, rx: 1 }),
    path("M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"),
    path("m9 14 2 2 4-4"),
  ],
}

export const NavIcon = (props) => h("svg", {
  width: props.size || 18,
  height: props.size || 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 1.8,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
}, (sets[props.name] || (() => []))())

NavIcon.props = ["name", "size"]
