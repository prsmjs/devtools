<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '../../api.js'
import { Panel, PanelSection, Badge, Button, Table, SearchInput, Pagination, Select, Drawer, Modal, Input, KeyValue, Tooltip, ToggleButton, toast } from 'pastel-vue'

const props = defineProps({
  roles: { type: Object, default: () => ({}) },
  statuses: { type: Object, default: () => ({}) },
  mechanisms: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['mutated'])

const search = ref('')
const page = ref(1)
const pageSize = ref(25)
const accounts = ref([])
const total = ref(0)
const accountsLoaded = ref(false)

const selected = ref(null)
const detail = ref(null)
const detailLoading = ref(false)
const drawerOpen = ref(false)
const pending = ref(null) // label of the action currently in flight, or null
const busy = computed(() => pending.value !== null)

const newStatus = ref(null)
const pwModal = ref(false)
const newPassword = ref('')
const deleteModal = ref(false)
const tfaModal = ref(false)
const tfaToRemove = ref(null)

const accountColumns = [
  { key: 'id', label: 'ID', mono: true, width: '64px' },
  { key: 'email', label: 'Email', primary: true },
  { key: 'statusLabel', label: 'Status' },
  { key: 'roleLabel', label: 'Roles' },
  { key: 'twoFactorLabel', label: '2FA' },
  { key: 'verifiedLabel', label: 'Verified' },
  { key: 'registeredLabel', label: 'Registered' },
]

function statusName(code) {
  const entry = Object.entries(props.statuses).find(([, v]) => v === code)
  return entry ? entry[0] : `status ${code}`
}
function statusVariant(code) {
  const name = statusName(code)
  if (name === 'Normal') return 'active'
  if (name === 'Banned') return 'failed'
  if (name === 'Locked' || name === 'Suspended') return 'warning'
  return 'default'
}
function mechanismName(code) {
  const entry = Object.entries(props.mechanisms).find(([, v]) => v === code)
  return entry ? entry[0] : `mechanism ${code}`
}
function roleNames(rolemask) {
  return Object.entries(props.roles)
    .filter(([, bit]) => (rolemask & bit) === bit && bit !== 0)
    .map(([name]) => name)
}
function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

const accountRows = computed(() =>
  accounts.value.map((a) => ({
    ...a,
    statusLabel: statusName(a.status),
    roleLabel: roleNames(a.rolemask).join(', ') || '—',
    twoFactorLabel: (a.twoFactor || []).map(mechanismName).join(', ') || '—',
    verifiedLabel: a.verified ? 'yes' : 'no',
    registeredLabel: fmtDate(a.registered),
  }))
)

async function loadAccounts() {
  try {
    const params = new URLSearchParams({
      limit: String(pageSize.value),
      offset: String((page.value - 1) * pageSize.value),
    })
    if (search.value.trim()) params.set('search', search.value.trim())
    const res = await fetch(api(`/auth/accounts?${params.toString()}`))
    if (res.ok) {
      const data = await res.json()
      accounts.value = data.accounts
      total.value = data.total
    }
  } catch {} finally {
    accountsLoaded.value = true
  }
}

loadAccounts()

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadAccounts()
  }, 250)
})
watch([page, pageSize], loadAccounts)

async function openAccount(row) {
  selected.value = row
  drawerOpen.value = true
  detail.value = null
  detailLoading.value = true
  newStatus.value = null
  try {
    const res = await fetch(api(`/auth/accounts/${row.id}`))
    if (res.ok) {
      detail.value = await res.json()
      newStatus.value = detail.value.account.status
    } else {
      toast.error('Could not load account', { description: (await res.json().catch(() => ({}))).error })
    }
  } catch (err) {
    toast.error('Could not load account', { description: err.message })
  } finally {
    detailLoading.value = false
  }
}

const statusOptions = computed(() =>
  Object.entries(props.statuses).map(([label, value]) => ({ value, label }))
)

async function refreshAfterMutation() {
  await loadAccounts()
  emit('mutated')
  if (selected.value) {
    const res = await fetch(api(`/auth/accounts/${selected.value.id}`))
    if (res.ok) {
      detail.value = await res.json()
      newStatus.value = detail.value.account.status
    }
  }
}

async function action(label, fn) {
  pending.value = label
  try {
    const res = await fn()
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(`${label} failed`, { description: data.error })
      return false
    }
    toast.success(`${label} done`)
    await refreshAfterMutation()
    return true
  } catch (err) {
    toast.error(`${label} failed`, { description: err.message })
    return false
  } finally {
    pending.value = null
  }
}

function applyStatus() {
  if (newStatus.value === null || Number(newStatus.value) === detail.value?.account.status) return
  action('Status change', () =>
    fetch(api(`/auth/accounts/${selected.value.id}/status`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: Number(newStatus.value) }),
    })
  )
}

function toggleRole(bit) {
  const has = (detail.value.account.rolemask & bit) === bit
  action(has ? 'Remove role' : 'Add role', () =>
    fetch(api(`/auth/accounts/${selected.value.id}/roles`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: bit, op: has ? 'remove' : 'add' }),
    })
  )
}

function forceLogout() {
  action('Force logout', () =>
    fetch(api(`/auth/accounts/${selected.value.id}/force-logout`), { method: 'POST' })
  )
}

async function changePassword() {
  if (!newPassword.value) return
  const ok = await action('Password change', () =>
    fetch(api(`/auth/accounts/${selected.value.id}/password`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword.value }),
    })
  )
  if (ok) {
    pwModal.value = false
    newPassword.value = ''
  }
}

async function deleteAccount() {
  const ok = await action('Delete', () =>
    fetch(api(`/auth/accounts/${selected.value.id}`), { method: 'DELETE' })
  )
  if (ok) {
    deleteModal.value = false
    drawerOpen.value = false
    selected.value = null
  }
}

function promptRemoveTwoFactor(method) {
  tfaToRemove.value = method
  tfaModal.value = true
}

async function removeTwoFactor() {
  const ok = await action('Remove 2FA method', () =>
    fetch(api(`/auth/accounts/${selected.value.id}/two-factor/${tfaToRemove.value.id}`), { method: 'DELETE' })
  )
  if (ok) {
    tfaModal.value = false
    tfaToRemove.value = null
  }
}

const detailItems = computed(() => {
  if (!detail.value) return []
  const a = detail.value.account
  return [
    { label: 'Account ID', value: String(a.id) },
    { label: 'User ID', value: a.user_id, hint: "Your application's own user identifier, not the auth account ID. Set when the account was created (or an auto-generated UUID), and how auth links to your user records." },
    { label: 'Status', value: statusName(a.status) },
    { label: 'Verified', value: a.verified ? 'yes' : 'no' },
    { label: 'Has password', value: a.hasPassword ? 'yes' : 'no' },
    { label: 'Force-logout counter', value: String(a.force_logout) },
    { label: 'Resettable', value: a.resettable ? 'yes' : 'no' },
    { label: 'Last login', value: fmtDate(a.last_login) },
    { label: 'Registered', value: fmtDate(a.registered) },
  ]
})
</script>

<template>
  <div>
    <Panel>
      <template #header>
        <h3 class="title">Accounts</h3>
      </template>
      <template #aside>
        <SearchInput v-model="search" placeholder="Search by email" size="sm" />
      </template>
      <PanelSection flush>
        <Table
          :columns="accountColumns"
          :rows="accountRows"
          row-key="id"
          clickable
          :empty="accountsLoaded ? 'No accounts' : 'Loading…'"
          @row-click="openAccount"
        >
          <template #cell-statusLabel="{ row }">
            <Badge :variant="statusVariant(row.status)" size="sm">{{ row.statusLabel }}</Badge>
          </template>
          <template #cell-verifiedLabel="{ row }">
            <Badge :variant="row.verified ? 'active' : 'default'" size="sm">{{ row.verifiedLabel }}</Badge>
          </template>
        </Table>
      </PanelSection>
      <PanelSection>
        <Pagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </PanelSection>
    </Panel>

    <Drawer v-model="drawerOpen" size="lg" :eyebrow="selected ? `Account #${selected.id}` : ''" :title="selected?.email || ''">
      <div v-if="detailLoading" class="muted">Loading…</div>
      <div v-else-if="detail" class="detail">
        <KeyValue :items="detailItems" layout="divided" boxed>
          <template #label="{ item }">
            <Tooltip v-if="item.hint" placement="left">
              <template #content><span class="kv-hint__text">{{ item.hint }}</span></template>
              <span class="kv-hint">{{ item.label }}</span>
            </Tooltip>
            <template v-else>{{ item.label }}</template>
          </template>
        </KeyValue>

        <section class="block">
          <h4 class="block__title">Roles</h4>
          <div class="chips">
            <ToggleButton
              v-for="(bit, name) in roles"
              :key="name"
              :model-value="(detail.account.rolemask & bit) === bit"
              :disabled="busy"
              size="sm"
              @update:model-value="toggleRole(bit)"
            >{{ name }}</ToggleButton>
          </div>
          <p class="hint">Toggle a role to grant or revoke it.</p>
        </section>

        <section class="block">
          <h4 class="block__title">Status</h4>
          <div class="row">
            <Select v-model="newStatus" :options="statusOptions" size="sm" />
            <Button size="sm" :loading="pending === 'Status change'" :disabled="busy || Number(newStatus) === detail.account.status" @click="applyStatus">Apply</Button>
          </div>
        </section>

        <section class="block">
          <h4 class="block__title">OAuth providers</h4>
          <div v-if="detail.providers.length" class="provider-list">
            <div v-for="p in detail.providers" :key="p.id" class="provider">
              <Badge variant="dark" size="sm">{{ p.provider }}</Badge>
              <code class="provider__id">{{ p.provider_email || p.provider_username || p.provider_id }}</code>
            </div>
          </div>
          <p v-else class="muted">No linked providers.</p>
        </section>

        <section class="block">
          <h4 class="block__title">Two-factor methods</h4>
          <div v-if="detail.twoFactor.length" class="tfa-list">
            <div v-for="m in detail.twoFactor" :key="m.id" class="tfa">
              <Badge :variant="m.verified ? 'active' : 'draft'" size="sm">{{ mechanismName(m.mechanism) }}</Badge>
              <span class="tfa__meta">
                {{ m.verified ? 'verified' : 'unverified' }}
                <template v-if="m.backupCodeCount"> · {{ m.backupCodeCount }} backup codes remaining</template>
              </span>
              <Button class="tfa__remove" size="sm" variant="subtle" :disabled="busy" @click="promptRemoveTwoFactor(m)">Remove</Button>
            </div>
          </div>
          <p v-else class="muted">No two-factor methods.</p>
        </section>

        <section class="block">
          <h4 class="block__title">Danger zone</h4>
          <div class="danger">
            <Button size="sm" variant="subtle" :loading="pending === 'Force logout'" :disabled="busy" @click="forceLogout">Force logout</Button>
            <Button size="sm" variant="subtle" @click="pwModal = true">Change password</Button>
            <Button size="sm" variant="danger" @click="deleteModal = true">Delete account</Button>
          </div>
        </section>
      </div>
    </Drawer>

    <Modal v-model="pwModal" title="Change password" size="sm">
      <p class="modal-text">Set a new password for <strong>{{ selected?.email }}</strong>. This does not notify the user.</p>
      <Input v-model="newPassword" type="password" placeholder="New password" />
      <template #footer="{ close }">
        <Button variant="ghost" @click="close">Cancel</Button>
        <Button variant="primary" :loading="pending === 'Password change'" :disabled="busy || !newPassword" @click="changePassword">Change password</Button>
      </template>
    </Modal>

    <Modal v-model="deleteModal" title="Delete account" size="sm">
      <p class="modal-text">
        Permanently delete <strong>{{ selected?.email }}</strong> and all associated data (providers, 2FA methods, tokens, activity)? This cannot be undone.
      </p>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close">Cancel</Button>
        <Button variant="danger" :loading="pending === 'Delete'" @click="deleteAccount">Delete account</Button>
      </template>
    </Modal>

    <Modal v-model="tfaModal" title="Remove two-factor method" size="sm">
      <p class="modal-text">
        Remove the <strong>{{ tfaToRemove ? mechanismName(tfaToRemove.mechanism) : "" }}</strong> method from <strong>{{ selected?.email }}</strong>? Use this to rescue a user who lost their device - they will no longer be prompted for it at login.
      </p>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close">Cancel</Button>
        <Button variant="danger" :loading="pending === 'Remove 2FA method'" @click="removeTwoFactor">Remove method</Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.title {
  margin: 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.detail { display: flex; flex-direction: column; gap: 22px; }
.block { display: flex; flex-direction: column; gap: 10px; }
.block__title {
  margin: 0;
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  color: var(--ink-40);
}
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.row { display: flex; align-items: center; gap: 8px; }

.kv-hint {
  border-bottom: 1px dotted var(--ink-30, var(--ink-20));
  cursor: help;
}
.kv-hint__text {
  display: block;
  max-width: 260px;
  white-space: normal;
  line-height: 1.45;
}

.provider-list, .tfa-list { display: flex; flex-direction: column; gap: 8px; }
.provider, .tfa { display: flex; align-items: center; gap: 10px; }
.provider__id { font-family: var(--mono); font-size: 12.5px; color: var(--ink-60); }
.tfa__meta { font-size: 12.5px; color: var(--ink-60); }
.tfa__remove { margin-left: auto; }

.danger { display: flex; flex-wrap: wrap; gap: 8px; }

.modal-text { margin: 0 0 14px; font-size: 13px; color: var(--ink-70); line-height: 1.5; }
.muted { font-size: 13px; color: var(--ink-60); margin: 0; padding: 16px 0; }
.hint { margin: 0; font-size: 11.5px; color: var(--ink-40); }
</style>
