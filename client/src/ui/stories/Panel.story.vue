<script setup>
import { ref } from "vue"
import Panel from "../components/Panel.vue"
import PanelSection from "../components/PanelSection.vue"
import KeyValue from "../components/KeyValue.vue"
import Select from "../components/Select.vue"
import Stat from "../components/Stat.vue"
import Badge from "../components/Badge.vue"
import SectionLabel from "../components/SectionLabel.vue"
import Input from "../components/Input.vue"
import Field from "../components/Field.vue"
import Button from "../components/Button.vue"
import Divider from "../components/Divider.vue"
import Kbd from "../components/Kbd.vue"
import Avatar from "../components/Avatar.vue"

const boundModel = ref("sonnet")
const modelOptions = [
  { value: "sonnet", label: "claude-sonnet-4-6 · recommended · Balanced" },
  { value: "haiku", label: "claude-haiku-4-5 · fast · Economical" },
  { value: "opus", label: "claude-opus-4-7 · highest quality" },
]

const city = ref("Boulder")
const state = ref("CO")
const presets = [
  { code: "CO", city: "Boulder" },
  { code: "TX", city: "Austin" },
  { code: "TN", city: "Nashville" },
  { code: "OR", city: "Portland" },
  { code: "NC", city: "Charlotte" },
]

const steps = [
  { name: "draft_demand", wf: "WF_DENVER_RESIDENTIAL" },
  { name: "draft_complaint", wf: "WF_DENVER_RESIDENTIAL" },
]

const reviewItems = [
  { tag: "Document", label: "Drafted demand (JDF 101)", path: "WORKFLOW.STEPS.DRAFT_DEMAND.OUTPUT.DEMANDPDFURL" },
  { tag: "Fields", label: "Mapped fields preview", path: "WORKFLOW.STEPS.DRAFT_DEMAND.OUTPUT.MAPPEDFIELDS" },
  { tag: "Rule", label: "Cited rule", path: "RULES.NOTICE" },
  { tag: "Amount", label: "Amount breakdown", path: "CASE.ARREARSCENTS + LEASE.LATEFEECENTS × 2" },
]

const intakeRows = [
  { label: "Intake workflow", value: "Denver Monthly Delinquency Intake · v2", link: true },
  { label: "Spawns", value: "Denver Residential FED · v3", link: true },
  { label: "Schedule", value: "5th of each month, 07:00 MT" },
  { label: "Last run", value: "Apr 12, 2026, 3:14 AM", link: true },
  { label: "Runs to date", value: "3" },
]
</script>

<template>
  <Story title="Panel">
    <!-- ---- Reproduction of the model summary card ---- -->
    <Variant title="Model summary card">
      <Panel gradient style="max-width: 460px;">
        <template #header>
          <h3 class="pc-panel__title" style="font-size: 24px; font-weight: 500; letter-spacing: -0.4px; margin: 0;">
            Legal document drafting
          </h3>
          <p style="margin: 6px 0 0; color: var(--ink-60); font-size: 15px; line-height: 1.45;">
            Generates the demand, complaint, summons, and verification PDFs by mapping case
            data into the form schema. Monetary values are computed in code; the model fills typed slots.
          </p>
        </template>

        <PanelSection label="Where it runs">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div v-for="s in steps" :key="s.name" style="display: flex; align-items: center; gap: 10px;">
              <Badge>Step</Badge>
              <span style="font-family: var(--mono); font-size: 13px;">{{ s.name }}</span>
              <span style="color: var(--ink-40);">·</span>
              <span style="font-family: var(--mono); font-size: 12px; color: var(--ink-40); letter-spacing: 0.04em;">{{ s.wf }}</span>
            </div>
          </div>
        </PanelSection>

        <PanelSection label="Bound model">
          <Select v-model="boundModel" :options="modelOptions" style="width: 100%;" />
          <div style="margin-top: 10px;">
            <KeyValue
              layout="divided"
              boxed
              :items="[
                { label: 'Provider', value: 'Anthropic · Balanced' },
                { label: 'Pricing', value: '$3.00 / 1M in · $15.00 / 1M out' },
                { label: 'Context', value: '1M tokens' },
                { label: 'Released', value: 'Feb 25, 2026' },
              ]"
            />
          </div>
        </PanelSection>

        <PanelSection>
          <div style="display: flex; gap: 56px;">
            <Stat label="Monthly calls" value="1,840" size="md" />
            <Stat label="Monthly cost" value="$142.30" size="md" />
          </div>
        </PanelSection>
      </Panel>
    </Variant>

    <!-- ---- Reproduction of the jurisdiction wizard step ---- -->
    <Variant title="Wizard step">
      <Panel style="max-width: 860px;">
        <template #header>
          <SectionLabel size="md">Jurisdiction</SectionLabel>
        </template>
        <template #aside>
          <Badge>Step 1 of 4</Badge>
        </template>

        <PanelSection gradient>
          <div style="display: flex; gap: 12px; align-items: flex-end;">
            <Field label="City" style="flex: 1;">
              <Input v-model="city" size="lg" />
            </Field>
            <Field label="State" style="width: 110px;">
              <Input v-model="state" size="lg" />
            </Field>
            <Button variant="primary" size="lg">Begin ingestion →</Button>
          </div>

          <Divider dashed style="margin: 20px 0;" />

          <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
            <SectionLabel>Try one</SectionLabel>
            <button
              v-for="p in presets"
              :key="p.code"
              type="button"
              :class="['pc-preset', { 'pc-preset--active': p.city === city }]"
            >
              <Avatar shape="square" tone="dark" size="sm">{{ p.code }}</Avatar>
              <span>{{ p.city }}</span>
            </button>
          </div>
        </PanelSection>

        <PanelSection tone="muted">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap;">
            <div style="display: flex; gap: 36px;">
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <SectionLabel>Drafting</SectionLabel>
                <Kbd>claude-sonnet-4-6</Kbd>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <SectionLabel>Extraction</SectionLabel>
                <Kbd>claude-haiku-4-5</Kbd>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <SectionLabel>Judge</SectionLabel>
                <Kbd>claude-opus-4-7</Kbd>
              </div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 14px; color: var(--ink-60);">Swappable in</span>
              <span class="pc-mono" style="font-size: 11px; color: var(--ink-60); letter-spacing: 0.06em;">
                Configuration → Models ↗
              </span>
            </div>
          </div>
        </PanelSection>
      </Panel>
    </Variant>

    <!-- ---- Plain panel ---- -->
    <Variant title="Plain (no header gradient)">
      <Panel title="Workflow settings" description="Control how this workflow behaves at runtime." style="max-width: 520px;">
        <PanelSection label="General">
          <KeyValue :items="[
            { label: 'Version', value: 'v2.1' },
            { label: 'Status', value: 'Active' },
            { label: 'Owner', value: 'Theodora Whitfield' },
          ]" />
        </PanelSection>
        <PanelSection label="Limits" tone="muted">
          <KeyValue layout="divided" :items="[
            { label: 'Max retries', value: '3' },
            { label: 'Timeout', value: '120s' },
          ]" />
        </PanelSection>
      </Panel>
    </Variant>

    <!-- ---- Reproduction of the attorney review / sign-off panel ---- -->
    <Variant title="Review / sign-off panel">
      <Panel accent="lavender" gradient elevated style="max-width: 900px;">
        <template #header>
          <div class="rev-tagline">
            <Badge variant="solid" size="md">Action required · Attorney of record</Badge>
            <span class="rev-tagline__who">Theodora Whitfield, Esq. (CO-48217)</span>
          </div>
          <h2 class="rev-title">Attorney review (demand)</h2>
          <p class="rev-desc">
            Hard sign-off step. The attorney sees the rendered demand alongside the case data,
            the rule citation, and the amount-computation breakdown. They can approve, reject
            with a reason, or send back for revision.
          </p>
        </template>

        <PanelSection label="What you're reviewing">
          <div class="rev-rows">
            <div v-for="r in reviewItems" :key="r.tag" class="rev-row">
              <Badge>{{ r.tag }}</Badge>
              <span class="rev-row__label">{{ r.label }}</span>
              <span class="rev-row__path">{{ r.path }}</span>
            </div>
          </div>
        </PanelSection>

        <PanelSection>
          <div class="rev-actions">
            <Button variant="primary">Approve and sign</Button>
            <Button variant="danger" hint="+ Notes">Send back for revision</Button>
            <Button variant="danger" hint="+ Reason">Reject - do not file</Button>
          </div>
        </PanelSection>
      </Panel>
    </Variant>

    <!-- ---- Reproduction of the intake summary panel ---- -->
    <Variant title="Intake summary panel">
      <Panel gradient style="max-width: 720px;">
        <template #header>
          <SectionLabel size="md">Denver County</SectionLabel>
          <h2 class="intake-title">Denver, CO</h2>
        </template>
        <template #aside>
          <Badge variant="active">Active</Badge>
        </template>

        <PanelSection>
          <KeyValue layout="divided" :dividers="false" compact :items="intakeRows">
            <template #value="{ item }">
              <a v-if="item.link" class="intake-link">{{ item.value }}</a>
              <span v-else>{{ item.value }}</span>
            </template>
          </KeyValue>

          <Divider dashed style="margin: 18px 0;" />

          <div class="intake-actions">
            <Button variant="ghost">Filter runs</Button>
            <Button variant="primary">Run intake now</Button>
          </div>
        </PanelSection>
      </Panel>
    </Variant>
  </Story>
</template>

<style scoped>
.pc-preset {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background: var(--paper);
  font-family: var(--display);
  font-size: 15px;
  letter-spacing: -0.15px;
  color: var(--ink);
  cursor: pointer;
  outline: none;
  transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 60ms ease;
}
.pc-preset:hover { border-color: var(--ink-20); background: var(--ink-04); }
.pc-preset:focus-visible { box-shadow: var(--focus-ring); border-color: var(--midnight); }
.pc-preset:active { transform: translateY(1.5px); }
.pc-preset--active { border-color: var(--midnight); }

/* review / sign-off panel */
.rev-tagline { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.rev-tagline__who {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--ink-40);
}
.rev-title {
  margin: 14px 0 0;
  font-family: var(--display);
  font-size: 34px;
  font-weight: 500;
  letter-spacing: -0.7px;
  line-height: 1.1;
  color: var(--ink);
}
.rev-desc {
  margin: 10px 0 0;
  font-size: 17px;
  line-height: 1.5;
  letter-spacing: -0.18px;
  color: var(--ink);
  max-width: 760px;
}
.rev-rows { display: flex; flex-direction: column; gap: 10px; }
.rev-row { display: flex; align-items: baseline; gap: 12px; }
.rev-row__label { font-size: 16px; font-weight: 500; letter-spacing: -0.2px; }
.rev-row__path {
  font-family: var(--mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ink-40);
}
.rev-actions { display: flex; gap: 12px; flex-wrap: wrap; }

/* intake summary panel */
.intake-title {
  margin: 6px 0 0;
  font-family: var(--display);
  font-size: 30px;
  font-weight: 500;
  letter-spacing: -0.6px;
  line-height: 1.1;
  color: var(--ink);
}
.intake-link {
  color: var(--ink);
  border-bottom: 1px solid var(--ink-20);
  padding-bottom: 1px;
  cursor: pointer;
  transition: border-color 120ms ease;
}
.intake-link:hover { border-bottom-color: var(--ink); }
.intake-actions { display: flex; gap: 10px; }
</style>
