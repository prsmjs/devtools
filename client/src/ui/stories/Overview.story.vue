<script setup>
import PastelBg from "../components/PastelBg.vue"
import Display from "../components/Display.vue"
import SectionLabel from "../components/SectionLabel.vue"
import Button from "../components/Button.vue"
import Card from "../components/Card.vue"
import Stat from "../components/Stat.vue"
import Badge from "../components/Badge.vue"
import Divider from "../components/Divider.vue"
import Kbd from "../components/Kbd.vue"
import ArrowLink from "../components/ArrowLink.vue"

const stats = [
  { label: "Active cases", value: "16", caption: "across 5 properties" },
  { label: "Needs review", value: "6", caption: "attorney or property manager action required" },
  { label: "Outstanding rent", value: "$54,155", caption: "across 16 open cases" },
  { label: "Eval confidence", value: "96%", caption: "workflow-wide pass rate · 42 cases" },
]

const jurisdictions = [
  { city: "Denver, CO", sub: "Denver County · rules v3", status: "active", signed: "Theodora Whitfield, Esq." },
  { city: "Phoenix, AZ", sub: "Maricopa County · rules v7", status: "active", signed: "Marisol Reyna, Esq." },
  { city: "Boulder, CO", sub: "Boulder County · rules v0-draft", status: "draft", signed: "unsigned" },
]

const models = [
  { label: "Drafting", value: "claude-sonnet-4-6" },
  { label: "Extraction", value: "claude-haiku-4-5" },
  { label: "Judging", value: "claude-opus-4-7" },
]
</script>

<template>
  <Story title="Overview" :layout="{ type: 'single', iframe: true }">
    <Variant title="Dashboard">
      <div class="dash">
        <!-- hero -->
        <PastelBg class="dash__hero">
          <div class="dash__hero-inner">
            <SectionLabel>Thursday, April 30</SectionLabel>
            <Display size="lg" style="margin-top: 12px;">Good morning, Jonathan.</Display>
            <p class="dash__hero-sub">
              <a class="dash__link">4 cases are waiting on attorney sign-off</a>,
              <a class="dash__link">1 property is blocked on a missing lease</a>,
              and <a class="dash__link">3 cases have a court date</a> in the next two weeks.
              The Denver evaluation finished overnight at <a class="dash__link">93% passing</a>.
            </p>
            <div class="dash__hero-actions">
              <Button variant="primary" size="lg">Open today's queue</Button>
              <Button variant="ghost" size="lg">Add a jurisdiction</Button>
            </div>
          </div>
        </PastelBg>

        <!-- stat row -->
        <section class="dash__stats">
          <Card v-for="s in stats" :key="s.label" padded elevated>
            <Stat :label="s.label" :value="s.value" :caption="s.caption" size="lg" />
          </Card>
        </section>

        <!-- two-up -->
        <section class="dash__grid">
          <Card padded>
            <div class="dash__card-head">
              <SectionLabel>Jurisdictions</SectionLabel>
              <ArrowLink mono>All</ArrowLink>
            </div>
            <ul class="dash__jur-list">
              <li v-for="j in jurisdictions" :key="j.city" class="dash__jur">
                <div class="dash__jur-name">{{ j.city }}</div>
                <div class="dash__jur-badge">
                  <Badge :variant="j.status" dot>{{ j.status }}</Badge>
                </div>
                <div class="pc-mono dash__jur-sub">{{ j.sub }}</div>
                <div class="pc-mono dash__jur-signed">{{ j.signed }}</div>
              </li>
              <li>
                <button class="dash__add">
                  <span>+</span>
                  <span>Add a new jurisdiction</span>
                </button>
              </li>
            </ul>
          </Card>

          <Card padded>
            <div class="dash__card-head">
              <SectionLabel>Latest evaluation run</SectionLabel>
              <ArrowLink mono>History</ArrowLink>
            </div>
            <div class="pc-mono dash__eval-id">EVAL_RUN_2026_04_29</div>
            <div class="dash__eval-headline">39/42 passing</div>
            <div class="dash__eval-meta">Trigger: nightly · Golden set: denver-golden-v2</div>
            <div class="dash__eval-meta">9 steps now running autonomously</div>
            <Divider style="margin: 16px 0;" />
            <div class="dash__models">
              <div v-for="m in models" :key="m.label" class="dash__model">
                <div class="dash__model-label">{{ m.label }}</div>
                <Kbd>{{ m.value }}</Kbd>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 32px; padding-bottom: 64px; background: var(--paper); }

.dash__hero { padding: 72px 64px 56px; border-bottom: 1px solid var(--ink-08); }
.dash__hero-inner { max-width: 920px; }
.dash__hero-sub {
  font-size: 20px;
  color: var(--ink);
  max-width: 720px;
  margin-top: 18px;
  letter-spacing: -0.22px;
  line-height: 1.45;
}
.dash__link {
  color: var(--ink);
  border-bottom: 1px solid var(--ink-20);
  cursor: pointer;
  transition: border-color 120ms ease;
}
.dash__link:hover { border-bottom-color: var(--ink); }
.dash__hero-actions { display: flex; gap: 8px; margin-top: 24px; }

.dash__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 64px;
}

.dash__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 0 64px;
  align-items: start;
}

.dash__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.dash__jur-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
/* 2x2: name + badge on the top row, detail + signer on the bottom row */
.dash__jur {
  display: grid;
  grid-template-columns: 1fr auto;
  column-gap: 16px;
  row-gap: 4px;
  align-items: center;
  padding: 12px 8px;
  border-radius: var(--radius-sharp);
  transition: background 120ms ease;
  cursor: pointer;
}
.dash__jur:hover { background: var(--ink-04); }
.dash__jur-name {
  grid-column: 1;
  grid-row: 1;
  font-size: 16px;
  letter-spacing: -0.2px;
}
.dash__jur-badge {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
}
.dash__jur-sub {
  grid-column: 1;
  grid-row: 2;
  font-size: 11px;
  color: var(--ink-60);
}
.dash__jur-signed {
  grid-column: 2;
  grid-row: 2;
  justify-self: end;
  font-size: 11px;
  color: var(--ink-60);
}

.dash__add {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-top: 6px;
  border: 1px dashed var(--ink-08);
  border-radius: var(--radius-sharp);
  color: var(--ink-60);
  font-family: var(--display);
  font-size: 14px;
  letter-spacing: -0.14px;
  transition: color 120ms ease, border-color 120ms ease;
}
.dash__add:hover { color: var(--ink); border-color: var(--ink-20); }

.dash__eval-id { font-size: 11px; color: var(--ink-60); }
.dash__eval-headline {
  font-family: var(--display);
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.56px;
  margin: 4px 0 8px;
}
.dash__eval-meta { font-size: 14px; color: var(--ink-60); line-height: 1.5; }

.dash__models { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.dash__model { display: flex; flex-direction: column; gap: 6px; }
.dash__model-label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
}
</style>
